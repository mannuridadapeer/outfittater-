// ---------------------------------------------------------------
// Outfit Rater - Backend server
//   GET  /      -> "I'm alive" check
//   POST /rate  -> takes a photo, asks Gemini to rate the outfit,
//                  returns clean structured JSON (not a paragraph)
// ---------------------------------------------------------------

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import crypto from "node:crypto";
import admin from "firebase-admin";

// Load the secret API key from the .env file
dotenv.config();

// Firebase Admin - only starts if a service account is provided. The Lemon
// Squeezy webhook uses this to set a user's plan to "pro" after they pay.
let firestore = null;
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    firestore = admin.firestore();
    console.log("Firebase Admin ready.");
  } catch (e) {
    console.error("Firebase Admin init failed:", e.message);
  }
} else {
  console.log("FIREBASE_SERVICE_ACCOUNT not set - plan updates are disabled.");
}

const app = express();
app.set("trust proxy", 1); // behind Render's proxy - needed to read the real client IP

// Only allow our own frontend (any *.vercel.app deploy) and local dev to call us
const corsOptions = {
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // non-browser tools / same-origin
    const ok =
      /\.vercel\.app$/.test(origin) ||
      /^https:\/\/(www\.)?slayrate\.com$/.test(origin) ||
      /^http:\/\/localhost(:\d+)?$/.test(origin);
    cb(null, ok);
  },
};
app.use(cors(corsOptions));
// Parse JSON for everything EXCEPT the webhook, which needs the raw body to
// verify Lemon Squeezy's signature.
app.use((req, res, next) => {
  if (req.originalUrl.startsWith("/webhook")) return next();
  express.json({ limit: "10mb" })(req, res, next);
});

// Basic in-memory rate limit: cap how many ratings one IP can do per hour,
// so nobody can spam the app and burn through the free Gemini quota.
const RATE_LIMIT = 60;
const RATE_WINDOW_MS = 60 * 60 * 1000;
const rateWindows = new Map();
function rateLimit(req, res, next) {
  const ip = req.ip || "unknown";
  const now = Date.now();
  const entry = rateWindows.get(ip);
  if (!entry || now - entry.windowStart > RATE_WINDOW_MS) {
    rateWindows.set(ip, { count: 1, windowStart: now });
    return next();
  }
  if (entry.count >= RATE_LIMIT) {
    return res.status(429).json({
      error: "You've rated a lot in a short time! Please wait a bit and try again.",
    });
  }
  entry.count++;
  next();
}

// Connect to Gemini using your secret key
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Remember each photo's rating so the SAME photo always returns the SAME result.
// Keyed by a hash of the image data. (In-memory: clears if the server restarts.)
const ratingCache = new Map();

// This describes the EXACT shape we want Gemini to answer in.
// Because we hand this to Gemini's JSON mode, it is forced to return
// data in this structure - no stray asterisks or messy paragraphs.
const responseSchema = {
  type: Type.OBJECT,
  properties: {
    overallScore: {
      type: Type.INTEGER,
      description: "Overall outfit score as a whole number from 0 to 10",
    },
    items: {
      type: Type.ARRAY,
      description: "One entry for each clothing category",
      items: {
        type: Type.OBJECT,
        properties: {
          name: {
            type: Type.STRING,
            description: "One of: Top, Bottom, Shoes, Accessories",
          },
          score: {
            type: Type.INTEGER,
            description: "Whole-number score from 0 to 10 (use 0 if this item is not visible)",
          },
          critique: {
            type: Type.STRING,
            description: "One short line of feedback for this item",
          },
        },
        required: ["name", "score", "critique"],
      },
    },
    tips: {
      type: Type.ARRAY,
      description: "2 to 3 short, specific tips to improve the outfit",
      items: { type: Type.STRING },
    },
  },
  required: ["overallScore", "items", "tips"],
};

// Gemini's free servers are sometimes "busy" (error 503) or rate-limited (429).
// These are temporary. This helper just tries again a few times before giving up.
async function generateWithRetry(params, maxAttempts = 4) {
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await ai.models.generateContent(params);
    } catch (err) {
      lastError = err;
      const busy = err.status === 503 || err.status === 429;
      if (busy && attempt < maxAttempts) {
        const waitMs = attempt * 1500; // wait a bit longer each time
        console.log(`Gemini busy (status ${err.status}). Retry ${attempt}/${maxAttempts} in ${waitMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        continue;
      }
      throw err; // not a "busy" error, or we ran out of attempts
    }
  }
  throw lastError;
}

// --- Health check ---
app.get("/", (req, res) => {
  res.send("Backend is running!");
});

// --- Gumroad ping: mark a user Pro after they buy or renew the membership ---
// Gumroad POSTs form-encoded data on every sale and recurring charge.
app.post("/webhook/gumroad", express.urlencoded({ extended: true }), async (req, res) => {
  const secret = process.env.GUMROAD_PING_SECRET;
  // We protect this URL with a secret query param: /webhook/gumroad?secret=...
  if (!secret || req.query.secret !== secret) {
    return res.status(401).send("Invalid secret");
  }

  const body = req.body || {};
  const email = body.email;
  const offerCode = body.offer_code || ""; // the influencer's discount code, if used
  const refunded =
    body.refunded === "true" || body.disputed === "true" || body.chargeback === "true";

  // We pass the Firebase user id through the checkout URL (?user_id=...)
  let userId = body.url_params && body.url_params.user_id;

  // Fallback: if no user_id came through, match the buyer by email
  if (!userId && email && firestore) {
    try {
      const u = await admin.auth().getUserByEmail(email);
      userId = u.uid;
    } catch {
      /* no matching account */
    }
  }

  if (firestore && userId) {
    try {
      const update = { plan: refunded ? "free" : "pro" };
      if (!refunded) update.lastChargeAt = Date.now(); // used to tell who's still active
      if (offerCode) update.referralCode = offerCode; // remember which influencer code
      await firestore.doc(`users/${userId}/meta/profile`).set(update, { merge: true });
      console.log(
        `Gumroad: ${userId} -> ${update.plan}${offerCode ? " (code " + offerCode + ")" : ""}`
      );
    } catch (e) {
      console.error("Failed to update plan:", e.message);
    }
  }

  res.status(200).send("ok"); // always 200 so Gumroad doesn't keep retrying
});

// --- Main route: rate an outfit ---
app.post("/rate", rateLimit, async (req, res) => {
  try {
    const { image, occasion, persona } = req.body;
    if (!image) {
      return res.status(400).json({ error: "No image was sent." });
    }

    // Only allow known occasions; default to a neutral everyday look
    const allowedOccasions = ["Casual", "Work", "Date", "Party", "Gym", "Formal"];
    const safeOccasion = allowedOccasions.includes(occasion) ? occasion : "Casual";

    // Judge persona controls the TONE of the feedback (not the scores)
    const personaTone = {
      "Honest": "Use a friendly, balanced, constructive tone.",
      "Hype Bestie":
        "Use a warm, very encouraging hype-friend tone, full of excitement and genuine compliments, while staying truthful.",
      "Brutally Honest":
        "Use a blunt, savage, no-sugarcoating tone - harsh but fair. Never be cruel about the person's body, only about the clothing choices.",
      "Runway Critic":
        "Use the sophisticated, discerning tone of a high-fashion runway critic, with elevated fashion vocabulary.",
    };
    const safePersona = personaTone[persona] ? persona : "Honest";

    // Split "data:image/jpeg;base64,XXXX" into the type and the data
    const rawMime = image.substring(image.indexOf(":") + 1, image.indexOf(";"));
    const base64Data = image.split(",")[1];

    // Gemini only accepts certain image types. If an upload arrives with an
    // unknown type, fall back to JPEG (the frontend sends JPEG anyway).
    const allowedTypes = ["image/png", "image/jpeg", "image/webp", "image/heic", "image/heif"];
    const mimeType = allowedTypes.includes(rawMime) ? rawMime : "image/jpeg";

    // Same photo + same occasion -> same result. Cache key includes the occasion
    // so the same photo can score differently for, say, "Gym" vs "Date".
    const hash = crypto
      .createHash("sha256")
      .update(safeOccasion + "|" + safePersona + "|" + base64Data)
      .digest("hex");
    if (ratingCache.has(hash)) {
      return res.json(ratingCache.get(hash));
    }

    const prompt =
      `You are a strict, consistent fashion judge. Rate the outfit in the photo for this occasion: ${safeOccasion}. ` +
      `Judge how appropriate, well-suited, and stylish the outfit is specifically for a ${safeOccasion} setting ` +
      "(for example, judge gym wear as gym wear and formal wear as formal wear), and let that strongly shape the scores and tips. " +
      "Apply this EXACT scoring rubric every single time, so the same outfit always " +
      "receives nearly the same score:\n" +
      "9-10 = exceptional: cohesive, well-fitted, stylish, clearly intentional.\n" +
      "7-8 = good: works well, only minor issues.\n" +
      "5-6 = average: wearable but unremarkable, or some clashing.\n" +
      "3-4 = poor: ill-fitting, clashing colours, or sloppy.\n" +
      "1-2 = very poor.\n" +
      "Give an overall score out of 10 that reflects the average overall impression " +
      "(not just the best single item). Then rate each clothing category separately on " +
      "the same 0-10 scale: Top, Bottom, Shoes, Accessories. For each, give the score and " +
      "a single short line of critique. If a category is not visible in the photo, give it " +
      "a score of 0 and say it is not visible. Judge only the clothing - ignore the photo's " +
      "lighting, background, and image quality. Finally give 2 to 3 short, specific tips to " +
      "level up the outfit. Use whole numbers only for every score (no decimals). " +
      `Tone for your critiques and tips: ${personaTone[safePersona]} ` +
      "Keep the scores based strictly on the rubric regardless of tone - only your wording changes. " +
      "Do not use any markdown, asterisks, or bullet characters.";

    const response = await generateWithRetry({
      model: "gemini-2.5-flash",
      contents: [
        { text: prompt },
        { inlineData: { mimeType: mimeType, data: base64Data } },
      ],
      // Turn on JSON mode and hand Gemini the schema above.
      // temperature 0 + a fixed seed = as deterministic as possible, so the
      // same photo gets the same score on repeat ratings.
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0,
        seed: 42,
      },
    });

    // Gemini returns the JSON as a string; turn it into a real object
    const data = JSON.parse(response.text);

    // Remember this result so the same photo returns the same score next time
    ratingCache.set(hash, data);
    if (ratingCache.size > 500) {
      ratingCache.delete(ratingCache.keys().next().value);
    }

    res.json(data);
  } catch (err) {
    console.error(err);
    if (err.status === 503 || err.status === 429) {
      return res.status(503).json({
        error: "Gemini is very busy right now. Please wait a moment and try again.",
      });
    }
    res.status(500).json({ error: "Something went wrong. Check the backend window." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});

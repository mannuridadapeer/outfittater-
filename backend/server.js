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

// Load the secret API key from the .env file
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Connect to Gemini using your secret key
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// This describes the EXACT shape we want Gemini to answer in.
// Because we hand this to Gemini's JSON mode, it is forced to return
// data in this structure - no stray asterisks or messy paragraphs.
const responseSchema = {
  type: Type.OBJECT,
  properties: {
    overallScore: {
      type: Type.NUMBER,
      description: "Overall outfit score from 0 to 10",
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
            type: Type.NUMBER,
            description: "Score from 0 to 10 (use 0 if this item is not visible)",
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

// --- Main route: rate an outfit ---
app.post("/rate", async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ error: "No image was sent." });
    }

    // Split "data:image/jpeg;base64,XXXX" into the type and the data
    const rawMime = image.substring(image.indexOf(":") + 1, image.indexOf(";"));
    const base64Data = image.split(",")[1];

    // Gemini only accepts certain image types. If an upload arrives with an
    // unknown type, fall back to JPEG (the frontend sends JPEG anyway).
    const allowedTypes = ["image/png", "image/jpeg", "image/webp", "image/heic", "image/heif"];
    const mimeType = allowedTypes.includes(rawMime) ? rawMime : "image/jpeg";

    const prompt =
      "You are a strict, consistent fashion judge. Rate the outfit in the photo. " +
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
      "level up the outfit. Do not use any markdown, asterisks, or bullet characters.";

    const response = await generateWithRetry({
      model: "gemini-2.5-flash",
      contents: [
        { text: prompt },
        { inlineData: { mimeType: mimeType, data: base64Data } },
      ],
      // Turn on JSON mode and hand Gemini the schema above.
      // Low temperature = more deterministic = more consistent scores.
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.2,
      },
    });

    // Gemini returns the JSON as a string; turn it into a real object
    const data = JSON.parse(response.text);
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

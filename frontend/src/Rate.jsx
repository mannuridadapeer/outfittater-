import { useState, useEffect, useRef } from "react";
import {
  collection,
  addDoc,
  query,
  orderBy,
  getDocs,
  serverTimestamp,
  doc,
  getDoc,
  setDoc,
} from "firebase/firestore";
import { auth, db } from "./firebase";
import ResultCard from "./ResultCard";

const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL ||
  `http://${window.location.hostname}:3000`;

const OCCASIONS = ["Casual", "Work", "Date", "Party", "Gym", "Formal"];

const PERSONAS = [
  { key: "Honest", label: "🙂 Honest" },
  { key: "Hype Bestie", label: "💖 Hype Bestie" },
  { key: "Brutally Honest", label: "🔪 Brutal" },
  { key: "Runway Critic", label: "🎩 Critic" },
];

// How many ratings a free user gets per day
const FREE_DAILY_LIMIT = 3;

function todayKey() {
  const d = new Date();
  return (
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0")
  );
}

function computeStreak(dateKeys) {
  const days = new Set(dateKeys);
  if (days.size === 0) return 0;

  const keyOf = (d) =>
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0");

  let streak = 0;
  const cursor = new Date();

  if (!days.has(keyOf(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!days.has(keyOf(cursor))) return 0;
  }

  while (days.has(keyOf(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

// Resize + re-encode as a clean JPEG (fixes unknown image types, shrinks size)
function resizeToJpeg(dataUrl, maxSize, quality) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let width = img.width;
      let height = img.height;
      if (width > height && width > maxSize) {
        height = Math.round((height * maxSize) / width);
        width = maxSize;
      } else if (height >= width && height > maxSize) {
        width = Math.round((width * maxSize) / height);
        height = maxSize;
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () =>
      reject(new Error("Could not read that image file. Try a different photo."));
    img.src = dataUrl;
  });
}

function Rate({ user, onUpgrade }) {
  const [image, setImage] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("Analyzing your fit…");
  const [streak, setStreak] = useState(0);
  const [todayRating, setTodayRating] = useState(null);
  const [occasion, setOccasion] = useState("Casual");
  const [persona, setPersona] = useState("Honest");
  const [plan, setPlan] = useState("free");
  const [usedToday, setUsedToday] = useState(0);

  // Tracks which occasions we've already saved for the CURRENT photo,
  // so switching occasions doesn't create duplicate history entries.
  const savedOccasions = useRef(new Set());

  useEffect(() => {
    loadStreak();
    loadProfile();
  }, []);

  async function loadProfile() {
    // Plan is decided by the backend (it asks Paddle — the source of truth),
    // so it can't be faked and reflects cancellations.
    try {
      const u = auth.currentUser;
      if (u) {
        const token = await u.getIdToken();
        const r = await fetch(BACKEND_URL + "/plan", {
          headers: { Authorization: "Bearer " + token },
        });
        const d = await r.json();
        setPlan(d.plan === "pro" ? "pro" : "free");
      }
    } catch (e) {
      console.log("Could not load plan:", e);
    }
    // Free-tier daily usage count stays in Firestore
    try {
      const ref = doc(db, "users", user.uid, "meta", "profile");
      const snap = await getDoc(ref);
      const data = snap.exists() ? snap.data() : {};
      setUsedToday(data.usageDate === todayKey() ? data.usageCount || 0 : 0);
    } catch (e) {
      console.log("Could not load usage:", e);
    }
  }

  async function loadStreak() {
    try {
      const q = query(
        collection(db, "users", user.uid, "ratings"),
        orderBy("createdAt", "desc")
      );
      const snap = await getDocs(q);
      const dateKeys = [];
      let today = null;
      snap.forEach((docSnap) => {
        const d = docSnap.data();
        if (d.dateKey) dateKeys.push(d.dateKey);
        if (d.dateKey === todayKey() && !today) today = d;
      });
      setStreak(computeStreak(dateKeys));
      setTodayRating(today);
    } catch (e) {
      console.log("Could not load streak:", e);
    }
  }

  // Clear everything and go back to a fresh upload
  function reset() {
    setImage(null);
    setResult(null);
    setError("");
    savedOccasions.current = new Set();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleFileChange(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImage(reader.result);
      setResult(null);
      setError("");
      savedOccasions.current = new Set(); // new photo -> fresh
    };
    reader.readAsDataURL(file);
  }

  // Rate the current photo for a given occasion. Saves to history once
  // per occasion (so switching back and forth doesn't pile up duplicates).
  async function rateFor(forOccasion) {
    if (!image || loading) return;

    const isNew = !savedOccasions.current.has(forOccasion);
    // Free users get a limited number of new ratings per day
    if (isNew && plan !== "pro" && usedToday >= FREE_DAILY_LIMIT) {
      if (onUpgrade) onUpgrade();
      return;
    }

    setOccasion(forOccasion);
    setLoading(true);
    setResult(null);
    setError("");
    setLoadingMsg("Analyzing your fit…");

    const coldStartTimer = setTimeout(() => {
      setLoadingMsg("Waking up the stylist… this can take a moment the first time ☕");
    }, 6000);

    try {
      const imageForApi = await resizeToJpeg(image, 1024, 0.85);

      const response = await fetch(BACKEND_URL + "/rate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageForApi, occasion: forOccasion, persona }),
      });
      const data = await response.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      setResult(data);

      // Save to history only the first time we rate this photo for this occasion
      if (!savedOccasions.current.has(forOccasion)) {
        savedOccasions.current.add(forOccasion);
        const thumbnail = await resizeToJpeg(image, 300, 0.7);
        await addDoc(collection(db, "users", user.uid, "ratings"), {
          overallScore: data.overallScore,
          items: data.items,
          tips: data.tips,
          thumbnail: thumbnail,
          occasion: forOccasion,
          persona: persona,
          dateKey: todayKey(),
          createdAt: serverTimestamp(),
        });
        await loadStreak();

        // Count this rating toward today's free usage
        const newCount = usedToday + 1;
        setUsedToday(newCount);
        try {
          await setDoc(
            doc(db, "users", user.uid, "meta", "profile"),
            { usageDate: todayKey(), usageCount: newCount },
            { merge: true }
          );
        } catch (e) {
          console.log("Could not save usage:", e);
        }
      }
    } catch (err) {
      setError("Could not reach the backend. Please try again in a moment.");
    } finally {
      clearTimeout(coldStartTimer);
      setLoading(false);
    }
  }

  function handleRate() {
    if (!image) {
      alert("Please upload a photo first.");
      return;
    }
    rateFor(occasion);
  }

  const occasionPill = (o, onClick) => (
    <button
      key={o}
      onClick={onClick}
      className={
        "px-4 py-2 rounded-full text-sm font-semibold transition " +
        (occasion === o
          ? "btn-gold"
          : "bg-[#f8f1e6] text-[#9b8a68] hover:text-[#a9823a]")
      }
    >
      {o}
    </button>
  );

  return (
    <div>
      <div className="flex flex-wrap gap-2.5 mb-5">
        <div className="px-4 py-2 rounded-full text-sm font-semibold bg-[#f8f1e6] text-[#a9823a]">
          🔥 {streak} day streak
        </div>
        {todayRating && (
          <div className="px-4 py-2 rounded-full text-sm font-semibold bg-[#f4ead9] text-[#a9823a]">
            ⭐ Outfit of the Day: {todayRating.overallScore}/10
          </div>
        )}
      </div>

      {plan === "pro" ? (
        <div className="mb-4 px-4 py-2.5 rounded-2xl text-sm font-semibold bg-[#f4ead9] text-[#a9823a] text-center">
          ✨ Pro · unlimited ratings
        </div>
      ) : (
        <div className="mb-4 flex items-center justify-between bg-[#f8f1e6] rounded-2xl px-4 py-2.5">
          <span className="text-sm text-[#9b8a68]">
            {Math.max(0, FREE_DAILY_LIMIT - usedToday)} free ratings left today
          </span>
          <button
            onClick={onUpgrade}
            className="text-sm font-semibold text-[#a9823a] hover:underline"
          >
            ✨ Upgrade
          </button>
        </div>
      )}

      {/* CASE A: choosing occasion + uploading (before any result) */}
      {!result && !loading && (
        <>
          <p className="text-sm font-semibold text-[#3d3220] mb-2">
            Choose your judge
          </p>
          <div className="flex flex-wrap gap-2 mb-4">
            {PERSONAS.map((p) => (
              <button
                key={p.key}
                onClick={() => setPersona(p.key)}
                className={
                  "px-4 py-2 rounded-full text-sm font-semibold transition " +
                  (persona === p.key
                    ? "btn-gold"
                    : "bg-[#f8f1e6] text-[#9b8a68] hover:text-[#a9823a]")
                }
              >
                {p.label}
              </button>
            ))}
          </div>

          <p className="text-sm font-semibold text-[#3d3220] mb-2">
            What's the occasion?
          </p>
          <div className="flex flex-wrap gap-2 mb-4">
            {OCCASIONS.map((o) => occasionPill(o, () => setOccasion(o)))}
          </div>

          <label className="block cursor-pointer rounded-[32px] border-2 border-dashed border-[#dcc9a0] glass-soft p-4 mb-4 text-center transition hover:border-[#caa24e]">
            <input type="file" accept="image/*" onChange={handleFileChange} hidden />
            {image ? (
              <>
                <img
                  src={image}
                  alt="your outfit"
                  className="w-full max-h-[360px] object-contain rounded-3xl"
                />
                <p className="text-xs text-[#9b8a68] mt-3">Tap to change photo</p>
              </>
            ) : (
              <div className="text-[#9b8a68] font-medium py-12">
                <div className="text-4xl mb-2">📷</div>
                Tap to choose a photo
              </div>
            )}
          </label>

          <button
            onClick={handleRate}
            className="btn-gold w-full py-4 rounded-2xl font-semibold text-base"
          >
            Rate My Outfit
          </button>

          {error && (
            <p className="mt-3 text-sm text-[#a8506a] bg-[#f3dbe2] rounded-xl px-3 py-2.5">
              {error}
            </p>
          )}
        </>
      )}

      {/* CASE B: loading (keep the photo visible for context) */}
      {loading && (
        <div className="fade-in">
          {image && (
            <div className="glass-card rounded-[32px] p-4 mb-4">
              <img
                src={image}
                alt="your outfit"
                className="w-full max-h-[300px] object-contain rounded-3xl"
              />
            </div>
          )}
          <div className="glass-card rounded-[28px] p-6 flex flex-col items-center gap-3">
            <div className="spinner"></div>
            <p className="pulse text-[#3d3220] font-medium text-center">
              {loadingMsg}
            </p>
          </div>
        </div>
      )}

      {/* CASE C: result, with an occasion switcher to re-rate the same photo */}
      {result && !loading && (
        <div className="fade-in">
          {image && (
            <div className="glass-card rounded-[32px] p-4 mb-4">
              <img
                src={image}
                alt="your outfit"
                className="w-full max-h-[360px] object-contain rounded-3xl"
              />
            </div>
          )}

          <p className="text-sm font-semibold text-[#3d3220] mb-2">
            Rate this fit for another occasion:
          </p>
          <div className="flex flex-wrap gap-2 mb-1">
            {OCCASIONS.map((o) => occasionPill(o, () => rateFor(o)))}
          </div>

          <ResultCard
            result={result}
            imageDataUrl={image}
            occasion={occasion}
            persona={persona}
          />

          <button
            onClick={reset}
            className="btn-soft w-full py-3.5 rounded-2xl font-semibold mt-4"
          >
            Rate another outfit
          </button>
        </div>
      )}
    </div>
  );
}

export default Rate;

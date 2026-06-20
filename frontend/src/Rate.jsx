import { useState, useEffect } from "react";
import {
  collection,
  addDoc,
  query,
  orderBy,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import ResultCard from "./ResultCard";

const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL ||
  `http://${window.location.hostname}:3000`;

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

function Rate({ user }) {
  const [image, setImage] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [streak, setStreak] = useState(0);
  const [todayRating, setTodayRating] = useState(null);

  useEffect(() => {
    loadStreak();
  }, []);

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

  function handleFileChange(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImage(reader.result);
      setResult(null);
      setError("");
    };
    reader.readAsDataURL(file);
  }

  async function handleRate() {
    if (!image) {
      alert("Please upload a photo first.");
      return;
    }

    setLoading(true);
    setResult(null);
    setError("");

    try {
      const imageForApi = await resizeToJpeg(image, 1024, 0.85);

      const response = await fetch(BACKEND_URL + "/rate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageForApi }),
      });
      const data = await response.json();

      if (data.error) {
        setError(data.error);
        setLoading(false);
        return;
      }

      setResult(data);

      const thumbnail = await resizeToJpeg(image, 300, 0.7);
      await addDoc(collection(db, "users", user.uid, "ratings"), {
        overallScore: data.overallScore,
        items: data.items,
        tips: data.tips,
        thumbnail: thumbnail,
        dateKey: todayKey(),
        createdAt: serverTimestamp(),
      });

      await loadStreak();
    } catch (err) {
      setError("Could not reach the backend. Is it running?");
    }

    setLoading(false);
  }

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

      <label className="block cursor-pointer rounded-[32px] border-2 border-dashed border-[#dcc9a0] glass-soft p-4 mb-4 text-center transition hover:border-[#caa24e]">
        <input type="file" accept="image/*" onChange={handleFileChange} hidden />
        {image ? (
          <img
            src={image}
            alt="your outfit"
            className="w-full max-h-[360px] object-contain rounded-3xl"
          />
        ) : (
          <div className="text-[#9b8a68] font-medium py-12">
            📷 Tap to choose a photo
          </div>
        )}
      </label>

      <button
        onClick={handleRate}
        disabled={loading}
        className="w-full py-4 rounded-2xl font-semibold text-white text-base bg-gradient-to-r from-[#caa24e] to-[#a9823a] shadow-[0_14px_28px_-10px_rgba(169,130,58,0.8)] disabled:opacity-60"
      >
        {loading ? "Rating..." : "Rate My Outfit"}
      </button>

      {error && (
        <p className="mt-3 text-sm text-[#a8506a] bg-[#f3dbe2] rounded-xl px-3 py-2.5">
          {error}
        </p>
      )}

      {result && <ResultCard result={result} imageDataUrl={image} />}
    </div>
  );
}

export default Rate;

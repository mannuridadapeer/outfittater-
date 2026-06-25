import { useState, useEffect } from "react";
import {
  collection,
  query,
  orderBy,
  getDocs,
  deleteDoc,
  updateDoc,
  doc,
} from "firebase/firestore";
import { db } from "./firebase";
import ResultCard from "./ResultCard";
import { shareResult } from "./share";

function formatDate(r) {
  return r.createdAt && r.createdAt.toDate
    ? r.createdAt.toDate().toLocaleString()
    : r.dateKey;
}

function History({ user, onRate }) {
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState("all"); // all | fav | <occasion>
  const [sortBy, setSortBy] = useState("recent"); // recent | top

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const q = query(
        collection(db, "users", user.uid, "ratings"),
        orderBy("createdAt", "desc")
      );
      const snap = await getDocs(q);
      const list = [];
      snap.forEach((docSnap) => list.push({ id: docSnap.id, ...docSnap.data() }));
      setRatings(list);
    } catch (e) {
      console.log("Could not load history:", e);
    }
    setLoading(false);
  }

  async function toggleFavorite(r) {
    const newVal = !r.favorite;
    setRatings((prev) =>
      prev.map((x) => (x.id === r.id ? { ...x, favorite: newVal } : x))
    );
    try {
      await updateDoc(doc(db, "users", user.uid, "ratings", r.id), {
        favorite: newVal,
      });
    } catch (e) {
      console.log("Could not update favorite:", e);
    }
  }

  async function remove(r) {
    if (!window.confirm("Delete this rating? This can't be undone.")) return;
    setRatings((prev) => prev.filter((x) => x.id !== r.id));
    if (selected && selected.id === r.id) setSelected(null);
    try {
      await deleteDoc(doc(db, "users", user.uid, "ratings", r.id));
    } catch (e) {
      console.log("Could not delete:", e);
    }
  }

  // ---- Detail view ----
  if (selected) {
    return (
      <div className="fade-in">
        <button
          onClick={() => setSelected(null)}
          className="btn-soft mb-4 text-sm font-semibold rounded-full px-4 py-2"
        >
          ← Back to history
        </button>

        {selected.thumbnail && (
          <div className="glass-card rounded-[32px] p-4 mb-2">
            <img
              src={selected.thumbnail}
              alt="your outfit"
              className="w-full max-h-[360px] object-contain rounded-3xl"
            />
            <p className="text-center text-sm text-[#9b8a68] mt-3">
              {formatDate(selected)}
            </p>
          </div>
        )}

        <ResultCard
          result={selected}
          imageDataUrl={selected.thumbnail}
          occasion={selected.occasion}
          persona={selected.persona}
        />
      </div>
    );
  }

  // ---- Loading ----
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 pt-16">
        <div className="spinner"></div>
        <p className="text-[#9b8a68] text-sm pulse">Loading your history…</p>
      </div>
    );
  }

  // ---- Empty ----
  if (ratings.length === 0) {
    return (
      <div className="fade-in glass-card rounded-[32px] p-8 text-center mt-2">
        <div className="text-5xl mb-3 float">👗</div>
        <h2 className="text-xl font-bold text-[#3d3220]">No fits rated yet</h2>
        <p className="text-sm text-[#9b8a68] mt-2 mb-6">
          Upload your first outfit and let the AI score your look!
        </p>
        <button onClick={onRate} className="btn-gold px-6 py-3 rounded-2xl font-semibold">
          Rate your first outfit
        </button>
      </div>
    );
  }

  // ---- List ----
  const occasions = [...new Set(ratings.map((r) => r.occasion).filter(Boolean))];

  let shown = ratings;
  if (filter === "fav") shown = shown.filter((r) => r.favorite);
  else if (filter !== "all") shown = shown.filter((r) => r.occasion === filter);
  if (sortBy === "top")
    shown = [...shown].sort((a, b) => (b.overallScore || 0) - (a.overallScore || 0));

  const chip = (key, label) => (
    <button
      key={key}
      onClick={() => setFilter(key)}
      className={
        "px-3 py-1.5 rounded-full text-xs font-semibold transition " +
        (filter === key ? "btn-gold" : "bg-[#f8f1e6] text-[#9b8a68]")
      }
    >
      {label}
    </button>
  );

  const sortChip = (key, label) => (
    <button
      onClick={() => setSortBy(key)}
      className={
        "px-3 py-1.5 rounded-full text-xs font-semibold transition " +
        (sortBy === key ? "btn-gold" : "bg-[#f8f1e6] text-[#9b8a68]")
      }
    >
      {label}
    </button>
  );

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-[#3d3220] mb-4">My History</h1>

      <div className="flex flex-wrap gap-2 mb-2">
        {chip("all", "All")}
        {chip("fav", "⭐ Favorites")}
        {occasions.map((o) => chip(o, o))}
      </div>
      <div className="flex gap-2 mb-4">
        <span className="text-xs text-[#9b8a68] self-center mr-1">Sort:</span>
        {sortChip("recent", "Recent")}
        {sortChip("top", "Top score")}
      </div>

      {shown.length === 0 ? (
        <p className="text-center text-[#9b8a68] pt-6">Nothing matches that filter.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {shown.map((r) => (
            <div
              key={r.id}
              className="fade-in glass-card flex items-center gap-3 rounded-[24px] p-4"
            >
              <div
                onClick={() => setSelected(r)}
                className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
              >
                {r.thumbnail && (
                  <img
                    src={r.thumbnail}
                    alt="outfit thumbnail"
                    className="w-[64px] h-[64px] object-cover rounded-2xl shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-2xl font-extrabold text-[#a9823a]">
                    {r.overallScore}/10
                  </div>
                  <div className="text-xs text-[#9b8a68]">{formatDate(r)}</div>
                  {r.occasion && (
                    <div className="text-xs font-semibold text-[#a9823a]">
                      For {r.occasion}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => toggleFavorite(r)}
                  aria-label="Favorite"
                  className={
                    "w-9 h-9 rounded-full flex items-center justify-center text-base transition " +
                    (r.favorite ? "bg-[#f4ead9]" : "bg-[#f8f1e6] hover:bg-[#ece0c8]")
                  }
                >
                  {r.favorite ? "⭐" : "☆"}
                </button>
                <button
                  onClick={() =>
                    shareResult({ result: r, imageDataUrl: r.thumbnail })
                  }
                  aria-label="Share"
                  className="w-9 h-9 rounded-full bg-[#f8f1e6] hover:bg-[#ece0c8] flex items-center justify-center text-sm transition"
                >
                  📤
                </button>
                <button
                  onClick={() => remove(r)}
                  aria-label="Delete"
                  className="w-9 h-9 rounded-full bg-[#f8f1e6] hover:bg-[#ece0c8] flex items-center justify-center text-sm transition"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default History;

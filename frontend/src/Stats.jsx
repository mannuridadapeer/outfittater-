import { useState, useEffect } from "react";
import { collection, query, orderBy, getDocs } from "firebase/firestore";
import { db } from "./firebase";
import ResultCard from "./ResultCard";

function formatDate(r) {
  return r.createdAt && r.createdAt.toDate
    ? r.createdAt.toDate().toLocaleString()
    : r.dateKey;
}

function Stats({ user }) {
  const [ratings, setRatings] = useState(null);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
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
        console.log("Could not load stats:", e);
        setRatings([]);
      }
    }
    load();
  }, []);

  if (ratings === null) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 pt-16">
        <div className="spinner"></div>
        <p className="text-[#9b8a68] text-sm pulse">Crunching your stats…</p>
      </div>
    );
  }

  if (ratings.length === 0) {
    return (
      <div className="fade-in glass-card rounded-[32px] p-8 text-center mt-2">
        <div className="text-5xl mb-3 float">📊</div>
        <h2 className="text-xl font-bold text-[#3d3220]">No stats yet</h2>
        <p className="text-sm text-[#9b8a68] mt-2">
          Rate a few outfits and your style stats will appear here.
        </p>
      </div>
    );
  }

  // ---- Best fit detail view ----
  if (selected) {
    return (
      <div className="fade-in">
        <button
          onClick={() => setSelected(null)}
          className="btn-soft mb-4 text-sm font-semibold rounded-full px-4 py-2"
        >
          ← Back to stats
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

  const total = ratings.length;
  const avg = (
    ratings.reduce((s, r) => s + (r.overallScore || 0), 0) / total
  ).toFixed(1);
  const best = ratings.reduce(
    (b, r) => ((r.overallScore || 0) > (b.overallScore || 0) ? r : b),
    ratings[0]
  );

  const counts = {};
  ratings.forEach((r) => {
    if (r.occasion) counts[r.occasion] = (counts[r.occasion] || 0) + 1;
  });
  const favOccasion =
    Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0] || "—";

  const metric = (label, value) => (
    <div className="bg-[#f8f1e6] rounded-[20px] p-4 text-center">
      <div className="text-3xl font-extrabold text-[#a9823a]">{value}</div>
      <div className="text-xs text-[#9b8a68] mt-1">{label}</div>
    </div>
  );

  return (
    <div className="fade-in">
      <h1 className="text-2xl font-extrabold text-[#3d3220] mb-4">Your Style Stats</h1>

      <div className="grid grid-cols-3 gap-3 mb-4">
        {metric("Fits rated", total)}
        {metric("Average", avg)}
        {metric("Best", `${best.overallScore}/10`)}
      </div>

      <button
        onClick={() => setSelected(best)}
        className="glass-card rounded-[28px] p-5 mb-4 w-full text-left transition hover:shadow-[0_24px_48px_-20px_rgba(150,120,70,0.5)]"
      >
        <p className="text-[11px] uppercase tracking-wide text-[#9b8a68] mb-3">
          Your best fit · tap to view
        </p>
        <div className="flex items-center gap-4">
          {best.thumbnail && (
            <img
              src={best.thumbnail}
              alt="best outfit"
              className="w-[80px] h-[80px] object-cover rounded-2xl shrink-0"
            />
          )}
          <div>
            <div className="text-3xl font-extrabold text-[#a9823a]">
              {best.overallScore}/10
            </div>
            {best.occasion && (
              <div className="text-sm text-[#9b8a68]">For {best.occasion}</div>
            )}
          </div>
        </div>
      </button>

      <div className="glass-card rounded-[28px] p-5 flex items-center justify-between">
        <span className="text-sm text-[#9b8a68]">Favourite occasion</span>
        <span className="px-4 py-1.5 rounded-full text-sm font-bold bg-[#f4ead9] text-[#a9823a]">
          {favOccasion}
        </span>
      </div>
    </div>
  );
}

export default Stats;

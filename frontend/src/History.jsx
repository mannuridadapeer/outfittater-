import { useState, useEffect } from "react";
import { collection, query, orderBy, getDocs } from "firebase/firestore";
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
  const [selected, setSelected] = useState(null); // a tapped rating, or null

  useEffect(() => {
    async function load() {
      try {
        const q = query(
          collection(db, "users", user.uid, "ratings"),
          orderBy("createdAt", "desc")
        );
        const snap = await getDocs(q);
        const list = [];
        snap.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() });
        });
        setRatings(list);
      } catch (e) {
        console.log("Could not load history:", e);
      }
      setLoading(false);
    }
    load();
  }, []);

  // ---- Detail view: reopen a full saved result ----
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

        <ResultCard result={selected} imageDataUrl={selected.thumbnail} />
      </div>
    );
  }

  // ---- Loading state ----
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 pt-16">
        <div className="spinner"></div>
        <p className="text-[#9b8a68] text-sm pulse">Loading your history…</p>
      </div>
    );
  }

  // ---- Empty state ----
  if (ratings.length === 0) {
    return (
      <div className="fade-in glass-card rounded-[32px] p-8 text-center mt-2">
        <div className="text-5xl mb-3">👗</div>
        <h2 className="text-xl font-bold text-[#3d3220]">No fits rated yet</h2>
        <p className="text-sm text-[#9b8a68] mt-2 mb-6">
          Upload your first outfit and let the AI score your look!
        </p>
        <button
          onClick={onRate}
          className="btn-gold px-6 py-3 rounded-2xl font-semibold"
        >
          Rate your first outfit
        </button>
      </div>
    );
  }

  // ---- List view ----
  return (
    <div>
      <h1 className="text-2xl font-extrabold text-[#3d3220] mb-4">My History</h1>
      <div className="flex flex-col gap-4">
        {ratings.map((r) => (
          <div
            key={r.id}
            onClick={() => setSelected(r)}
            className="fade-in glass-card flex items-center gap-4 rounded-[24px] p-4 cursor-pointer transition hover:shadow-[0_24px_48px_-20px_rgba(150,120,70,0.5)]"
          >
            {r.thumbnail && (
              <img
                src={r.thumbnail}
                alt="outfit thumbnail"
                className="w-[70px] h-[70px] object-cover rounded-2xl shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="text-2xl font-extrabold text-[#a9823a]">
                {r.overallScore}/10
              </div>
              <div className="text-sm text-[#9b8a68]">{formatDate(r)}</div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                shareResult({ result: r, imageDataUrl: r.thumbnail });
              }}
              className="btn-soft shrink-0 text-sm font-semibold rounded-full px-4 py-2"
            >
              Share
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default History;

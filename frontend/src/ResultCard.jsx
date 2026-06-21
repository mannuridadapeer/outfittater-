import { useRef, useEffect } from "react";
import confetti from "canvas-confetti";
import { shareResult } from "./share";

// A short friendly verdict shown next to the score ring
export function verdict(score) {
  if (score >= 9) return "Absolutely stunning ✨";
  if (score >= 7) return "Looking great!";
  if (score >= 5) return "Solid fit 👍";
  if (score >= 1) return "Room to glow";
  return "Let's see the look!";
}

// Pick an emoji for each clothing category
export function itemEmoji(name) {
  const n = (name || "").toLowerCase();
  if (n.includes("top")) return "👕";
  if (n.includes("bottom")) return "👖";
  if (n.includes("shoe")) return "👟";
  if (n.includes("access")) return "👜";
  return "🧥";
}

// The reusable score card: gold ring + verdict, breakdown pills, tips,
// and a Share button. Used both for a fresh rating and a reopened history item.
// `imageDataUrl` is only used as a fallback if the card snapshot fails.
function ResultCard({ result, imageDataUrl, occasion, persona }) {
  const cardRef = useRef(null);

  // Celebrate a great score with a gold confetti burst 🎉
  useEffect(() => {
    if (result.overallScore >= 8) {
      const burst = (ratio, opts) =>
        confetti({
          particleCount: Math.floor(180 * ratio),
          origin: { y: 0.65 },
          colors: ["#caa24e", "#a9823a", "#e8c987", "#f3dbe2", "#fffdf9"],
          ...opts,
        });
      burst(0.3, { spread: 40, startVelocity: 45 });
      burst(0.4, { spread: 80 });
      burst(0.3, { spread: 110, decay: 0.92, scalar: 1.1 });
    }
  }, []);

  return (
    <div className="fade-in mt-5">
      <div ref={cardRef} className="glass-card rounded-[32px] p-6">
        {(occasion || persona) && (
          <div className="flex flex-wrap gap-2 mb-4">
            {occasion && (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#f4ead9] text-[#a9823a]">
                For {occasion}
              </span>
            )}
            {persona && (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#f8f1e6] text-[#9b8a68]">
                {persona}
              </span>
            )}
          </div>
        )}
        {result.overallScore >= 8 && (
          <div className="mb-4 text-center text-sm font-semibold text-[#a9823a] bg-[#f4ead9] rounded-2xl py-2">
            🎉 Stunning — this fit's a keeper!
          </div>
        )}
        <div className="flex items-center gap-5">
          <div
            className="shrink-0 w-[120px] h-[120px] rounded-full flex items-center justify-center"
            style={{
              background: `conic-gradient(#caa24e ${
                result.overallScore * 10
              }%, #ece0c8 0)`,
            }}
          >
            <div className="w-[96px] h-[96px] rounded-full bg-[#fffdf9] flex flex-col items-center justify-center">
              <span className="text-4xl font-extrabold text-[#3d3220] leading-none">
                {result.overallScore}
              </span>
              <span className="text-xs text-[#9b8a68]">/ 10</span>
            </div>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-[#9b8a68]">
              Overall
            </p>
            <p className="text-xl font-bold text-[#3d3220] mt-1">
              {verdict(result.overallScore)}
            </p>
          </div>
        </div>

        <h3 className="text-base font-bold text-[#3d3220] mt-7 mb-3">Breakdown</h3>
        <div className="flex flex-col gap-3">
          {result.items.map((item, i) => {
            const low = item.score < 5;
            return (
              <div
                key={i}
                className="flex items-center gap-3 bg-[#f8f1e6] rounded-[20px] p-3.5"
              >
                <span className="text-2xl">{itemEmoji(item.name)}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[#3d3220]">{item.name}</div>
                  <div className="text-sm text-[#9b8a68]">{item.critique}</div>
                </div>
                <span
                  className={
                    "shrink-0 px-3 py-1 rounded-full text-sm font-bold " +
                    (low
                      ? "bg-[#f3dbe2] text-[#a8506a]"
                      : "bg-[#ece0c8] text-[#a9823a]")
                  }
                >
                  {item.score}/10
                </span>
              </div>
            );
          })}
        </div>

        <h3 className="text-base font-bold text-[#3d3220] mt-7 mb-3">Level it up</h3>
        <div className="bg-[#f4ead9] rounded-[20px] p-4 flex flex-col gap-3">
          {result.tips.map((tip, i) => (
            <p key={i} className="text-sm text-[#3d3220] flex gap-2">
              <span>✨</span>
              <span>{tip}</span>
            </p>
          ))}
        </div>
      </div>

      <button
        onClick={() =>
          shareResult({ node: cardRef.current, result, imageDataUrl })
        }
        className="btn-gold mt-4 w-full py-3.5 rounded-2xl font-semibold"
      >
        Share my result
      </button>
    </div>
  );
}

export default ResultCard;

const bullets = [
  { emoji: "⚡", text: "Instant AI feedback on your fit" },
  { emoji: "📊", text: "Item-by-item breakdown and tips" },
  { emoji: "🔥", text: "Build a daily outfit streak" },
];

function Welcome({ onGetStarted }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-5">
      <div className="fade-in w-full max-w-sm text-center">
        <div className="text-6xl mb-3">👗</div>
        <h1 className="text-3xl font-extrabold text-[#3d3220]">Rate My Outfit</h1>
        <p className="text-[#9b8a68] mt-2">
          Get your outfit scored by AI in seconds
        </p>

        <div className="mt-6 flex flex-col gap-3 text-left">
          {bullets.map((b, i) => (
            <div
              key={i}
              className="flex items-center gap-3 glass-soft border border-white/50 rounded-2xl px-4 py-3"
            >
              <span className="text-xl">{b.emoji}</span>
              <span className="text-sm text-[#3d3220]">{b.text}</span>
            </div>
          ))}
        </div>

        {/* Example score-card preview */}
        <div className="glass-card rounded-[28px] p-5 mt-7 text-left">
          <p className="text-[11px] uppercase tracking-wide text-[#9b8a68] mb-2">
            Example
          </p>
          <div className="flex items-center gap-4">
            <div
              className="shrink-0 w-[88px] h-[88px] rounded-full flex items-center justify-center"
              style={{ background: "conic-gradient(#caa24e 90%, #ece0c8 0)" }}
            >
              <div className="w-[68px] h-[68px] rounded-full bg-[#fffdf9] flex flex-col items-center justify-center">
                <span className="text-2xl font-extrabold text-[#3d3220] leading-none">
                  9
                </span>
                <span className="text-[10px] text-[#9b8a68]">/ 10</span>
              </div>
            </div>
            <div>
              <p className="text-lg font-bold text-[#3d3220]">
                Absolutely stunning ✨
              </p>
              <p className="text-sm text-[#9b8a68]">Cohesive, well-fitted look</p>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-2">
            <div className="flex items-center gap-2 bg-[#f8f1e6] rounded-2xl px-3 py-2">
              <span className="text-lg">👕</span>
              <span className="text-sm font-medium text-[#3d3220] flex-1">Top</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#ece0c8] text-[#a9823a]">
                9/10
              </span>
            </div>
            <div className="flex items-center gap-2 bg-[#f8f1e6] rounded-2xl px-3 py-2">
              <span className="text-lg">👟</span>
              <span className="text-sm font-medium text-[#3d3220] flex-1">Shoes</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#ece0c8] text-[#a9823a]">
                8/10
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={onGetStarted}
          className="btn-gold w-full py-4 rounded-2xl font-semibold text-base mt-7"
        >
          Get Started
        </button>

        <footer className="text-xs text-[#b6a888] mt-8">
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mb-2">
            <a href="/privacy" className="hover:text-[#a9823a]">Privacy</a>
            <a href="/terms" className="hover:text-[#a9823a]">Terms</a>
            <a href="/refund" className="hover:text-[#a9823a]">Refunds</a>
            <a href="/pricing" className="hover:text-[#a9823a]">Pricing</a>
            <a href="/contact" className="hover:text-[#a9823a]">Contact</a>
          </div>
          Rate My Outfit · made with ✨ and AI
        </footer>
      </div>
    </div>
  );
}

export default Welcome;

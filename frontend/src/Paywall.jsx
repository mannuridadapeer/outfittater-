import { openCheckout } from "./paddle";

const FEATURES = [
  "Unlimited outfit ratings",
  "All judge personas (Hype, Brutal, Critic…)",
  "Every occasion",
  "Unlimited saved history",
  "New features first",
];

function Paywall({ onClose, user }) {
  function checkout(plan) {
    const priceId =
      plan === "annual"
        ? import.meta.env.VITE_PADDLE_PRICE_YEARLY
        : import.meta.env.VITE_PADDLE_PRICE_MONTHLY;
    openCheckout({ priceId, email: user?.email, userId: user?.uid });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/40"
      onClick={onClose}
    >
      <div
        className="fade-in glass-card rounded-[32px] p-7 w-full max-w-sm text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-5xl mb-2">✨</div>
        <h2 className="text-2xl font-extrabold text-[#3d3220]">
          Rate My Outfit Pro
        </h2>
        <p className="text-sm text-[#9b8a68] mt-1 mb-5">Unlock the full closet</p>

        <div className="flex flex-col gap-2.5 text-left mb-6">
          {FEATURES.map((f, i) => (
            <div key={i} className="flex items-center gap-2.5 text-sm text-[#3d3220]">
              <span className="text-[#a9823a] font-bold">✓</span>
              {f}
            </div>
          ))}
        </div>

        {/* Yearly - best value */}
        <button
          onClick={() => checkout("annual")}
          className="btn-gold w-full py-3.5 rounded-2xl font-semibold flex items-center justify-between px-5"
        >
          <span>Yearly</span>
          <span>$49.99/yr</span>
        </button>
        <p className="text-xs font-semibold text-[#a9823a] mt-1.5 mb-3">
          🔥 Best value — save 58% vs monthly
        </p>

        {/* Monthly */}
        <button
          onClick={() => checkout("monthly")}
          className="btn-soft w-full py-3.5 rounded-2xl font-semibold flex items-center justify-between px-5"
        >
          <span>Monthly</span>
          <span>$9.99/mo</span>
        </button>

        <button
          onClick={onClose}
          className="text-sm text-[#9b8a68] hover:text-[#3d3220] mt-4 transition"
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}

export default Paywall;

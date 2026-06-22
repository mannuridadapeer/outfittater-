const FEATURES = [
  "Unlimited outfit ratings",
  "All judge personas (Hype, Brutal, Critic…)",
  "Every occasion",
  "Unlimited saved history",
  "New features first",
];

function Paywall({ onClose, user }) {
  function upgrade() {
    const base = import.meta.env.VITE_GUMROAD_URL;
    if (!base) {
      alert("Pro is launching soon — payments are being set up! 🎉");
      return;
    }
    // Attach the user's id + email so the webhook knows who paid.
    // The customer types the influencer's discount code on Gumroad's checkout.
    const sep = base.includes("?") ? "&" : "?";
    const url =
      base +
      sep +
      "user_id=" +
      encodeURIComponent(user?.uid || "") +
      "&email=" +
      encodeURIComponent(user?.email || "") +
      "&wanted=true";
    window.location.href = url;
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

        <div className="text-3xl font-extrabold text-[#3d3220]">
          $3.99
          <span className="text-base font-semibold text-[#9b8a68]">/mo</span>
        </div>

        <button
          onClick={upgrade}
          className="btn-gold w-full py-3.5 rounded-2xl font-semibold mt-4"
        >
          Upgrade to Pro
        </button>
        <button
          onClick={onClose}
          className="text-sm text-[#9b8a68] hover:text-[#3d3220] mt-3 transition"
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}

export default Paywall;

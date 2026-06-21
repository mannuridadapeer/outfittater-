import { useState, useEffect } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "./firebase";
import Welcome from "./Welcome";
import Login from "./Login";
import Rate from "./Rate";
import History from "./History";
import Stats from "./Stats";

function App() {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [showLogin, setShowLogin] = useState(false); // welcome -> login
  const [screen, setScreen] = useState("rate"); // "rate" or "history"

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
    });
    return unsubscribe;
  }, []);

  // First load: checking whether you're already signed in
  if (!authReady) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <div className="spinner"></div>
        <p className="text-[#9b8a68] text-sm">Loading…</p>
      </div>
    );
  }

  // Not signed in -> welcome screen first, then the login form
  if (!user) {
    return showLogin ? (
      <Login onBack={() => setShowLogin(false)} />
    ) : (
      <Welcome onGetStarted={() => setShowLogin(true)} />
    );
  }

  const tabClass = (active) =>
    "flex-1 py-2.5 rounded-full text-sm font-semibold transition " +
    (active
      ? "bg-[#fffdf9] text-[#a9823a] shadow-[0_6px_16px_-6px_rgba(150,120,70,0.5)]"
      : "text-[#9b8a68]");

  return (
    <div className="max-w-md mx-auto px-5 pb-16">
      <header className="flex items-center justify-between py-6">
        <div className="text-xl font-extrabold text-[#a9823a]">
          👗 Rate My Outfit
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#9b8a68] max-w-[120px] truncate">
            {user.email || "Google user"}
          </span>
          <button
            onClick={() => signOut(auth)}
            className="text-sm text-[#9b8a68] hover:text-[#3d3220] px-2 py-1 rounded-lg transition"
          >
            Sign out
          </button>
        </div>
      </header>

      <nav className="flex gap-2 bg-[#f4ead9] p-1.5 rounded-full mb-6">
        <button onClick={() => setScreen("rate")} className={tabClass(screen === "rate")}>
          Rate
        </button>
        <button
          onClick={() => setScreen("history")}
          className={tabClass(screen === "history")}
        >
          History
        </button>
        <button
          onClick={() => setScreen("stats")}
          className={tabClass(screen === "stats")}
        >
          Stats
        </button>
      </nav>

      {/* key changes on tab switch -> re-triggers the fade/slide animation */}
      <main key={screen} className="fade-in">
        {screen === "rate" && <Rate user={user} />}
        {screen === "history" && (
          <History user={user} onRate={() => setScreen("rate")} />
        )}
        {screen === "stats" && <Stats user={user} />}
      </main>

      <footer className="text-center text-xs text-[#b6a888] mt-12">
        Rate My Outfit · made with ✨ and AI
      </footer>
    </div>
  );
}

export default App;

import { useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { auth, googleProvider } from "./firebase";

const inputClass =
  "w-full px-4 py-3 mb-3 rounded-2xl bg-[#f8f1e6] border border-[#ece0c8] " +
  "text-[#3d3220] placeholder:text-[#b6a888] focus:outline-none focus:border-[#caa24e] transition";

// Turn raw Firebase error codes into plain, friendly messages.
// Returns "" for things the user did on purpose (like closing the popup).
function friendlyAuthError(err) {
  const code = (err && err.code) || "";
  switch (code) {
    case "auth/email-already-in-use":
      return "This email already has an account. Try signing in instead.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/missing-email":
      return "Please enter your email address.";
    case "auth/missing-password":
      return "Please enter your password.";
    case "auth/wrong-password":
    case "auth/invalid-credential":
    case "auth/user-not-found":
      return "Wrong email or password.";
    case "auth/weak-password":
      return "Password must be at least 6 characters.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a moment and try again.";
    case "auth/network-request-failed":
      return "Network error. Check your connection and try again.";
    case "auth/popup-blocked":
      return "Your browser blocked the sign-in popup. Please allow popups and try again.";
    case "auth/unauthorized-domain":
      return "This site isn't authorized for sign-in yet.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return ""; // user cancelled - don't show an error
    default:
      return "Something went wrong. Please try again.";
  }
}

function Login({ onBack }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // Clear any error the moment the user starts typing again
  function handleEmail(e) {
    setEmail(e.target.value);
    if (error) setError("");
  }
  function handlePassword(e) {
    setPassword(e.target.value);
    if (error) setError("");
  }

  async function handleSignUp() {
    setError("");
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (e) {
      setError(friendlyAuthError(e));
    }
  }

  async function handleSignIn() {
    setError("");
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (e) {
      setError(friendlyAuthError(e));
    }
  }

  async function handleGoogle() {
    setError("");
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      const msg = friendlyAuthError(e);
      if (msg) setError(msg);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-5">
      <div className="fade-in w-full max-w-sm glass-card rounded-[32px] p-8">
        {onBack && (
          <button
            onClick={onBack}
            className="text-sm text-[#9b8a68] hover:text-[#3d3220] mb-3 transition"
          >
            ← Back
          </button>
        )}

        <div className="text-center">
          <h1 className="text-2xl font-extrabold text-[#3d3220]">
            👗 Rate My Outfit
          </h1>
          <p className="text-sm text-[#9b8a68] mt-2 mb-7">
            Sign in to get your fits scored
          </p>
        </div>

        <input
          className={inputClass}
          placeholder="Email"
          value={email}
          onChange={handleEmail}
        />
        <input
          className={inputClass}
          type="password"
          placeholder="Password (at least 6 characters)"
          value={password}
          onChange={handlePassword}
        />

        <div className="flex gap-3 mt-1">
          <button onClick={handleSignIn} className="btn-gold flex-1 py-3 rounded-2xl font-semibold">
            Sign in
          </button>
          <button onClick={handleSignUp} className="btn-gold flex-1 py-3 rounded-2xl font-semibold">
            Sign up
          </button>
        </div>

        <div className="flex items-center my-5 text-[#9b8a68] text-xs">
          <span className="flex-1 h-px bg-[#ece0c8]"></span>
          <span className="px-3">or</span>
          <span className="flex-1 h-px bg-[#ece0c8]"></span>
        </div>

        <button onClick={handleGoogle} className="btn-outline w-full py-3 rounded-2xl font-semibold">
          Continue with Google
        </button>

        {error && (
          <p className="mt-4 text-sm text-[#a8506a] bg-[#f3dbe2] rounded-xl px-3 py-2.5 text-center">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

export default Login;

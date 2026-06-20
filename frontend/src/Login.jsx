import { useState, useEffect } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithRedirect,
  getRedirectResult,
} from "firebase/auth";
import { auth, googleProvider } from "./firebase";

const inputClass =
  "w-full px-4 py-3 mb-3 rounded-2xl bg-[#f8f1e6] border border-[#ece0c8] " +
  "text-[#3d3220] placeholder:text-[#b6a888] focus:outline-none focus:border-[#caa24e]";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    getRedirectResult(auth).catch((e) => setError(e.message));
  }, []);

  async function handleSignUp() {
    setError("");
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleSignIn() {
    setError("");
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleGoogle() {
    setError("");
    try {
      await signInWithRedirect(auth, googleProvider);
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-5">
      <div className="fade-in w-full max-w-sm glass-card rounded-[32px] p-8 text-center">
        <h1 className="text-2xl font-extrabold text-[#3d3220]">
          👗 Rate My Outfit
        </h1>
        <p className="text-sm text-[#9b8a68] mt-2 mb-7">
          Sign in to get your fits scored
        </p>

        <input
          className={inputClass}
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className={inputClass}
          type="password"
          placeholder="Password (at least 6 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <div className="flex gap-3 mt-1">
          <button
            onClick={handleSignIn}
            className="flex-1 py-3 rounded-2xl font-semibold text-white bg-gradient-to-r from-[#caa24e] to-[#a9823a] shadow-[0_10px_20px_-8px_rgba(169,130,58,0.7)]"
          >
            Sign in
          </button>
          <button
            onClick={handleSignUp}
            className="flex-1 py-3 rounded-2xl font-semibold text-[#a9823a] bg-[#f4ead9]"
          >
            Sign up
          </button>
        </div>

        <div className="flex items-center my-5 text-[#9b8a68] text-xs">
          <span className="flex-1 h-px bg-[#ece0c8]"></span>
          <span className="px-3">or</span>
          <span className="flex-1 h-px bg-[#ece0c8]"></span>
        </div>

        <button
          onClick={handleGoogle}
          className="w-full py-3 rounded-2xl font-semibold text-[#3d3220] bg-[#fffdf9] border border-[#ece0c8]"
        >
          Continue with Google
        </button>

        {error && (
          <p className="mt-4 text-sm text-[#a8506a] bg-[#f3dbe2] rounded-xl px-3 py-2.5">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

export default Login;

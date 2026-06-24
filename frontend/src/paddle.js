import { initializePaddle } from "@paddle/paddle-js";
import { doc, setDoc } from "firebase/firestore";
import { db } from "./firebase";

// Initialize Paddle once, lazily. Returns null if not configured yet.
let paddlePromise = null;
let pendingUserId = null; // who is currently checking out

function getPaddle() {
  if (paddlePromise) return paddlePromise;
  const token = import.meta.env.VITE_PADDLE_CLIENT_TOKEN;
  if (!token) return null;
  const environment =
    import.meta.env.VITE_PADDLE_ENV === "production" ? "production" : "sandbox";

  paddlePromise = initializePaddle({
    token,
    environment,
    // When Paddle confirms a successful checkout, mark this user as Pro.
    eventCallback: async (event) => {
      console.log("Paddle event:", event?.name);
      if (event?.name === "checkout.completed" && pendingUserId) {
        try {
          await setDoc(
            doc(db, "users", pendingUserId, "meta", "profile"),
            { plan: "pro", proSince: Date.now() },
            { merge: true }
          );
        } catch (e) {
          console.log("Could not set Pro:", e);
        }
        // Reload so the app picks up the new Pro status
        window.location.reload();
      }
    },
  });
  return paddlePromise;
}

// Open the Paddle overlay checkout for a given price.
export async function openCheckout({ priceId, email, userId }) {
  const p = getPaddle();
  if (!p || !priceId) {
    alert("Pro is launching soon — payments are being set up! 🎉");
    return;
  }
  pendingUserId = userId || null;
  const paddle = await p;
  paddle.Checkout.open({
    settings: {
      displayMode: "overlay",
      theme: "light",
      showAddDiscounts: true,
    },
    items: [{ priceId, quantity: 1 }],
    customer: email ? { email } : undefined,
    customData: { user_id: userId || "" },
  });
}

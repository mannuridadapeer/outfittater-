import { initializePaddle } from "@paddle/paddle-js";

// Initialize Paddle once, lazily. Returns null if not configured yet.
let paddlePromise = null;
function getPaddle() {
  if (paddlePromise) return paddlePromise;
  const token = import.meta.env.VITE_PADDLE_CLIENT_TOKEN;
  if (!token) return null;
  const environment =
    import.meta.env.VITE_PADDLE_ENV === "production" ? "production" : "sandbox";
  paddlePromise = initializePaddle({ token, environment });
  return paddlePromise;
}

// Open the Paddle overlay checkout for a given price.
// Passes the user's id so the webhook knows who paid, and lets the customer
// type an influencer's discount code (showAddDiscounts).
export async function openCheckout({ priceId, email, userId }) {
  const p = getPaddle();
  if (!p || !priceId) {
    alert("Pro is launching soon — payments are being set up! 🎉");
    return;
  }
  const paddle = await p;
  paddle.Checkout.open({
    settings: {
      displayMode: "overlay",
      theme: "light",
      showAddDiscounts: true,
      successUrl: window.location.origin,
    },
    items: [{ priceId, quantity: 1 }],
    customer: email ? { email } : undefined,
    customData: { user_id: userId || "" },
  });
}

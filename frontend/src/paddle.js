import { initializePaddle } from "@paddle/paddle-js";
import { auth } from "./firebase";

const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL ||
  `http://${window.location.hostname}:3000`;

let paddlePromise = null;

function getPaddle() {
  if (paddlePromise) return paddlePromise;
  const token = import.meta.env.VITE_PADDLE_CLIENT_TOKEN;
  if (!token) return null;
  const environment =
    import.meta.env.VITE_PADDLE_ENV === "production" ? "production" : "sandbox";

  paddlePromise = initializePaddle({
    token,
    environment,
    eventCallback: (event) => {
      // After a successful payment, wait for Paddle to register it, then reload
      if (event?.name === "checkout.completed") {
        waitForProThenReload();
      }
    },
  });
  return paddlePromise;
}

// Poll the backend (which asks Paddle) until the subscription shows up, then reload
async function waitForProThenReload() {
  for (let i = 0; i < 6; i++) {
    try {
      const u = auth.currentUser;
      if (u) {
        const token = await u.getIdToken();
        const r = await fetch(BACKEND_URL + "/plan", {
          headers: { Authorization: "Bearer " + token },
        });
        const d = await r.json();
        if (d.plan === "pro") break;
      }
    } catch (e) {
      /* keep waiting */
    }
    await new Promise((res) => setTimeout(res, 2000));
  }
  window.location.reload();
}

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
    },
    items: [{ priceId, quantity: 1 }],
    customer: email ? { email } : undefined,
    customData: { user_id: userId || "" },
  });
}

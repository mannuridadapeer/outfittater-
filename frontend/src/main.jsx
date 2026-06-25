import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './installPrompt' // start listening for the install prompt early
import App from './App.jsx'

// Register the minimal service worker (enables "Install app")
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

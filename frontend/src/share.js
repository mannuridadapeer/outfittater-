// ---------------------------------------------------------------
// Sharing helper - opens the phone's native share sheet.
// Tries hardest -> easiest:
//   1. Share an IMAGE of the score card (Web Share API with files)
//   2. If files aren't supported, share a TEXT summary + link
//   3. If sharing isn't supported at all, copy text to clipboard
// All steps are wrapped so nothing ever crashes the app.
// ---------------------------------------------------------------

import { toBlob } from "html-to-image";

function buildText(result) {
  const link = window.location.origin;
  const items = result.items.map((it) => `${it.name}: ${it.score}/10`).join(" · ");
  return (
    `My outfit scored ${result.overallScore}/10 on Rate My Outfit! ✨\n` +
    `${items}\n` +
    `Rate your own fit: ${link}`
  );
}

async function dataUrlToFile(dataUrl, filename) {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], filename, { type: blob.type || "image/jpeg" });
}

export async function shareResult({ node, result, imageDataUrl }) {
  const text = buildText(result);
  const title = "My Outfit Rating";

  // --- Try to build an image file to share ---
  let file = null;
  try {
    if (node) {
      // Snapshot the score card DOM into a PNG
      const blob = await toBlob(node, {
        pixelRatio: 2,
        backgroundColor: "#fffdf9",
      });
      if (blob) file = new File([blob], "outfit-score.png", { type: "image/png" });
    }
    // Fall back to the saved photo if we couldn't snapshot the card
    if (!file && imageDataUrl) {
      file = await dataUrlToFile(imageDataUrl, "outfit.jpg");
    }
  } catch (e) {
    file = null; // image capture failed - we'll share text instead
  }

  // --- 1. Share with the image file, if the browser allows it ---
  try {
    if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title, text });
      return;
    }
  } catch (e) {
    if (e && e.name === "AbortError") return; // user closed the share sheet
    // otherwise drop down to text sharing
  }

  // --- 2. Share text + link ---
  try {
    if (navigator.share) {
      await navigator.share({ title, text });
      return;
    }
  } catch (e) {
    if (e && e.name === "AbortError") return;
  }

  // --- 3. Last resort: copy to clipboard ---
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      alert("Sharing isn't available here, so I copied your result to the clipboard!");
      return;
    }
  } catch (e) {
    // ignore
  }
  alert(text);
}

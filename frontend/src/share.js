// ---------------------------------------------------------------
// Sharing + export helpers
// ---------------------------------------------------------------

import { toBlob, toPng } from "html-to-image";

function buildText(result) {
  const link = window.location.origin;
  const items = result.items.map((it) => `${it.name}: ${it.score}/10`).join(" · ");
  return (
    `My outfit scored ${result.overallScore}/10 on Slayrate! ✨\n` +
    `${items}\n` +
    `Rate your own fit: ${link}`
  );
}

async function dataUrlToFile(dataUrl, filename) {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], filename, { type: blob.type || "image/jpeg" });
}

// Share the score card (image if supported, else text + link)
export async function shareResult({ node, result, imageDataUrl }) {
  const text = buildText(result);
  const title = "My Outfit Rating";

  let file = null;
  try {
    if (node) {
      const blob = await toBlob(node, { pixelRatio: 2, backgroundColor: "#fffdf9" });
      if (blob) file = new File([blob], "outfit-score.png", { type: "image/png" });
    }
    if (!file && imageDataUrl) {
      file = await dataUrlToFile(imageDataUrl, "outfit.jpg");
    }
  } catch (e) {
    file = null;
  }

  try {
    if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title, text });
      return;
    }
  } catch (e) {
    if (e && e.name === "AbortError") return;
  }

  try {
    if (navigator.share) {
      await navigator.share({ title, text });
      return;
    }
  } catch (e) {
    if (e && e.name === "AbortError") return;
  }

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

// Save the score card as a downloadable PNG
export async function saveCardImage(node) {
  if (!node) return;
  try {
    const dataUrl = await toPng(node, { pixelRatio: 2, backgroundColor: "#fffdf9" });
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = "my-outfit-score.png";
    a.click();
  } catch (e) {
    alert("Couldn't save the image — try a screenshot instead.");
  }
}

// Copy the result as text
export async function copyResultText(result) {
  const text = buildText(result);
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      alert("Result copied to clipboard!");
      return;
    }
  } catch (e) {
    // ignore
  }
  alert(text);
}

// Invite a friend — share the app itself
export async function shareApp() {
  const url = window.location.origin;
  const text = "Rate your outfit with AI 👗✨ Try Slayrate:";
  try {
    if (navigator.share) {
      await navigator.share({ title: "Slayrate", text, url });
      return;
    }
  } catch (e) {
    if (e && e.name === "AbortError") return;
  }
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(url);
      alert("Link copied — share it with friends!");
      return;
    }
  } catch (e) {
    // ignore
  }
  alert(url);
}

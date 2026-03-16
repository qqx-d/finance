import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./App.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register service worker for PWA with auto-update
if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      // Check for updates every 60 seconds
      setInterval(() => reg.update(), 60_000);
      // When a new SW is installed, reload to pick up new assets
      reg.addEventListener("updatefound", () => {
        const newSW = reg.installing;
        if (!newSW) return;
        newSW.addEventListener("statechange", () => {
          if (newSW.state === "activated" && navigator.serviceWorker.controller) {
            window.location.reload();
          }
        });
      });
    } catch (_) { /* SW registration failed, app works without it */ }
  });
}

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./app.tsx";
import { ThemeProvider } from "./components/providers/theme-provider.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <App />
    </ThemeProvider>
  </StrictMode>
);

// Register service worker for caching hashed assets (optional)
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        reg.addEventListener("updatefound", () => {
          const newSW = reg.installing;
          newSW?.addEventListener("statechange", () => {
            if (
              newSW.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              // New content available; you may prompt user to refresh
              console.log("New content available; please refresh.");
            }
          });
        });
      })
      .catch((err) => {
        console.error("ServiceWorker registration failed:", err);
      });
  });
}

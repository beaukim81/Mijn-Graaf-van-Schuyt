import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/main.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js").catch(() => {
      // Installatie blijft bruikbaar als service worker registratie niet lukt.
    });
  });
}

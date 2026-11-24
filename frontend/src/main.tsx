import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ToastProvider } from "./lib/toast";
import App from "./App";
import { aplicarNaRaiz, lerConfig } from "./lib/a11y/config";
import "./styles/index.css";
import "./styles/dark.css";
import "./styles/a11y.css";

// Aplica tema, fonte e filtros antes da primeira pintura.
aplicarNaRaiz(lerConfig());

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <App />
      </ToastProvider>
    </BrowserRouter>
  </React.StrictMode>
);

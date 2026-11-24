import { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./features/auth/LoginPage";
import ConverterPage from "./features/converter/ConverterPage";
import { clearTokens, isAuthenticated } from "./lib/auth";

export default function App() {
  const [authed, setAuthed] = useState(isAuthenticated());

  if (!authed) {
    return <LoginPage onLogin={() => setAuthed(true)} />;
  }

  return (
    <div>
      <header style={{ background: "#1e3a8a", color: "#fff", padding: 12, display: "flex", justifyContent: "space-between" }}>
        <strong>Interativo — Conversor de Livros</strong>
        <button onClick={() => { clearTokens(); setAuthed(false); }} style={{ background: "transparent", color: "#fff", border: "1px solid #fff", padding: "4px 10px", borderRadius: 6, cursor: "pointer" }}>Sair</button>
      </header>
      <Routes>
        <Route path="/" element={<ConverterPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
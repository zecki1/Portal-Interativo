import { useState, useEffect } from "react";
import { apiFetch } from "../../lib/api";

interface Project { id: string; name: string; sourceFormat: string; createdAt: string; fileCount: number; }

export default function ConverterPage() {
  const [file, setFile] = useState<File | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = async () => {
    const r = await apiFetch<Project[]>("/projects");
    if (r.data) setProjects(r.data);
  };

  useEffect(() => { load(); }, []);

  const upload = async () => {
    if (!file) return;
    setBusy(true); setMsg(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await apiFetch<Project>("/convert", { method: "POST", body: fd });
      if (r.data) { setMsg("Convertido: " + r.data.name); setFile(null); load(); }
    } catch (e: any) {
      setMsg(e.message || "Erro");
    } finally { setBusy(false); }
  };

  return (
    <div style={{ maxWidth: 900, margin: "24px auto", padding: 16, fontFamily: "system-ui" }}>
      <h1>Conversor de Livros para Web</h1>
      <p>Envie .pdf, .idml ou .indd (exporte .indd para IDML/PDF).</p>
      <div style={{ display: "flex", gap: 8, alignItems: "center", margin: "16px 0" }}>
        <input type="file" accept=".pdf,.idml,.indd" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        <button onClick={upload} disabled={!file || busy}>{busy ? "Convertendo..." : "Converter"}</button>
      </div>
      {msg && <p>{msg}</p>}
      <h2>Projetos</h2>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {projects.map((p) => (
          <li key={p.id} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, marginBottom: 8 }}>
            <strong>{p.name}</strong> <span>({p.sourceFormat})</span>
            <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
              <a href={`${import.meta.env.VITE_API_BASE || `http://${window.location.hostname}:3002/api/v1`}/projects/${p.id}/preview`} target="_blank" rel="noreferrer">Preview</a>
              <a href={`${import.meta.env.VITE_API_BASE || `http://${window.location.hostname}:3002/api/v1`}/projects/${p.id}/download`}>Download ZIP</a>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
import React, { useState, useEffect } from "react";
import {
  IconClose,
  IconMonitor,
  IconTablet,
  IconSmartphone,
  IconDownload,
} from "../../components/icons";

interface PreviewModalProps {
  projectId: string;
  projectName: string;
  apiBase: string;
  nonce?: number;
  onClose: () => void;
}

export const PreviewModal: React.FC<PreviewModalProps> = ({
  projectId,
  projectName,
  apiBase,
  nonce = 0,
  onClose,
}) => {
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const previewUrl = `${apiBase}/projects/${projectId}/preview/?v=${nonce}`;

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("portal:fechar-acessibilidade"));
  }, []);
  const downloadUrl = `${apiBase}/projects/${projectId}/download`;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center p-2 sm:p-4">
      {/* Barra Superior do Preview */}
      <div className="w-full max-w-6xl bg-surface border border-border rounded-t-2xl px-3 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-2 shadow-card transition-colors duration-200">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
          <span className="text-xs font-bold text-ink truncate max-w-[160px] sm:max-w-xs">
            Preview Interativo: {projectName}
          </span>
        </div>

        {/* Seletor de Dispositivo */}
        <div className="flex items-center gap-1 bg-surface-3 p-1 rounded border border-border">
          <button
            type="button"
            aria-label="Desktop"
            aria-pressed={device === "desktop"}
            onClick={() => setDevice("desktop")}
            className={`min-h-11 min-w-11 px-3 rounded text-xs font-bold flex items-center justify-center gap-1.5 transition ${
              device === "desktop"
                ? "bg-surface text-ink shadow-sm"
                : "text-muted hover:text-ink"
            }`}
          >
            <IconMonitor className="w-4 h-4" />
            <span className="hidden sm:inline">Desktop</span>
          </button>
          <button
            type="button"
            aria-label="Tablet"
            aria-pressed={device === "tablet"}
            onClick={() => setDevice("tablet")}
            className={`min-h-11 min-w-11 px-3 rounded text-xs font-bold flex items-center justify-center gap-1.5 transition ${
              device === "tablet"
                ? "bg-surface text-ink shadow-sm"
                : "text-muted hover:text-ink"
            }`}
          >
            <IconTablet className="w-4 h-4" />
            <span className="hidden sm:inline">Tablet</span>
          </button>
          <button
            type="button"
            aria-label="Celular"
            aria-pressed={device === "mobile"}
            onClick={() => setDevice("mobile")}
            className={`min-h-11 min-w-11 px-3 rounded text-xs font-bold flex items-center justify-center gap-1.5 transition ${
              device === "mobile"
                ? "bg-surface text-ink shadow-sm"
                : "text-muted hover:text-ink"
            }`}
          >
            <IconSmartphone className="w-4 h-4" />
            <span className="hidden sm:inline">Celular</span>
          </button>
        </div>

        {/* Botão de Download ZIP e Fechar */}
        <div className="flex items-center gap-2">
          <a
            href={downloadUrl}
            className="inline-flex min-h-11 items-center gap-1.5 px-3.5 py-2 rounded bg-brand-red hover:bg-brand-red-dark text-white text-xs font-bold transition shadow-sm"
          >
            <IconDownload className="w-4 h-4" />
            Exportar Web (.ZIP)
          </a>
          <button
            onClick={onClose}
            className="inline-flex min-h-11 min-w-11 items-center justify-center p-2 text-muted hover:text-ink hover:bg-surface-3 rounded transition"
            title="Fechar Preview"
            aria-label="Fechar preview"
          >
            <IconClose className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Janela de Renderização Responsiva */}
      <div className="w-full max-w-6xl flex-1 bg-surface-2 rounded-b-2xl border-x border-b border-border overflow-hidden flex items-center justify-center p-2 sm:p-4">
        <div
          className="h-full w-full max-w-full rounded overflow-hidden shadow-card bg-surface flex flex-col"
          style={{
            width:
              device === "desktop"
                ? "100%"
                : device === "tablet"
                ? "768px"
                : "380px",
          }}
        >
          <iframe
            key={`${device}-${nonce}`}
            src={previewUrl}
            title="Preview do Livro Interativo"
            className="w-full h-full border-none"
          />
        </div>
      </div>
    </div>
  );
};

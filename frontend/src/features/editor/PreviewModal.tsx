import React, { useState } from "react";
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
  onClose: () => void;
}

export const PreviewModal: React.FC<PreviewModalProps> = ({
  projectId,
  projectName,
  apiBase,
  onClose,
}) => {
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const previewUrl = `${apiBase}/projects/${projectId}/preview`;
  const downloadUrl = `${apiBase}/projects/${projectId}/download`;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center p-4">
      {/* Barra Superior do Preview */}
      <div className="w-full max-w-6xl bg-white border border-slate-200 rounded-t-2xl px-6 py-3 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-xs font-bold text-slate-800 truncate max-w-xs">
            Preview Interativo: {projectName}
          </span>
        </div>

        {/* Seletor de Dispositivo */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setDevice("desktop")}
            className={`p-1.5 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
              device === "desktop"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <IconMonitor className="w-4 h-4" />
            <span className="hidden sm:inline">Desktop</span>
          </button>
          <button
            onClick={() => setDevice("tablet")}
            className={`p-1.5 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
              device === "tablet"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <IconTablet className="w-4 h-4" />
            <span className="hidden sm:inline">Tablet</span>
          </button>
          <button
            onClick={() => setDevice("mobile")}
            className={`p-1.5 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
              device === "mobile"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-900"
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
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-brand-red hover:bg-brand-red-dark text-white text-xs font-bold transition shadow-sm"
          >
            <IconDownload className="w-4 h-4" />
            Exportar Web (.ZIP)
          </a>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
            title="Fechar Preview"
          >
            <IconClose className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Janela de Renderização Responsiva */}
      <div className="w-full max-w-6xl flex-1 bg-slate-950/40 rounded-b-2xl border-x border-b border-slate-200 overflow-hidden flex items-center justify-center p-4">
        <div
          className={`h-full transition-all duration-300 rounded-xl overflow-hidden shadow-2xl bg-white flex flex-col ${
            device === "desktop"
              ? "w-full"
              : device === "tablet"
              ? "w-[768px]"
              : "w-[380px]"
          }`}
        >
          <iframe
            src={previewUrl}
            title="Preview do Livro Interativo"
            className="w-full h-full border-none"
          />
        </div>
      </div>
    </div>
  );
};

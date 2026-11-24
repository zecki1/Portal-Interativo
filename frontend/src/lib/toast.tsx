import { createContext, useCallback, useContext, useState } from "react";

type Tipo = "sucesso" | "erro";

interface ToastItem {
  id: number;
  mensagem: string;
  tipo: Tipo;
}

interface ToastContextValue {
  mostrar: (mensagem: string, tipo?: Tipo) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [itens, setItens] = useState<ToastItem[]>([]);

  const mostrar = useCallback((mensagem: string, tipo: Tipo = "sucesso") => {
    const id = Date.now() + Math.random();
    setItens((prev) => [...prev, { id, mensagem, tipo }]);
    window.setTimeout(() => setItens((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  return (
    <ToastContext.Provider value={{ mostrar }}>
      {children}
      <div className="fixed bottom-4 left-4 z-[10001] flex flex-col gap-2 print:hidden">
        {itens.map((t) => (
          <div
            key={t.id}
            className={`rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-lg transition ${
              t.tipo === "sucesso" ? "bg-green-600" : "bg-red-600"
            }`}
          >
            {t.mensagem}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast fora do ToastProvider");
  return ctx;
}

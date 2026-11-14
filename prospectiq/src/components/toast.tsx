'use client';
import { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

type Tone = 'success' | 'error' | 'info';
interface Toast {
  id: number;
  tone: Tone;
  message: string;
  action?: { label: string; href: string };
}

const Ctx = createContext<(message: string, tone?: Tone, action?: Toast['action']) => void>(() => {});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = useCallback((message: string, tone: Tone = 'info', action?: Toast['action']) => {
    const id = Date.now() + Math.random();
    setItems((list) => [...list.slice(-3), { id, tone, message, action }]);
    setTimeout(() => setItems((list) => list.filter((t) => t.id !== id)), tone === 'error' ? 8000 : 4500);
  }, []);
  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} role={t.tone === 'error' ? 'alert' : 'status'} className="pointer-events-auto flex w-full max-w-md animate-rise items-start gap-3 rounded-xl bg-night-900 px-4 py-3 text-sm text-white shadow-pop" data-testid={`toast-${t.tone}`}>
            {t.tone === 'success' ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-400" /> : t.tone === 'error' ? <AlertCircle className="mt-0.5 size-4 shrink-0 text-rose-400" /> : <Info className="mt-0.5 size-4 shrink-0 text-electric-400" />}
            <span className="flex-1">
              {t.message}
              {t.action && (
                <a href={t.action.href} className="ml-2 font-semibold text-electric-400 underline underline-offset-2">
                  {t.action.label}
                </a>
              )}
            </span>
            <button type="button" aria-label="Fermer" onClick={() => setItems((l) => l.filter((x) => x.id !== t.id))} className="text-white/60 hover:text-white">
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);

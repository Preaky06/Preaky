'use client';
import { Printer, Link2 } from 'lucide-react';
import { useState } from 'react';

export function ReportActions() {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      <button
        type="button"
        onClick={async () => {
          await navigator.clipboard?.writeText(window.location.href).catch(() => {});
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
        className="inline-flex h-9 items-center gap-2 rounded-lg border border-line bg-white px-3 text-sm font-semibold hover:bg-slate-50"
      >
        <Link2 className="size-4" />
        {copied ? 'Lien copié' : 'Copier le lien'}
      </button>
      <button type="button" onClick={() => window.print()} className="inline-flex h-9 items-center gap-2 rounded-lg border border-line bg-white px-3 text-sm font-semibold hover:bg-slate-50">
        <Printer className="size-4" />
        Imprimer / PDF
      </button>
    </div>
  );
}

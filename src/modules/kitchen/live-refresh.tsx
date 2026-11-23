"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function LiveRefresh() {
  const router = useRouter();
  const [enabled, setEnabled] = useState(true);
  useEffect(() => {
    if (!enabled) return;
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 15000);
    return () => clearInterval(timer);
  }, [enabled, router]);
  return <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
    <label className="flex items-center gap-2"><input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} className="accent-success" /> Actualizar cada 15 s</label>
    <button type="button" onClick={() => router.refresh()} className="rounded-lg border border-line bg-surface px-3 py-2 font-semibold text-brand">Actualizar ahora</button>
  </div>;
}

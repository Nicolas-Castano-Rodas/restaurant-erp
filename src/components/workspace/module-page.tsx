import Link from "next/link";
import type { ReactNode } from "react";

export function ModulePage({ title, subtitle, children, showEyebrow = true }: { title: string; subtitle: string; children: ReactNode; showEyebrow?: boolean }) {
  return (
    <main className="mx-auto min-h-screen max-w-5xl px-3 py-5 sm:px-6">
      <Link href="/dashboard" className="text-sm font-semibold text-brand hover:underline">← Volver al panel</Link>
      <div className="reference-panel mt-3">
      <header className="mb-3">
        {showEyebrow && <p className="text-xs font-medium uppercase text-brand">Restaurant ERP · Operaciones</p>}
        <h1 className="mt-3 text-2xl font-semibold text-ink">{title}</h1>
        <p className="mt-3 text-sm text-muted">{subtitle}</p>
      </header>
      {children}
      </div>
    </main>
  );
}

export function FormFeedback({ error, saved }: { error?: string; saved?: string }) {
  return (
    <>
      {error && <p role="alert" className="mb-5 rounded-lg bg-danger-soft p-4 text-sm text-danger">No se pudo guardar. Revisa los datos, nombres duplicados y tu acceso.</p>}
      {saved && <output className="mb-5 block rounded-lg bg-success-soft p-4 text-sm text-success">Cambios guardados correctamente.</output>}
    </>
  );
}

export const inputStyle = "mt-2 block min-h-9 w-full rounded-lg border border-line bg-surface px-2 py-2 text-sm";
export const buttonStyle = "w-full rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover focus-visible:outline-offset-2";

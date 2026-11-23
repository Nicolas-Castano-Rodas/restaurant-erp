import Link from "next/link";
import type { ReactNode } from "react";

export function ModulePage({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <main className="mx-auto min-h-screen max-w-7xl px-6 py-8 md:px-12">
      <Link href="/dashboard" className="text-sm font-semibold text-brand hover:underline">← Volver al panel</Link>
      <header className="mb-8 mt-6 border-b border-line pb-6">
        <p className="text-xs font-bold uppercase tracking-widest text-brand">Restaurant ERP · Operaciones</p>
        <h1 className="mt-2 text-4xl font-bold text-ink">{title}</h1>
        <p className="mt-2 text-muted">{subtitle}</p>
      </header>
      {children}
    </main>
  );
}

export function FormFeedback({ error, saved }: { error?: string; saved?: string }) {
  return (
    <>
      {error && <p role="alert" className="mb-5 rounded-lg bg-danger-soft p-4 text-sm text-danger">No se pudo guardar. Revisa los datos, nombres duplicados y tu acceso.</p>}
      {saved && <p role="status" className="mb-5 rounded-lg bg-success-soft p-4 text-sm text-success">Cambios guardados correctamente.</p>}
    </>
  );
}

export const inputStyle = "w-full rounded-lg border border-line bg-surface px-3 py-3 text-sm";
export const buttonStyle = "rounded-lg bg-brand px-4 py-3 text-sm font-semibold text-white hover:bg-brand-hover";

import Link from "next/link";
import type { ReactNode } from "react";

export function ModulePage({ title, subtitle, children, showEyebrow = true }: { title: string; subtitle: string; children: ReactNode; showEyebrow?: boolean }) {
  return (
    <main className="mx-auto min-h-screen w-full min-w-0 max-w-5xl px-3 py-4 sm:px-6 sm:py-5">
      <a href="#module-content" className="skip-link">Saltar al contenido</a>
      <Link href="/dashboard" prefetch={false} className="inline-flex min-h-11 items-center text-sm font-semibold text-brand hover:underline">← Volver al panel</Link>
      <div id="module-content" tabIndex={-1} className="reference-panel mt-2 min-w-0">
      <header className="mb-3">
        {showEyebrow && <p className="text-xs font-medium uppercase text-brand">Restaurant ERP · Operaciones</p>}
        <h1 className="mt-2 break-words text-xl font-semibold text-ink sm:text-2xl">{title}</h1>
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

export const inputStyle = "mt-2 block min-h-11 w-full min-w-0 rounded-lg border border-line bg-surface px-2 py-2 text-sm";
export const buttonStyle = "min-h-11 w-full rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover focus-visible:outline-offset-2";

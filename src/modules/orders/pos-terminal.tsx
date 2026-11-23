"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FoodIcon } from "@/components/workspace/operation-icons";
import { submitOrder } from "./actions";
import { toMinor } from "./money";

type Variant = { id: string; name: string; price: string };
type Product = { id: string; name: string; category: string; description: string | null; price: string; variants: Variant[] };
type CartLine = { key: string; productId: string; variantId: string | null; name: string; price: string; quantity: number };
type Channel = "DINE_IN" | "TAKEAWAY" | "DELIVERY";
const channels: { id: Channel; name: string }[] = [{ id: "DINE_IN", name: "En mesa" }, { id: "TAKEAWAY", name: "Para llevar" }, { id: "DELIVERY", name: "Domicilio" }];

export function PosTerminal({ products, tables, currency, scope, initialRequestId }: { products: Product[]; tables: { id: string; name: string }[]; currency: string; scope: string; initialRequestId: string }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [channel, setChannel] = useState<Channel>("DINE_IN");
  const [tableId, setTableId] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [note, setNote] = useState("");
  const [requestId, setRequestId] = useState(initialRequestId);
  const [result, setResult] = useState<{ id: string } | { error: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const categories = [...new Set(products.map((p) => p.category))];
  const filtered = products.filter((p) => (!category || p.category === category) && `${p.name} ${p.description ?? ""}`.toLowerCase().includes(search.toLowerCase().trim()));
  const format = new Intl.NumberFormat("es-CO", { style: "currency", currency, minimumFractionDigits: 0, maximumFractionDigits: 2 });
  const total = cart.reduce((sum, line) => sum + toMinor(line.price) * BigInt(line.quantity), 0n);
  const money = (value: bigint) => format.format(Number(value) / 100);
  const add = (product: Product, variant?: Variant) => {
    const key = `${product.id}:${variant?.id ?? ""}`;
    setResult(null);
    setCart((current) => current.some((line) => line.key === key) ? current.map((line) => line.key === key ? { ...line, quantity: Math.min(99, line.quantity + 1) } : line) : current.length >= 100 ? current : [...current, { key, productId: product.id, variantId: variant?.id ?? null, name: variant ? `${product.name} · ${variant.name}` : product.name, price: variant?.price ?? product.price, quantity: 1 }]);
  };
  function changeQuantity(key: string, delta: number) {
    setCart((current) => current.map((line) => line.key === key ? { ...line, quantity: Math.min(99, line.quantity + delta) } : line).filter((line) => line.quantity > 0));
    setResult(null);
  }
  function save() {
    if (!cart.length || (channel === "DINE_IN" && !tableId) || pending) return;
    setResult(null);
    startTransition(async () => {
      try {
        const response = await submitOrder(scope, { requestId, channel, tableId: channel === "DINE_IN" ? tableId : null, note, items: cart.map(({ productId, variantId, quantity }) => ({ productId, variantId, quantity })) });
        setResult(response);
        if ("id" in response) {
          setCart([]);
          setNote("");
          setTableId("");
          setRequestId(crypto.randomUUID());
          router.refresh();
        }
      } catch {
        setResult({ error: "No se confirmó el resultado. Conserva el pedido y reintenta antes de modificarlo." });
      }
    });
  }
  return (
    <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_340px]">
      <section className="reference-card min-w-0 p-4">
        <h2 className="text-lg font-semibold">Productos</h2>
        <label className="mt-3 block text-xs text-muted">Buscar producto
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre..." className="mt-2 block w-full rounded-lg border border-line bg-surface px-3 py-3 text-sm" />
        </label>
        <div className="my-4 flex flex-wrap gap-2" aria-label="Categorías">
          {["", ...categories].map((name) => <button key={name} type="button" onClick={() => setCategory(name)} aria-pressed={category === name} className={category === name ? "rounded-lg bg-ink px-3 py-2 text-sm text-white" : "rounded-lg border border-line px-3 py-2 text-sm text-muted"}>{name || "Todos"}</button>)}
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {filtered.map((product) => (
            <article key={product.id} className="rounded-xl border border-line bg-surface p-3">
              <div className="flex items-start gap-2"><FoodIcon /><div className="min-w-0 flex-1"><h3 className="break-words text-sm font-semibold">{product.name}</h3><p className="mt-1 text-xs text-muted">{product.category}</p><p className="mt-2 font-semibold tabular-nums">{format.format(Number(product.price))}</p></div></div>
              <button type="button" disabled={pending} onClick={() => add(product)} className="mt-3 min-h-11 w-full rounded-lg bg-brand-soft px-2 py-2 text-sm font-semibold text-brand hover:bg-brand hover:text-white disabled:opacity-50">+ {product.variants.length ? "Base" : "Agregar"}</button>
              {product.variants.length > 0 && <div className="mt-2 grid gap-2">{product.variants.map((variant) => <button type="button" key={variant.id} disabled={pending} onClick={() => add(product, variant)} className="min-h-11 rounded-lg border border-line p-2 text-left text-xs font-semibold hover:bg-canvas disabled:opacity-50">+ {variant.name} · {format.format(Number(variant.price))}</button>)}</div>}
            </article>
          ))}
        </div>
        {!filtered.length && <p className="py-6 text-sm text-muted">No hay productos disponibles para esta búsqueda.</p>}
      </section>
      <section className="reference-card p-4 lg:sticky lg:top-4">
        <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold">Pedido actual</h2><span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand">{cart.reduce((sum, line) => sum + line.quantity, 0)} uds.</span></div>
        <fieldset disabled={pending} className="space-y-3">
          <legend className="mb-2 text-xs font-semibold text-muted">Tipo de servicio</legend>
          <div className="grid grid-cols-3 gap-1">{channels.map((item) => <button type="button" key={item.id} aria-pressed={channel === item.id} onClick={() => { setChannel(item.id); setTableId(""); }} className={channel === item.id ? "min-h-11 rounded-lg bg-ink p-2 text-xs font-semibold text-white" : "min-h-11 rounded-lg border border-line p-2 text-xs font-semibold text-muted"}>{item.name}</button>)}</div>
          {channel === "DINE_IN" && <label className="block text-xs text-muted">Mesa disponible<select value={tableId} onChange={(event) => setTableId(event.target.value)} className="mt-2 w-full rounded-lg border border-line bg-surface p-3 text-sm"><option value="">Seleccionar mesa</option>{tables.map((table) => <option key={table.id} value={table.id}>{table.name}</option>)}</select></label>}
          {channel === "DINE_IN" && !tables.length && <p className="text-xs text-warning">No hay mesas habilitadas y libres.</p>}
          <div className="divide-y divide-line border-y border-line">
            {cart.map((line) => <div key={line.key} className="py-3"><p className="text-sm font-semibold">{line.name}</p><div className="mt-2 flex items-center justify-between gap-2"><div className="flex items-center gap-2"><button type="button" aria-label={`Reducir ${line.name}`} onClick={() => changeQuantity(line.key, -1)} className="size-11 rounded-lg border border-line">−</button><span className="min-w-5 text-center text-sm tabular-nums">{line.quantity}</span><button type="button" aria-label={`Aumentar ${line.name}`} onClick={() => changeQuantity(line.key, 1)} className="size-11 rounded-lg border border-line">+</button></div><span className="text-sm font-semibold tabular-nums">{money(toMinor(line.price) * BigInt(line.quantity))}</span></div></div>)}
            {!cart.length && <p className="py-5 text-sm text-muted">Agrega productos para comenzar.</p>}
          </div>
          <label className="block text-xs text-muted">Observaciones<textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} rows={2} className="mt-2 w-full rounded-lg border border-line p-2 text-sm" /></label>
        </fieldset>
        <div className="mt-4 flex items-center justify-between border-t border-line pt-4"><span className="font-semibold">Total estimado</span><span className="text-xl font-bold tabular-nums">{money(total)}</span></div>
        <p className="mt-2 text-xs text-muted">El servidor valida precios y disponibilidad. Sin impuestos ni descuentos adicionales en esta versión.</p>
        <button type="button" onClick={save} disabled={pending || !cart.length || (channel === "DINE_IN" && !tableId)} className="mt-4 min-h-12 w-full rounded-lg bg-brand px-4 py-3 font-semibold text-white hover:bg-brand-hover disabled:opacity-50">{pending ? "Registrando..." : "Registrar pedido"}</button>
        {result && ("error" in result ? <p role="alert" className="mt-3 rounded-lg bg-danger-soft p-3 text-sm text-danger">{result.error}</p> : <output className="mt-3 block rounded-lg bg-success-soft p-3 text-sm text-success">Pedido registrado. <Link href="/dashboard/orders" className="font-semibold underline">Consultar pedidos</Link></output>)}
      </section>
    </div>
  );
}

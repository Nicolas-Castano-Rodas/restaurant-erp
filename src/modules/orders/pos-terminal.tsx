"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FoodIcon, TableIcon } from "@/components/workspace/operation-icons";
import { submitOrder } from "./actions";
import { toMinor } from "./money";

type Variant = { id: string; name: string; price: string };
type Product = { id: string; name: string; category: string; description: string | null; price: string; variants: Variant[] };
type CartLine = { key: string; productId: string; variantId: string | null; name: string; price: string; quantity: number };
type Channel = "DINE_IN" | "TAKEAWAY" | "DELIVERY";
const channels: { id: Channel; name: string }[] = [{ id: "DINE_IN", name: "En mesa" }, { id: "TAKEAWAY", name: "Para llevar" }, { id: "DELIVERY", name: "Domicilio" }];

export function PosTerminal({ products, tables, currency, scope, initialRequestId, initialTableId, customers, initialCustomerId }: { products: Product[]; tables: { id: string; name: string; capacity: number; active: boolean; occupied: boolean }[]; currency: string; scope: string; initialRequestId: string; initialTableId: string; customers: { id: string; name: string; phone: string | null }[]; initialCustomerId: string }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [channel, setChannel] = useState<Channel>("DINE_IN");
  const [tableId, setTableId] = useState(initialTableId);
  const selectedTable = tables.find((table) => table.id === tableId && table.active && !table.occupied);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [note, setNote] = useState("");
  const [customerId, setCustomerId] = useState(initialCustomerId);
  const [customerSearch, setCustomerSearch] = useState("");
  const [recipient, setRecipient] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [instructions, setInstructions] = useState("");
  const [fee, setFee] = useState("0");
  const validFee = /^\d{1,10}(\.\d{1,2})?$/.test(fee);
  const deliveryValid = channel !== "DELIVERY" || (recipient.trim().length > 0 && phone.trim().length >= 5 && address.trim().length >= 5 && validFee);
  const deliveryFee = channel === "DELIVERY" && validFee ? toMinor(fee) : 0n;
  const matchingCustomers = customers.filter((customer) => customer.id === customerId || `${customer.name} ${customer.phone ?? ""}`.toLowerCase().includes(customerSearch.trim().toLowerCase()));
  const [requestId, setRequestId] = useState(initialRequestId);
  const [result, setResult] = useState<{ id: string; nextRequestId: string } | { error: string } | null>(null);
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
    if (!cart.length || (channel === "DINE_IN" && !selectedTable) || !deliveryValid || pending) return;
    setResult(null);
    startTransition(async () => {
      try {
        const response = await submitOrder(scope, { requestId, channel, tableId: channel === "DINE_IN" ? tableId : null, note, customerId: customerId || null, ...(channel === "DELIVERY" ? { delivery: { recipient, phone, address, instructions, fee } } : {}), items: cart.map(({ productId, variantId, quantity }) => ({ productId, variantId, quantity })) });
        setResult(response);
        if ("id" in response) {
          setCart([]);
          setNote("");
          setCustomerId("");
          setCustomerSearch("");
          setRecipient(""); setPhone(""); setAddress(""); setInstructions(""); setFee("0");
          setTableId("");
          setRequestId(response.nextRequestId);
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
        <div className="my-4 flex flex-wrap gap-2">
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
          {channel === "DINE_IN" && <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-muted">Selecciona una mesa</p>
              <button type="button" onClick={() => router.refresh()} className="text-xs font-semibold text-brand underline">Actualizar</button>
            </div>
            <div className="grid max-h-72 grid-cols-2 gap-2 overflow-auto">
              {tables.map((table) => {
                const disabled = !table.active || table.occupied;
                return <button key={table.id} type="button" disabled={disabled} aria-pressed={selectedTable?.id === table.id} onClick={() => setTableId(table.id)} className={selectedTable?.id === table.id ? "flex flex-col items-center rounded-xl border-2 border-brand bg-brand-soft p-2 text-center" : "flex flex-col items-center rounded-xl border border-line bg-surface p-2 text-center disabled:cursor-not-allowed disabled:bg-neutral-soft"}>
                  <TableIcon name={table.name} capacity={table.capacity} active={table.active} occupied={table.occupied} />
                  <span className="text-sm font-semibold">{table.name}</span>
                  <span className={table.occupied ? "text-xs text-warning" : table.active ? "text-xs text-success" : "text-xs text-muted"}>{table.occupied ? "Ocupada" : table.active ? "Disponible" : "Inactiva"}</span>
                </button>;
              })}
            </div>
            {!tables.length && <p className="rounded-lg bg-warning-soft p-3 text-xs text-warning">No tienes mesas registradas. <Link href="/dashboard/tables" className="font-semibold underline">Crear una mesa</Link>.</p>}
            {tables.length > 0 && !tables.some((table) => table.active && !table.occupied) && <p className="rounded-lg bg-warning-soft p-3 text-xs text-warning">No hay mesas libres. Revisa los pedidos abiertos o habilita una mesa. <Link href="/dashboard/tables" className="font-semibold underline">Administrar mesas</Link>.</p>}
            {selectedTable && <p className="rounded-lg bg-success-soft p-2 text-xs font-semibold text-success">Mesa seleccionada: {selectedTable.name}</p>}
          </div>}
          <div className="rounded-xl border border-line bg-canvas p-3 space-y-2">
            <div className="flex items-center justify-between gap-2"><p className="text-sm font-semibold">Cliente (opcional)</p><Link href="/dashboard/customers" className="text-xs font-semibold text-brand underline">Gestionar</Link></div>
            <label className="block text-xs text-muted">Buscar entre los clientes recientes<input value={customerSearch} onChange={(event) => setCustomerSearch(event.target.value)} placeholder="Nombre o teléfono" className="mt-2 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm" /></label>
            <label className="block text-xs text-muted">Cliente del pedido<select value={customerId} onChange={(event) => setCustomerId(event.target.value)} className="mt-2 w-full rounded-lg border border-line bg-surface px-2 py-3 text-sm"><option value="">Consumidor final / sin registro</option>{matchingCustomers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}{customer.phone ? ` · ${customer.phone}` : ""}</option>)}</select></label>
            {customerSearch && !matchingCustomers.length && <p className="text-xs text-muted">Sin coincidencias. Busca en el módulo Clientes.</p>}
          </div>
          {channel === "DELIVERY" && <div className="space-y-3 rounded-xl border border-line bg-canvas p-3">
            <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold">Datos de entrega</h3><button type="button" disabled={!customerId} onClick={() => { const selected = customers.find((entry) => entry.id === customerId); if (selected) { setRecipient(selected.name); setPhone(selected.phone ?? ""); } }} className="text-xs font-semibold text-brand underline disabled:opacity-50">Usar datos del cliente</button></div>
            <label className="block text-xs text-muted">Destinatario<input value={recipient} onChange={(event) => setRecipient(event.target.value)} maxLength={120} className="mt-2 w-full rounded-lg border border-line bg-surface p-2 text-sm" /></label>
            <label className="block text-xs text-muted">Teléfono<input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} maxLength={40} className="mt-2 w-full rounded-lg border border-line bg-surface p-2 text-sm" /></label>
            <label className="block text-xs text-muted">Dirección completa y barrio<input value={address} onChange={(event) => setAddress(event.target.value)} maxLength={250} className="mt-2 w-full rounded-lg border border-line bg-surface p-2 text-sm" /></label>
            <label className="block text-xs text-muted">Indicaciones de entrega (opcional)<textarea value={instructions} onChange={(event) => setInstructions(event.target.value)} maxLength={500} rows={2} className="mt-2 w-full rounded-lg border border-line bg-surface p-2 text-sm" /></label>
            <label className="block text-xs text-muted">Costo de envío ({currency})<input type="number" min="0" step="0.01" max="9999999999.99" value={fee} onChange={(event) => setFee(event.target.value)} className="mt-2 w-full rounded-lg border border-line bg-surface p-2 text-sm" /></label>
            {!deliveryValid && <p className="text-xs text-warning">Completa los datos de entrega y un costo válido.</p>}
          </div>}
          <div className="divide-y divide-line border-y border-line">
            {cart.map((line) => <div key={line.key} className="py-3"><p className="text-sm font-semibold">{line.name}</p><div className="mt-2 flex items-center justify-between gap-2"><div className="flex items-center gap-2"><button type="button" aria-label={`Reducir ${line.name}`} onClick={() => changeQuantity(line.key, -1)} className="size-11 rounded-lg border border-line">−</button><span className="min-w-5 text-center text-sm tabular-nums">{line.quantity}</span><button type="button" aria-label={`Aumentar ${line.name}`} onClick={() => changeQuantity(line.key, 1)} className="size-11 rounded-lg border border-line">+</button></div><span className="text-sm font-semibold tabular-nums">{money(toMinor(line.price) * BigInt(line.quantity))}</span></div></div>)}
            {!cart.length && <p className="py-5 text-sm text-muted">Agrega productos para comenzar.</p>}
          </div>
          <label className="block text-xs text-muted">Observaciones<textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} rows={2} className="mt-2 w-full rounded-lg border border-line p-2 text-sm" /></label>
        </fieldset>
        {channel === "DELIVERY" && <div className="mt-3 space-y-1 text-sm text-muted"><p className="flex justify-between"><span>Productos</span><span>{money(total)}</span></p><p className="flex justify-between"><span>Envío</span><span>{money(deliveryFee)}</span></p></div>}
        <div className="mt-4 flex items-center justify-between border-t border-line pt-4"><span className="font-semibold">Total estimado</span><span className="text-xl font-bold tabular-nums">{money(total + deliveryFee)}</span></div>
        <p className="mt-2 text-xs text-muted">El servidor valida precios y disponibilidad. Sin impuestos ni descuentos adicionales en esta versión.</p>
        <button type="button" onClick={save} disabled={pending || !cart.length || !deliveryValid || (channel === "DINE_IN" && !selectedTable)} className="mt-4 min-h-12 w-full rounded-lg bg-brand px-4 py-3 font-semibold text-white hover:bg-brand-hover disabled:opacity-50">{pending ? "Registrando..." : "Registrar pedido"}</button>
        {result && ("error" in result ? <p role="alert" className="mt-3 rounded-lg bg-danger-soft p-3 text-sm text-danger">{result.error}</p> : <output className="mt-3 block rounded-lg bg-success-soft p-3 text-sm text-success">Pedido registrado. <Link href="/dashboard/orders" className="font-semibold underline">Consultar pedidos</Link></output>)}
      </section>
    </div>
  );
}

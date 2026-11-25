export const reportTypes = [
  { id: "sales", title: "Ventas y pagos", description: "Ingresos diarios, métodos de pago y detalle de pedidos cobrados." },
  { id: "inventory", title: "Inventario y movimientos", description: "Existencias actuales, mínimos, costos y movimientos del período." },
  { id: "purchases", title: "Compras y proveedores", description: "Compras creadas en el período, estado y detalle de ingredientes." },
  { id: "cash", title: "Caja y conciliación", description: "Turnos cerrados en el período, efectivo y diferencias." },
  { id: "products", title: "Productos y costos", description: "Ranking de ventas, costos históricos y diferencia parcial." },
] as const;
export type ReportType = typeof reportTypes[number]["id"];
export type Column = { label: string; numeric?: boolean };
export type Row = (string | number | null)[];
export type ReportTable = { title: string; columns: Column[]; rows: Row[] };
export type Report = { title: string; organization: string; branch: string; from: string; to: string; currency: string; timeZone: string; generatedAt: string; notes: string[]; tables: ReportTable[] };
export const MAX_ROWS = 2000;
export function isReportType(value: string | null): value is ReportType {
  return reportTypes.some((type) => type.id === value);
}

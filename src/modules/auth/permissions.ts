export const permissions = [
  { code: "orders.manage", description: "Gestionar pedidos y mesas" },
  { code: "kitchen.manage", description: "Gestionar comandas de cocina" },
  { code: "inventory.manage", description: "Gestionar inventario" },
  { code: "cash.manage", description: "Gestionar caja" },
  { code: "catalog.manage", description: "Gestionar catálogo" },
  { code: "team.manage", description: "Gestionar equipo y organización" },
  { code: "reports.read", description: "Consultar reportes" },
] as const;

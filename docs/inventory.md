# Inventario

Ruta /dashboard/inventory, permiso inventory.manage. Ingredientes compartidos en una organización y saldos independientes por sucursal. Unidades: kg, g, L, ml y unidades enteras. No hay conversiones automáticas. El stock comienza en cero; configurar mínimo y registrar entrada inicial. Entradas, salidas y mermas requieren motivo; se conserva usuario, fecha, cantidad y saldo posterior. El saldo no se modifica directamente desde el formulario.

Cantidades DECIMAL(16,3), cálculos en milésimas enteras, transacciones serializables y restricciones de saldo no negativo. Identificador de solicitud por sucursal evita duplicar movimientos idénticos; ante conflictos concurrentes, actualizar y verificar historial antes de repetir. El mínimo es configurable por sucursal. Stock agotado = cero; stock bajo = positivo e igual o inferior al mínimo. Los ingredientes en otras sucursales necesitan configuración local.

Aplicar npm run db:deploy. CI comprueba precisión, idempotencia, aislamiento de sucursales, límites de stock y unidades enteras. Pendientes: transferencias de existencias y auditoría ampliada.

Las recetas y el consumo de cocina se gestionan según [Recetas y consumo](recipes.md). El costo unitario es independiente por sucursal, configurable manualmente y actualizado con el último precio de una compra recibida. Los movimientos automáticos son salidas vinculadas al pedido.

Las recepciones generan entradas automáticamente. Consultar [Compras y proveedores](purchases.md).

# Punto de venta y pedidos

Rutas /dashboard/pos y /dashboard/orders, protegidas con orders.manage. Catálogo real filtrado por disponibilidad, búsqueda y categorías, selección de variante, cantidades, carrito y observaciones. Canales mesa, para llevar y domicilio; los datos de reparto se incorporarán después.

El servidor ignora precios y totales del navegador, valida contexto, productos, variantes, capacidad administrativa de la mesa y disponibilidad. Guarda precios y nombres históricos, calcula importes exactos en unidades menores enteras, y crea pedido y líneas en una transacción serializable. Identificador idempotente por sucursal y hash del contenido. Índice único parcial evita dos pedidos abiertos en una mesa. No eliminar ese índice al generar migraciones futuras.

Los pedidos quedan abiertos hasta cobrarse o cancelarse desde caja. El selector muestra mesas disponibles, ocupadas e inactivas; solo permite seleccionar una libre. La vista de mesas ofrece acceso directo al POS. No se aplican impuestos, descuentos, edición de pedidos abiertos ni emisión fiscal. Los precios son los registrados en el catálogo; no se garantiza cumplimiento fiscal. El total estimado se recalcula en el servidor. Consultar docs/cash.md para las limitaciones de cobro.

Actualizar la base local mediante npm run db:deploy, sin reset. Prueba de integración en CI cubre aislamiento, precios históricos, idempotencia, mesa ocupada y disponibilidad.

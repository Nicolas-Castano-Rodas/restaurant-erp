# Caja y pagos

Ruta /dashboard/cash (cash.manage). Una caja abierta por sucursal, con base inicial, registro de pago único completo por pedido, efectivo recibido y cambio, tarjeta o transferencia como registro manual, cierre con efectivo contado y diferencia. No conecta bancos ni pasarelas. Cobrar exige pedido abierto y entregado, y caja abierta en la misma sucursal y moneda. El servidor obtiene el total del pedido; la transacción registra el pago y cierra el pedido conjuntamente. Repetir el mismo cobro devuelve el pago existente; la restricción única impide duplicados. Cancelación de pedidos abiertos sin pago exige motivo y registra responsable y fecha. Ambas operaciones liberan la mesa. El comprobante en el historial es interno, no fiscal.

El efectivo esperado es base inicial más pagos en efectivo (netos de cambio); tarjeta y transferencia no aumentan el efectivo. Las transacciones serializables y los índices parciales protegen la concurrencia. Conservar los índices parciales en futuras migraciones. No se permiten pagos parciales, divididos, devoluciones, reembolsos ni movimientos manuales de efectivo todavía; tampoco impuestos o descuentos. No utilizar como caja productiva hasta completar controles y pruebas.

Aplicar con npm run db:deploy. Las pruebas de CI verifican autorización, cambio, duplicados, conciliación, cancelación y liberación de mesas.

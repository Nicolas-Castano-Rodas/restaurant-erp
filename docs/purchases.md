# Compras y proveedores

Ruta /dashboard/purchases, permiso inventory.manage. Proveedores compartidos por organización, con nombre, identificación, teléfono, correo y estado. Compras por sucursal: borrador, recibida o cancelada. Referencia y observaciones opcionales; nombres de proveedor e ingrediente, unidad, cantidad y costo quedan guardados en la compra. Cada ingrediente tiene una línea, que puede actualizarse o eliminarse mientras el borrador esté abierto. Los importes se redondean al centavo por línea con aritmética entera y el total se recalcula en servidor.

La recepción completa actualiza existencias y costo unitario de la sucursal en una transacción serializable. Si no existía saldo local, lo crea con mínimo cero. Guarda una entrada por ingrediente, vinculada a la compra, usuario y costo. Si falla una línea, se revierte todo. Repetir la recepción no duplica stock; las compras cerradas no se editan ni se cancelan. La cancelación del borrador no cambia stock. El costo de referencia es el último precio de compra recibido, no un promedio ponderado ni un método contable de valoración; los costos de recetas se actualizan con ese valor. La moneda se toma de la organización. Los costos son ingresados por unidad de medida registrada.

No se implementan recepciones parciales, devoluciones, cuentas por pagar, pagos a proveedores, impuestos, gastos de transporte ni facturación electrónica. El registro no constituye documento fiscal. El historial muestra las últimas 50 compras cerradas.

Aplicar npm run db:deploy. CI verifica importes, aislamiento, cancelación, recepción atómica y prevención de duplicados.

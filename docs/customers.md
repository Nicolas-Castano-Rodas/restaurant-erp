# Clientes

Ruta /dashboard/customers, permiso orders.manage. Directorio por sucursal (nombre, teléfono y correo opcionales, estado activo). El pedido puede vincular un cliente activo de la sucursal o permanecer anónimo. El POS muestra hasta 100 clientes activos recientes y permite buscar entre ellos. Desde el directorio se puede buscar cualquier cliente y abrir el POS con ese cliente preseleccionado. Se comprueba el alcance y estado en servidor; los pedidos antiguos no requieren migración de datos. El identificador opcional se incluye en el hash idempotente solo si está presente, para conservar compatibilidad con solicitudes anteriores.

Historial de hasta 50 pedidos por cliente, con productos y estado. Los indicadores agregan todos los pedidos COMPLETED que tienen pago, por moneda; no incluyen abiertos o cancelados. Se puede desactivar un cliente y conservar el historial. Se muestra el nombre actual del cliente, no se duplican sus contactos en el pedido. No se implementan domicilios, fidelización, campañas, eliminación/anonymización ni automatización de derechos de datos en esta etapa. El operador debe obtener autorización aplicable y limitar la recolección; no utilizar datos reales en demos.

Aplicar npm run db:deploy. La prueba orders:test cubre el vínculo, clientes de otra organización, clientes inactivos y pedidos anónimos.

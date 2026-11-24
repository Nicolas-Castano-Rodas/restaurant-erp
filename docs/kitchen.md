# Cocina (KDS)

Ruta /dashboard/kitchen, permiso kitchen.manage. Muestra comandas abiertas de la sucursal actual, con productos, variantes, cantidades, observaciones y minutos desde creación. Actualización periódica cada 15 segundos cuando la pestaña está visible; también manual. No es WebSocket.

Transiciones permitidas: PENDING -> PREPARING -> READY -> SERVED. Cada transición registra su fecha, exige autorización y comprueba el estado anterior para evitar saltos o doble avance. Entregado no significa pagado ni cerrado. La mesa permanece ocupada hasta el cierre comercial. Los pedidos anteriores a la migración se inicializan en PENDING.

Pruebas de integración cubren aislamiento por sucursal, transiciones válidas, estado obsoleto y separación del estado comercial. Caja inicial gestiona cobros y cancelaciones de pedidos abiertos; impuestos y devoluciones siguen pendientes.

Iniciar preparación descuenta ingredientes según las recetas vigentes en la misma transacción. Si faltan existencias, la comanda permanece pendiente. Consultar [Recetas y consumo](recipes.md).

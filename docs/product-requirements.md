# Requisitos del producto

Estado: propuesta inicial | Mercado inicial: Colombia | Primer caso previsto: EL FAMOSO

## Objetivos
Centralizar pedidos, preparación, cobro y control operativo. Permitir que cada organización administre sus sucursales sin acceder a los datos de otras. Diseñar una experiencia usable en computadores y tabletas, con adaptación móvil.

## Usuarios y responsabilidades
- Propietario: configuración, sucursales y supervisión.
- Administrador: gestión del catálogo, usuarios y permisos.
- Mesero: mesas y toma de pedidos.
- Cajero: cobros, turnos y cierres.
- Cocina: preparación y actualización de comandas.
- Inventario: existencias, recetas y movimientos.
- Repartidor: pedidos asignados y estado de entrega.
Los permisos se asignarán explícitamente por rol y alcance; el servidor verificará cada operación.

## MVP
| ID | Requisito | Criterio de aceptación |
| --- | --- | --- |
| R01 | Autenticación y permisos | Sesiones válidas, autorización del servidor, cierre de sesión |
| R02 | Organización y sucursales | Un usuario no puede leer ni modificar registros de otra organización |
| R03 | Catálogo | Crear categorías, productos, variantes, precios y disponibilidad |
| R04 | Mesas y POS | Crear pedidos de mesa, recogida o domicilio con totales calculados por el servidor |
| R05 | Cocina | Comandas visibles por sucursal, estados con transiciones válidas |
| R06 | Caja | Registrar pagos, devoluciones autorizadas y cierre de turno sin duplicados |
| R07 | Inventario básico | Registrar entradas, salidas y ajustes trazables |
| R08 | Reportes | Ventas y pedidos por sucursal y periodo, con permisos |
| R09 | Auditoría | Registrar actor, acción, entidad y momento de operaciones sensibles |

## Reglas de negocio
- Moneda inicial COP; montos exactos sin aritmética binaria de punto flotante.
- Los pedidos conservan nombres, precios e impuestos históricos de sus líneas.
- Los precios y totales enviados por clientes no son fuente de verdad.
- Los cambios que afecten pagos, pedidos o existencias deben ser transaccionales e idempotentes cuando corresponda.
- Configuración de zona horaria por organización o sucursal; fechas persistidas en UTC.
- Separar estado de pedido, preparación y pago.

## Fuera del MVP
Contabilidad completa, nómina, integraciones de pago en línea y emisión fiscal oficial. La facturación electrónica colombiana se incorporará tras verificar los requisitos aplicables y el proveedor autorizado; un comprobante interno no equivale a una factura electrónica válida.

## Requisitos no funcionales
Seguridad por defecto, accesibilidad, diseño responsive, registros sin secretos, copias de seguridad verificables y pruebas automatizadas de aislamiento entre organizaciones.

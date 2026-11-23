# Catálogo y mesas

Rutas protegidas: /dashboard/catalog (catalog.manage), /dashboard/tables (orders.manage). Ambas exigen una sesión y una sucursal seleccionada. Los formularios permiten crear, editar y desactivar registros; no eliminan historiales.

- Catálogo compartido dentro de cada organización; categorías, productos y variantes.
- Precio de variante completo, no recargo; DECIMAL(12,2), no negativo.
- Disponibilidad comercial exige categoría activa, producto activo y disponible; variantes activas.
- Mesas pertenecen a una sucursal; capacidad de 1 a 100. Habilitada no significa libre: la ocupación se calculará con pedidos abiertos.
- GET /api/catalog requiere sesión, contexto y permiso de catálogo o pedidos; devuelve solo el catálogo vendible de la organización, con precios decimales serializados como texto.
- La organización y sucursal se obtienen del servidor; los identificadores del formulario no conceden acceso. Las claves foráneas compuestas rechazan relaciones cruzadas.

Pendientes: imágenes de productos, disponibilidad por sucursal, permisos más granulares para mesas, pedidos, carrito y ocupación. No existen todavía cobros ni cálculo fiscal.

CI comprueba las relaciones cruzadas, disponibilidad, precisión de precios y rutas sin sesión.

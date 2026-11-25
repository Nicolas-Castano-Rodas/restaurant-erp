# Restaurant ERP

**Plataforma de gestión gastronómica multiempresa y multisucursal | Multi-tenant restaurant management platform**

> MVP en preparación para piloto. Código de módulos principales, pruebas y preparación de despliegue publicado. No hay despliegue comercial confirmado. Consultar [CI](https://github.com/Nicolas-Castano-Rodas/restaurant-erp/actions) y [hoja de ruta](docs/roadmap.md) para el estado verificado.

## Visión

Centralizar la operación de restaurantes en un espacio de trabajo. Primer caso de uso previsto: EL FAMOSO, Colombia, sin afirmar adopción efectiva. Desarrollado bajo EL IMPERIO — Los Reyes del Software.

## Funcionalidades del MVP

| Área | Funcionalidades implementadas |
| --- | --- |
| POS y mesas | Pedidos en mesa, para llevar y domicilio, catálogo y variantes |
| Cocina | Comandas, preparación y entrega a servicio o despacho |
| Caja | Apertura, cobro registrado, cierre, conciliación y comprobante interno |
| Inventario | Stock, mínimos, movimientos, recetas y consumo automático |
| Compras | Proveedores, órdenes y recepción completa |
| Clientes y domicilios | Registro, historial, asignación de repartidor y estados |
| Analítica y reportes | Ventas, productos, costos parciales, PDF y Excel |
| Administración | Organizaciones, sucursales, usuarios, roles y permisos |
| Seguridad | Sesiones, límites de intentos, actividad personal y bitácora |

Limitaciones: no procesa pagos bancarios, no emite factura electrónica, no calcula utilidad neta contable, no tiene GPS en vivo, MFA ni recuperación de contraseña. No se declara cumplimiento normativo o certificación.

## Arquitectura

Next.js 16 / React 19 / TypeScript / Tailwind CSS 4 / Biome / PostgreSQL / Prisma ORM. Server Actions y Route Handlers, autorización de servidor, claves compuestas multiempresa y transacciones. ExcelJS y PDF-LIB para exportaciones. Playwright y axe-core para pruebas de navegador.

## Inicio local

Requisitos: Git, Node.js 24, npm y PostgreSQL. Crear una base dedicada nueva, copiar .env.example a .env y configurar DATABASE_URL de forma privada.

```bash
git clone https://github.com/Nicolas-Castano-Rodas/restaurant-erp.git
cd restaurant-erp
npm ci
npm run db:deploy
npm run auth:provision
npm run dev
```

Visitar http://localhost:3000 y usar la cuenta creada. No existen credenciales predeterminadas. Para una actualización detener el servidor, ejecutar git pull --ff-only origin main, npm ci si cambian dependencias, npm run db:deploy si hay nuevas migraciones y npm run dev. No borrar .next de rutina.

## Calidad y despliegue

```bash
npm run ui:contrast
npm run lint
npm run typecheck
npm run build
```

Pruebas de integración y E2E únicamente sobre bases desechables. CI comprueba migraciones, servicios, HTTP y navegador. El lockfile está versionado y npm ci pasó en CI. La validación funcional de e7d786d pasó 11 suites de integración, 21 comprobaciones de contraste y 2 pruebas Chromium. El candidato d028957 superó auditoría (0 vulnerabilidades conocidas), navegador, contenedor y restauración sintética. Los manifiestos se incorporaron en ab2cecc y su auditoría obligatoria también pasó. Consultar CI del commit actual para la validación integral. Consultar guías de [pruebas](docs/testing.md), [seguridad](docs/security.md), [rendimiento](docs/performance.md) y [despliegue](docs/deployment.md).

- /api/health: disponibilidad del proceso.
- /api/ready: conexión simple a PostgreSQL.
- Demo local: [datos ficticios y recorrido](docs/demo.md).
- Lanzamiento: [borradores y guiones](docs/launch.md).

## Documentación

[Requisitos](docs/product-requirements.md) · [Arquitectura](docs/architecture.md) · [Hoja de ruta](docs/roadmap.md) · [Diseño](docs/design-system.md) · [Base de datos](docs/database.md) · [Autenticación](docs/authentication.md)

[Catálogo](docs/catalog.md) · [POS](docs/orders.md) · [Cocina](docs/kitchen.md) · [Caja](docs/cash.md) · [Inventario](docs/inventory.md) · [Recetas](docs/recipes.md) · [Compras](docs/purchases.md) · [Clientes](docs/customers.md) · [Domicilios](docs/deliveries.md) · [Analítica](docs/analytics.md) · [Reportes](docs/reports.md) · [Equipo](docs/team.md) · [Auditoría](docs/audit.md)

## English overview

Restaurant ERP is a multi-tenant, multi-branch restaurant management MVP being prepared for a pilot. It connects point of sale, kitchen, cash management, inventory and recipes, purchasing, customer and delivery workflows, reporting, and role-based administration. It emphasizes server-side authorization, transactional integrity, historical costs and auditability. The repository includes integration and browser tests, an isolated local demo seed and deployment instructions. Production hosting and acceptance testing are not yet confirmed. Payments are recorded manually; electronic invoicing, live GPS, MFA and password recovery are outside this initial scope.

## Autoría

**Nicolás Castaño Rodas** — EL IMPERIO · Los Reyes del Software

[GitHub](https://github.com/Nicolas-Castano-Rodas) · [LinkedIn](https://www.linkedin.com/in/nicolas-castano-rodas-22a09534b/)

© 2026 Nicolás Castaño Rodas. Todos los derechos reservados. No se concede una licencia de uso, distribución o comercialización del código por el hecho de que este repositorio sea público.

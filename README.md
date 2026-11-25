# Restaurant ERP

**Plataforma de gestión gastronómica multiempresa y multisucursal | Multi-tenant restaurant management platform**

> Estado: base de aplicación, identidad multiempresa y acceso inicial publicados; autenticación inicial validada; catálogo y mesas validados; POS y cocina iniciales validados; caja inicial validada; inventario manual validado; recetas y consumo automático validados; compras y clientes validados; domicilios y analítica validados; reportes XLSX/PDF pasan integración; administración de equipo y cuenta publicadas, CI pendiente. Las funcionalidades de negocio descritas son objetivos de desarrollo.

## Visión

Restaurant ERP busca centralizar la operación de restaurantes, desde la toma de pedidos hasta el control de inventario y el análisis de ventas. El primer caso de uso previsto es EL FAMOSO, en Colombia, con una arquitectura reutilizable para otros negocios.

## Alcance previsto

| Módulo | Objetivo |
| --- | --- |
| POS | Pedidos en mesa, para llevar y a domicilio |
| KDS | Cola de preparación y estados de cocina |
| Caja | Turnos, pagos, cierres y conciliación |
| Catálogo | Menús, categorías, variantes y precios |
| Inventario | Ingredientes, recetas, movimientos y alertas |
| Compras | Proveedores y recepción de mercancía |
| Clientes | Historial y gestión de domicilios |
| Administración | Organizaciones, sucursales, usuarios y permisos |
| Analítica | Indicadores operativos y comerciales |
| Facturación | Integración futura con proveedores autorizados |

## Stack

Next.js 16, React 19, TypeScript 5.9, Tailwind CSS 4, Biome, PostgreSQL y Prisma ORM. Zod y shadcn/ui se incorporarán por fases.

## Desarrollo local

Requisitos: Git, Node.js 24 y npm.

```bash
git clone https://github.com/Nicolas-Castano-Rodas/restaurant-erp.git
cd restaurant-erp
npm install
# Configurar .env a partir de .env.example con una base nueva.
npm run db:validate
npm run db:generate
npm run db:deploy
npm run dev
```

El cliente de Prisma se genera automáticamente después de instalar dependencias y antes de compilar o comprobar tipos. En desarrollo se regenera si falta el cliente o cambia el esquema, la configuración o la versión de Prisma. No requiere una conexión activa para generarlo. Para migrar y usar la aplicación sí debes configurar DATABASE_URL. Si falta el cliente, ejecuta npm run db:generate.

Para ingresar a /login, crear el primer propietario mediante el comando interactivo npm run auth:provision siguiendo la guía de autenticación. No requiere variables OWNER_ en .env. No existen credenciales predeterminadas.

Para actualizar: detener Next.js, ejecutar git pull --ff-only origin main, npm install si cambian las dependencias, npm run db:deploy si hay migraciones y npm run dev. No borrar .next de rutina. Solo ante un problema de caché, detener el servidor y ejecutar npm run dev:clean. Si Windows presenta bloqueos de archivos bajo OneDrive, considerar una carpeta local no sincronizada.

Abrir http://localhost:3000. El endpoint /api/health comprueba únicamente la disponibilidad del proceso web; no comprueba la conexión a la base de datos. Consultar la guía de base de datos para configurar PostgreSQL.

```bash
npm run lint
npm run typecheck
npm run build
```

El archivo package-lock.json debe generarse mediante npm y guardarse en Git antes de considerar reproducible la instalación. Después se utilizará npm ci.

## Documentación

- [Requisitos del producto](docs/product-requirements.md)
- [Arquitectura técnica](docs/architecture.md)
- [Hoja de ruta y lanzamiento](docs/roadmap.md)
- [Sistema de diseño](docs/design-system.md)
- [Base de datos multiempresa](docs/database.md)
- [Autenticación y aprovisionamiento inicial](docs/authentication.md)
- [Catálogo y mesas](docs/catalog.md)
- [Punto de venta y pedidos](docs/orders.md)
- [Cocina](docs/kitchen.md)
- [Caja y pagos](docs/cash.md)
- [Inventario](docs/inventory.md)
- [Recetas y consumo](docs/recipes.md)
- [Compras y proveedores](docs/purchases.md)
- [Clientes](docs/customers.md)
- [Domicilios](docs/deliveries.md)
- [Analítica](docs/analytics.md)

## English overview

Restaurant ERP is a planned multi-tenant, multi-branch platform for food-service businesses. Its initial scope covers point of sale, kitchen workflows, cash management, inventory and business analytics. The project prioritizes tenant isolation, transactional integrity, accessible interfaces and automated testing. Features will be marked as implemented only after verification.

## Autoría

**Nicolás Castaño Rodas** — EL IMPERIO · Los Reyes del Software  
[GitHub](https://github.com/Nicolas-Castano-Rodas) · [LinkedIn](https://www.linkedin.com/in/nicolas-castano-rodas-22a09534b/)

© 2026 Nicolás Castaño Rodas. Todos los derechos reservados. No se concede una licencia de uso, distribución o comercialización del código por el hecho de que este repositorio sea público.


Reportes empresariales: [documentación](docs/reports.md).

Administración: [usuarios, roles, sucursales y cuenta](docs/team.md).

Auditoría de operaciones: [documentación](docs/audit.md).

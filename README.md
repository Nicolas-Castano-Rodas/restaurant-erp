# Restaurant ERP

**Plataforma de gestión gastronómica multiempresa y multisucursal | Multi-tenant restaurant management platform**

> Estado: base de aplicación, identidad multiempresa y acceso inicial publicados; autenticación inicial validada; catálogo y mesas publicados, pendientes de CI. Las funcionalidades de negocio descritas son objetivos de desarrollo.

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

Para ingresar a /login, crear el primer propietario mediante el comando npm run auth:provision siguiendo la guía de autenticación. No existen credenciales predeterminadas.

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

## English overview

Restaurant ERP is a planned multi-tenant, multi-branch platform for food-service businesses. Its initial scope covers point of sale, kitchen workflows, cash management, inventory and business analytics. The project prioritizes tenant isolation, transactional integrity, accessible interfaces and automated testing. Features will be marked as implemented only after verification.

## Autoría

**Nicolás Castaño Rodas** — EL IMPERIO · Los Reyes del Software  
[GitHub](https://github.com/Nicolas-Castano-Rodas) · [LinkedIn](https://www.linkedin.com/in/nicolas-castano-rodas-22a09534b/)

© 2026 Nicolás Castaño Rodas. Todos los derechos reservados. No se concede una licencia de uso, distribución o comercialización del código por el hecho de que este repositorio sea público.

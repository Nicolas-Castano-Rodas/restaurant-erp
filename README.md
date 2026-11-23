# Restaurant ERP

**Plataforma de gestión gastronómica multiempresa y multisucursal | Multi-tenant restaurant management platform**

> Estado: planificación y arquitectura inicial. Las funcionalidades descritas son objetivos de desarrollo, no características disponibles todavía.

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
| Facturación | Integración futura con proveedores autorizados, según requisitos aplicables |

## Arquitectura propuesta

- Next.js, React y TypeScript.
- Tailwind CSS y shadcn/ui.
- PostgreSQL y Prisma ORM.
- Zod para validación de entradas.
- Biome, Vitest, Playwright y GitHub Actions.
- Monolito modular con límites de dominio y aislamiento por organización.

## Documentación

- [Requisitos del producto](docs/product-requirements.md)
- [Arquitectura técnica](docs/architecture.md)
- [Hoja de ruta y lanzamiento](docs/roadmap.md)

## Desarrollo local

La aplicación aún no ha sido inicializada. Los requisitos de entorno, las variables de configuración y los comandos reproducibles se documentarán al incorporar el código y el archivo de bloqueo de dependencias.

## English overview

Restaurant ERP is a planned multi-tenant, multi-branch platform for food-service businesses. Its initial scope covers point of sale, kitchen workflows, cash management, inventory and business analytics. The project prioritizes tenant isolation, transactional integrity, accessible interfaces and automated testing. Features will be marked as implemented only after verification.

## Autoría

**Nicolás Castaño Rodas** — EL IMPERIO · Los Reyes del Software  
[GitHub](https://github.com/Nicolas-Castano-Rodas) · [LinkedIn](https://www.linkedin.com/in/nicolas-castano-rodas-22a09534b/)

© 2026 Nicolás Castaño Rodas. Todos los derechos reservados. No se concede una licencia de uso, distribución o comercialización del código por el hecho de que este repositorio sea público.

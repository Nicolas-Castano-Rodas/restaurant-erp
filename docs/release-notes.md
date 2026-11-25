# Restaurant ERP — candidato a MVP

Versión prevista 0.1.0, sin tag ni publicación comercial hasta que se cumplan las puertas de salida. EL IMPERIO — Los Reyes del Software.

## Alcance
Gestión multiempresa y multisucursal, autenticación, roles, catálogo, POS, mesas, cocina, caja, inventario, recetas, compras, clientes, domicilios, analítica, reportes y bitácora. Seguridad inicial de sesiones y encabezados, ajustes responsive, pruebas de integración y suites de navegador incorporadas.

## Antes de etiquetar o publicar
- Revisar CI del commit final, incluidos E2E y auditoría de dependencias.
- Confirmar lockfile versionado y construcción reproducible.
- Aceptación funcional en demo aislada, comprobación manual de accesibilidad, carga y recuperación.
- Base gestionada separada, TLS, copias restaurables, políticas de datos, monitorización, dominio y despliegue verificados.
- Capturas reales y revisión de textos de lanzamiento; no anunciar métricas o clientes sin evidencia.

## Limitaciones
No incluye facturación electrónica, procesamiento bancario, reembolsos, GPS en vivo, MFA ni recuperación de contraseña. No es una solución fiscal o contable certificada. La demo y las pruebas no se ejecutan contra datos reales.

## Validación de referencia
[e7d786d, CI 45688669694](https://github.com/Nicolas-Castano-Rodas/restaurant-erp/actions/runs/45688669694): instalación bloqueada por lockfile, integración, accesibilidad parcial, lint, tipos, build, HTTP y navegador superados. El informe informativo detectó vulnerabilidades altas; el candidato no está aprobado para publicación comercial. Los controles adicionales de dependencias, imagen y restauración se verifican en nuevas ejecuciones.

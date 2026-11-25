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

## Actualización de dependencias validada
La rama candidata d028957 (CI 45690165319) pasó todas las pruebas, contenedor y restauración y npm audit informó 0 vulnerabilidades conocidas. Los manifiestos actualizados se incorporaron a main en ab2cecc: Prisma 7.10.1, effect 3.22.5, uuid 11.1.1, deepmerge-ts 8.0.2 y mysql2 3.24.4. El job Release security gate de CI 45693737644 pasó con 0 vulnerabilidades; el resto de su ejecución estaba en curso al registrar esta actualización. Mantener la auditoría bloqueante y revisar los overrides cuando sus consumidores actualicen sus rangos. El resultado no certifica la seguridad completa ni garantiza ausencia de hallazgos futuros.

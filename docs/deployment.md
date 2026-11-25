# Preparación para producción (8.7 y 9.1)

Estado: instrucciones y configuración de despliegue preparadas; no hay servicio de producción confirmado. No publicar la aplicación como servicio listo para uso comercial antes de superar los controles.

## Condiciones previas
1. CI verde en el commit exacto, incluido navegador. Revisar npm audit y resolver vulnerabilidades altas/críticas aplicables. El lockfile ya está versionado y npm ci pasó en CI. Mantenerlo actualizado con cada cambio de dependencias. No utilizar npm audit fix --force indiscriminadamente.
2. PostgreSQL gestionado y separado por entorno: desarrollo, pruebas, demo y producción. Acceso limitado a red/identidad autorizada, TLS validado, backup automático, restauración ensayada y credenciales de migración separadas de ejecución cuando sea posible. Configurar límites de conexiones adecuados al proveedor y carga.
3. Configurar DATABASE_URL en el gestor de secretos del entorno, nunca en el repositorio ni en mensajes. No configurar OWNER_PASSWORD, DEMO_PASSWORD o flags de pruebas en runtime. HSTS después de confirmar HTTPS. Ejecutar npm run production:check en el entorno de administración que tenga variables de destino; es una comprobación estática, no una certificación.
4. Antes de cada migración realizar backup y comprobar el destino. Ejecutar npm run db:deploy una sola vez con las credenciales de migración, desde una máquina autorizada. No usar migrate dev ni reset en producción. Los cambios de esquema no se revierten automáticamente.
5. Crear el propietario de una organización mediante npm run auth:provision en un entorno administrativo seguro. No crear usuarios predeterminados. No habilitar la demo en la misma base.

## Opción A: Vercel
Importar el repositorio restaurant-erp como proyecto Next.js, Node.js 24 si disponible, build npm run build, install npm ci. Configurar DATABASE_URL independiente para Preview y Production. Mantener previews protegidas. Elegir región cercana a PostgreSQL y revisar límites de duración/memoria de reportes. No ejecutar migraciones durante el build. Requerir CI verde y revisión antes de promover el build de producción. Configurar dominio y TLS en el proveedor. No compartir credenciales de preview con producción. Revisar logs y confirmar endpoints.

## Opción B: Node en servidor o contenedor
Dockerfile incluido; requiere lockfile revisado. Construir con docker build -t restaurant-erp:rc . (añadir --build-arg ENABLE_HSTS=true solo tras confirmar HTTPS) y ejecutar detrás de un proxy HTTPS con secretos inyectados por la plataforma, no mediante argumentos de build. El contenedor ejecuta Next.js como usuario no privilegiado. Migraciones y aprovisionamiento se ejecutan aparte desde el checkout administrativo. La imagen conserva dependencias necesarias para Next/Prisma; revisar tamaño y escanear antes de distribuir. CI añade construcción de imagen sin credenciales y prueba de readiness en el contenedor; su resultado nuevo aún está pendiente.

## Comprobaciones
- /api/health: proceso web vivo; /api/ready: consulta simple a PostgreSQL, 200 ready o 503 unavailable, sin exponer detalles. No confirma todas las migraciones ni permisos. Restringir frecuencia de sondeos en el proxy.
- /login: inicio y cierre de sesión, cookies Secure y HTTPS, permisos y sucursal correctos; revisar errores 5xx.
- En staging con datos ficticios: pedido, cocina, inventario, caja, reportes y auditoría; revisar móvil y escritorio.
- Operación: programar npm run auth:cleanup desde ejecución administrativa con la base correcta; definir retención de auditoría y eventos. Alertar ante errores y latencia, disponibilidad, espacio, conexiones y backups.
- Backups: usar snapshots gestionados o pg_dump en una terminal con credenciales seguras del proveedor. Restaurar en una base aislada, comprobar filas y flujos y documentar RPO/RTO reales. No restaurar sobre producción a ciegas.
- Rollback: volver al build probado anterior solo si es compatible con el esquema vigente. Si no lo es, preparar corrección hacia adelante o restauración coordinada, considerando escrituras posteriores al backup.

## Puertas comerciales pendientes
Lockfile y CI E2E verificados en e7d786d; pendientes corrección de vulnerabilidades altas, pruebas nuevas de contenedor y restauración sintética, restauración real del proveedor, HTTPS y dominio, prueba de carga, pruebas manuales de accesibilidad y compatibilidad, políticas de tratamiento de datos y términos, revisión jurídica y fiscal colombiana, prueba piloto y aceptación del restaurante. Facturación electrónica, reembolsos, pagos en línea, MFA y recuperación de contraseña no forman parte del MVP actual. No declarar cumplimiento DIAN, WCAG o seguridad certificada.

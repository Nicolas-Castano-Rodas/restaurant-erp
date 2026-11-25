# Seguridad de la aplicación

Sesiones opacas de 256 bits, hash SHA-256 en BD y cookie HttpOnly/SameSite=Lax, Secure en producción. Duración absoluta de 12 horas e inactividad aproximada de dos horas; se actualiza el último uso habitualmente cada cinco minutos. La migración inicializa lastSeenAt para sesiones existentes sin extender su vencimiento absoluto. El inicio de sesión revalida el hash bajo bloqueo de fila antes de emitir la sesión. El cambio de contraseña revoca todas las sesiones. No cancela solicitudes en ejecución.

Límites persistentes, ventanas fijas de 15 minutos: 8 intentos por correo válido, 300 globales y 5 cambios de contraseña por usuario. El límite global puede afectar otros usuarios; no sustituye el WAF ni la protección DDoS. auth:cleanup elimina sesiones vencidas/inactivas y buckets expirados; programar en producción.

Mi cuenta muestra los últimos 20 eventos propios: inicio correcto, rechazo para cuenta conocida, revocación explícita, cambio de contraseña y rechazo por contraseña incorrecta. No guarda IP, tokens, contraseñas ni correo en eventos. No registra todos los bloqueos ni intentos de cuentas inexistentes. Los eventos exitosos se escriben en la transacción correspondiente. Los propietarios no consultan actividad global de otros usuarios.

Encabezados contra framing, interpretación incorrecta MIME y filtración de referrer. CSP parcial: frame-ancestors, object-src, base-uri y form-action; no restringe scripts de forma estricta. Cámara, micrófono y geolocalización deshabilitados. HSTS opcional con ENABLE_HSTS=true exclusivamente tras verificar HTTPS y reconstruir. Next conserva sus comprobaciones de origen de Server Actions. Se solicita no almacenar rutas privadas en caché. CI añade npm audit informativo no bloqueante y pruebas HTTP de encabezados.

Pendientes: MFA, invitaciones, recuperación de contraseña, cambio inicial obligatorio, CSP estricta, límites en proxy, retención de eventos, revisión de dependencias y lockfile reproducible. No implica certificación ni cumplimiento normativo. Aplicar npm run db:deploy.

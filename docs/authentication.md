# Autenticación y acceso

## Implementación inicial

- Contraseñas con scrypt y sal aleatoria; mínimo 12 caracteres y máximo 256 bytes.
- Tokens opacos aleatorios de 256 bits; solo se guarda su SHA-256 en PostgreSQL.
- Cookies HttpOnly, SameSite=Lax, Secure en producción; sesiones de 12 horas y revocación al cerrar sesión.
- Las mutaciones de formularios utilizan Server Actions y las protecciones de origen de Next.js. No ampliar allowedOrigins sin revisar el despliegue.
- Límite fijo de 8 intentos por correo y 300 globales por 15 minutos, persistido en la base. Es una protección inicial; para producción añadir límites de red en un proxy confiable y protección de abuso sin bloquear globalmente a los usuarios.
- El contexto se comprueba contra membresías, organizaciones, sucursales activas y permisos actuales en cada lectura. Los identificadores de contexto en Session no otorgan autorización por sí solos.
- La selección de empresa y sucursal requiere una sesión y asignación válidas. El dashboard no ofrece operaciones de negocio todavía.
- Los errores de credenciales son genéricos. No se almacenan contraseñas o tokens en registros.

## Primer propietario (local)
Aplicar las migraciones y generar Prisma. Añadir temporalmente estas variables a .env (ignorado por Git), sustituyendo todos los ejemplos:

```dotenv
OWNER_EMAIL=correo@ejemplo.invalid
OWNER_NAME=Nombre del propietario
OWNER_PASSWORD=REEMPLAZAR_POR_UNA_CONTRASENA_LARGA_UNICA
OWNER_ORGANIZATION=Nombre del restaurante
OWNER_SLUG=nombre-del-restaurante
```

Ejecutar npm run auth:provision. El comando crea en una transacción una nueva organización, sucursal, propietario y permisos iniciales. No actualiza cuentas existentes ni reutiliza credenciales. Eliminar OWNER_PASSWORD y las variables de aprovisionamiento de .env tras ejecutarlo. No utilizar los ejemplos como contraseñas reales.

Abrir /login y seleccionar la sucursal desde /dashboard. En producción usar HTTPS. Ejecutar npm run auth:cleanup periódicamente para eliminar sesiones y contadores expirados.

## Pendientes antes de producción
Registro público con verificación de correo, invitaciones, recuperación de contraseña con tokens de un solo uso, MFA opcional, auditoría, protección adicional contra abuso, gestión de sesiones y pruebas de autorización por operación. La interfaz no expone enlaces a funcionalidades inexistentes.

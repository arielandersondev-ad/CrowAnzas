# Crowanzas API

API NestJS con prefijo `/api`, contratos compartidos en `@crowanzas/contracts` y relación **User 1:N Expense**. Cada usuario contiene solo nombre, UUID y timestamps; los nombres pueden repetirse. No hay autenticación, sesiones, contraseñas ni correo. Elegir un perfil agrupa gastos y no proporciona aislamiento de seguridad.

## Rutas

| Método y ruta | Respuesta / comportamiento |
| --- | --- |
| `GET /api/health` | `{status:"ok",storage:"memory"\|"prisma"}` |
| `GET /api/users` | `User[]` |
| `POST /api/users` | Body `{name}`; 201 `User` |
| `GET /api/users/:userId` | `User` |
| `GET /api/users/:userId/expenses?date=AAAA-MM-DD` | `Expense[]`; sin fecha, todo el historial del propietario |
| `POST /api/users/:userId/expenses` | Body `{name,amount,quantity,date?,description?}`; 201 `Expense` |
| `GET /api/users/:userId/expenses/summary?date=AAAA-MM-DD` | `DailySummary`; sin fecha, hoy |
| `GET /api/expenses?date=AAAA-MM-DD` | `ExpenseWithUser[]`; sin fecha, todo el historial global |
| `GET /api/expenses/summary?date=AAAA-MM-DD` | `UsersDailySummary`; sin fecha, hoy; incluye perfiles con cero gastos |

No hay POST global de gastos. El propietario se toma de la URL y no se admite `userId` en el body. UUID inválido recibe 400; propietario desconocido recibe 404, incluso en listados/resúmenes. Los gastos se ordenan por `createdAt` descendente.

`DailySummary` contiene `userId,date,total,count,expenses`. `UsersDailySummary` contiene `date,total,count,users`, con grupos `{user,total,count}`. `ExpenseWithUser` incluye el gasto y su objeto `user`.

## Valores y almacenamiento

Nombre requerido, recortado y hasta 120 caracteres. Importe positivo como **cadena decimal**, máximo `9999999999.99` y hasta dos decimales. Cantidad entera entre 1 y 1.000.000; descripción opcional hasta 1000 caracteres. Fechas reales `AAAA-MM-DD`; fecha omitida al crear o resumir usa hoy en `APP_TIMEZONE`. Los campos opcionales se omiten en lugar de enviar null; campos desconocidos y valores inválidos reciben 400.

El total es la **suma exacta de importes**, usando centavos enteros; nunca se multiplica por cantidad. Un perfil sin gastos devuelve total `"0.00"`; el resumen global incluye todos los perfiles y cuenta gastos.

`API_STORAGE=memory` empieza **vacío, sin semillas**. Usuarios y gastos se pierden al reiniciar. Health y el log de arranque identifican el almacenamiento. Prisma usa PostgreSQL con adapter-pg y rechaza fallos de configuración/conexión sin fallback a memoria.

## Configuración y comandos

Copiar [.env.example](.env.example) a `apps/api/.env`; las variables del entorno prevalecen. Valores del ejemplo: `API_PORT=3001`, `WEB_ORIGIN=http://localhost:3000`, `APP_TIMEZONE=America/La_Paz`, `API_STORAGE=memory`. Prisma requiere `API_STORAGE=prisma` y `DATABASE_URL` privada.

Comandos existentes, desde la raíz en CMD, para uso futuro:

```bat
npm run build --workspace=@crowanzas/contracts
npm run build --workspace=@crowanzas/api
npm run start --workspace=@crowanzas/api
```

El build API genera el cliente Prisma antes de compilar; esa generación no conecta ni migra la base. El build integrado `npm run build` ya pasó con exit 0. Esta iteración se validó **solo mediante build**; las pruebas históricas no cubren el cambio multiusuario. Ver [verificación](../../docs/verification.md).

## PostgreSQL / Neon: aplicación manual futura

El usuario conectará y aplicará manualmente las migraciones; no se provisionó Neon ni se ejecutó ninguna migración. Antes de hacerlo, respaldar registros, revisar el SQL/bloqueo y comprobar el historial de migraciones del esquema existente.

La migración inicial se conserva. `20261009000000_add_users` añade User y propietario obligatorio, FK Restrict/Cascade e índice por propietario. Solo si existen gastos históricos crea `Personal` con UUID `00000000-0000-4000-8000-000000000001` y los asigna sin cambiar los otros campos. Una base sin gastos no recibe ese usuario. No hay borrado ni reset.

Guía futura desde la raíz en CMD; sustituir los marcadores por la conexión privada:

```bat
set "DATABASE_URL=postgresql://ROLE:SECRET@HOST/DATABASE?sslmode=require"
npm run db:migrate
set "API_STORAGE=prisma"
```

`db:migrate` aplica las migraciones pendientes mediante Prisma `migrate deploy`. La API necesita la misma conexión al arrancar. No guardar credenciales en el repositorio. Conexión, aplicación de migración y persistencia real siguen sin verificar. Ver [arquitectura](../../docs/architecture.md).

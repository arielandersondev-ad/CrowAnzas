# Crowanzas

Registro de gastos por perfil y resúmenes diarios en español, con diseño mobile-first. Monorepo npm con Next.js, NestJS y contratos TypeScript compartidos.

Cada usuario tiene **solo nombre**, UUID y timestamps internos. No hay autenticación, sesiones, contraseñas ni correo. Seleccionar un perfil agrupa gastos: **no proporciona aislamiento de seguridad**.

Se mantienen las versiones instaladas: Node **22.22.2**, Next **16.4.0**, React **19.3.0**, Nest **12.0.3**, TypeScript **5.9.3** y Prisma CLI/client/adapter-pg **7.9.1**. El prefijo original de `globals.css` se conserva byte idéntico.

## Flujo de usuarios y gastos

1. Crear un perfil con su nombre; los nombres pueden repetirse y el UUID identifica cada perfil.
2. Seleccionar un perfil para registrar un gasto con nombre, importe, cantidad, fecha y descripción opcional.
3. Consultar el resumen diario del perfil. Cambiar de perfil cambia el propietario de los nuevos gastos y los datos mostrados.
4. Consultar el historial global: sin filtro de fecha incluye todos los gastos y muestra su propietario.
5. Consultar el resumen diario global, que incluye también perfiles con cero gastos.

Mock v2 **empieza vacío**, usa `crowanzas.data.v2` e ignora mock v1 **sin borrar su clave antigua de localStorage**. Solo admite gastos de usuarios conocidos. Mock persiste en ese navegador; la API en memoria empieza vacía y pierde usuarios/gastos al reiniciar el proceso. PostgreSQL conserva los registros reales mediante la migración descrita abajo.

## Contrato HTTP

Prefijo `/api`. UUID inválido recibe 400; propietario desconocido recibe 404, también en listados y resúmenes vacíos.

| Método y ruta | Comportamiento / respuesta |
| --- | --- |
| `GET /api/health` | `{status:"ok",storage:"memory"\|"prisma"}` |
| `GET /api/users` | `User[]` |
| `POST /api/users` | Body `{name}`; 201 `User` |
| `GET /api/users/:userId` | `User` |
| `GET /api/users/:userId/expenses?date=AAAA-MM-DD` | `Expense[]`; sin fecha, todo el historial del propietario |
| `POST /api/users/:userId/expenses` | Body `{name,amount,quantity,date?,description?}`; 201 `Expense` |
| `GET /api/users/:userId/expenses/summary?date=AAAA-MM-DD` | `DailySummary`; sin fecha, hoy |
| `GET /api/expenses?date=AAAA-MM-DD` | `ExpenseWithUser[]`; sin fecha, todo el historial global |
| `GET /api/expenses/summary?date=AAAA-MM-DD` | `UsersDailySummary`; sin fecha, hoy; incluye usuarios con cero gastos |

**No existe POST global de gastos.** El propietario viene de la URL; `CreateExpense` no admite `userId` en el body.

El importe es el costo registrado: total = suma de importes, nunca importe × cantidad. Dinero como cadenas decimales y centavos enteros; máximo individual `9999999999.99`, positivo y con hasta dos decimales. Cantidad entera entre 1 y 1.000.000. Fechas de calendario `AAAA-MM-DD`; crear sin fecha o resumir sin fecha usa hoy en `America/La_Paz` o la zona configurada. Nombre requerido, recortado y hasta 120 caracteres; descripción opcional hasta 1000.

Ver [tipos compartidos, arquitectura y migración](docs/architecture.md). La [documentación de la API](apps/api/README.md) detalla sus rutas y configuración.

## Instalación y build

Las dependencias actuales ya están instaladas. En una copia limpia, desde la raíz en CMD:

```bat
npm ci
npm run build
```

El build raíz **compila contratos primero**, genera cliente Prisma, construye API y finalmente Next. La generación no conecta ni migra la base.

La integración multiusuario del **9 de octubre de 2026** terminó con `npm run build`, **exit 0**. La validación de esta iteración fue **solo build**: no se ejecutaron tests, typecheck independiente, auditorías, navegador/Playwright, servidores ni conexiones de base. Las pruebas del MVP previo no acreditan estos cambios. Ver [resultado observado y límites](docs/verification.md).

## Configuración

Los ejemplos están en [web/.env.example](apps/web/.env.example) y [API/.env.example](apps/api/.env.example). Web local 3000, API 3001; `NEXT_PUBLIC_DATA_MODE=mock` o `api`, `NEXT_PUBLIC_API_URL=http://localhost:3001/api`, `API_STORAGE=memory` o `prisma`, `WEB_ORIGIN=http://localhost:3000`, `APP_TIMEZONE=America/La_Paz`. Moneda visible por defecto `Bs`, solo de presentación. Las variables públicas de Next se fijan durante el build; cambiar modo o URL requiere reconstruir la web.

## Migración futura a PostgreSQL / Neon — no ejecutada

No se provisionó Neon ni se conectó o modificó una base. La migración histórica permanece intacta. `20261009000000_add_users` crea usuarios y añade propietario obligatorio a los gastos. **Solo si hay gastos históricos**, crea `Personal` con UUID `00000000-0000-4000-8000-000000000001` y los asigna sin cambiar sus otros campos. Una base sin gastos no recibe ese perfil.

El usuario conectará y aplicará manualmente las migraciones a PostgreSQL/Neon. Antes de hacerlo: respaldar los registros, revisar el SQL y su bloqueo de tabla, y comprobar que el historial de migraciones corresponde al esquema real. Si la base no registra la migración inicial, reconciliar ese historial antes de aplicar cambios; no usar reset para resolverlo.

Estos comandos son una guía futura, **no se ejecutaron**. Sustituir los marcadores por la conexión privada de PostgreSQL/Neon y ejecutarlos desde la raíz en CMD:

```bat
set "DATABASE_URL=postgresql://ROLE:SECRET@HOST/DATABASE?sslmode=require"
npm run db:migrate
set "API_STORAGE=prisma"
```

`db:migrate` ejecuta Prisma `migrate deploy` sobre las migraciones pendientes; requiere una base disponible. La API necesita esa misma conexión al arrancar en modo Prisma. No guardar credenciales reales en el repositorio. Aplicación de la migración, conexión y persistencia real siguen sin verificar.

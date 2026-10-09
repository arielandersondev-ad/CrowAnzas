# Crowanzas web

Next App Router, TypeScript, Tailwind 4 y Axios. Usa los tipos y reglas de fecha, dinero y validación de `@crowanzas/contracts`. Se conservan las versiones instaladas.

Tras la instalación y compilación de contratos realizadas en la raíz, ejecuta `npm run dev --workspace=@crowanzas/web`. El frontend sirve en `http://localhost:3000`.

## Modos de datos

El modo predeterminado es `mock`: empieza vacío, sin usuarios ni gastos de ejemplo. Guarda un documento `{users,expenses}` en `localStorage` bajo `crowanzas.data.v2`. Ignora `crowanzas.expenses.v1` sin leer, importar ni borrar esa clave antigua, según el descarte de mock autorizado por el usuario. No sincroniza entre navegadores o dispositivos.

Los usuarios tienen solo nombre, UUID y timestamps internos; se permiten nombres repetidos y se muestran referencias cortas para distinguirlos. La selección de usuario es estado de interfaz, sin autenticación ni sesión. Todos los usuarios y registros pueden consultarse desde la aplicación; seleccionar un nombre no proporciona aislamiento de seguridad.

El adaptador rechaza v2 corrupto, UUIDs/fechas/importes inválidos, IDs duplicados o gastos cuyo propietario no exista. Conserva los datos corruptos sin sobrescribirlos. Si el navegador impide guardar, informa el error y no anuncia éxito. No borra registros reales de base de datos.

Para conectar Nest, copia `.env.example` a `.env.local` dentro de `apps/web`, usa `NEXT_PUBLIC_DATA_MODE=api` y configura `NEXT_PUBLIC_API_URL` con la base terminada en `/api`. Reinicia Next después de modificar variables. Las variables públicas se incluyen en el bundle al compilar. El modo API consulta `/health` para identificar memoria temporal o Prisma; no cambia automáticamente a mock si falla el servidor. Neon se configura en el backend, nunca con credenciales públicas del frontend.

`NEXT_PUBLIC_APP_TIMEZONE` usa por defecto `America/La_Paz`. Las fechas seleccionadas se transmiten como `YYYY-MM-DD`, sin conversión UTC. `NEXT_PUBLIC_CURRENCY` cambia solo la etiqueta visual, por defecto `Bs`; el modelo no representa distintas monedas.

## Pantallas y rutas

- Inicio: crear usuarios por nombre y elegir su espacio.
- Espacio seleccionado: formulario de gastos y resumen diario exclusivos del usuario, con control para cambiarlo.
- Todos los registros: historial global completo por defecto, propietario visible y filtro de fecha opcional.
- Mini resumen diario: todos los usuarios, incluidos los de cero gastos, conteos y total general. La fecha predeterminada es hoy en La Paz.

Axios usa `/users`, `/users/:userId`, `/users/:userId/expenses` y `/users/:userId/expenses/summary`. `/expenses` devuelve historial global con propietario y `/expenses/summary` el resumen diario por usuario y total. No existe POST global de gastos. Sin fecha, los listados devuelven todo el historial; los resúmenes usan hoy si se omite. Crear un usuario o gasto invalida las cargas para refrescar los listados y resúmenes. Cada recurso se identifica por propietario/fecha/revisión y descarta respuestas o errores tardíos. El importe ya es el costo registrado: se suma sin multiplicarlo por cantidad.

La interfaz mantiene pestañas accesibles con flechas/Home/End, campos etiquetados, validación inline, bloqueo de envíos repetidos y estados de carga/error/vacío/éxito. Después de guardar selecciona el resumen del usuario para la fecha registrada. El diseño parte de tarjetas apiladas en móvil y añade columnas en escritorio; incluye foco visible y movimiento reducido. El CSS suministrado permanece al inicio de `src/app/globals.css`; estilos y fuentes de respaldo se añaden después, sin descargas de fuentes durante el build.

## Validación autorizada de esta fase

MAIN ejecutará únicamente la compilación de integración cuando backend y frontend estén listos: primero contratos actualizados y luego aplicaciones. Los tipos emitidos anteriores pueden estar desactualizados hasta ese momento. No se ejecutan tests, typecheck separado, auditorías, navegador, servidores de desarrollo, migraciones ni conexiones de base de datos. Los tests históricos se conservan sin modificar y quedan fuera de la compilación del producto.

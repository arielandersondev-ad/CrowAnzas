# Verificación — integración multiusuario, 9 de octubre de 2026

Repositorio: `D:/Usuarios/ariel.cruz/Desktop/Trae/crowanzas`. **Validación actual: BUILD ONLY.** No se ejecutaron tests, typecheck independiente, auditorías, navegador/Playwright, servidores, validación de esquema separada ni conexiones de base. No se ejecutaron migraciones ni db push; no se provisionó Neon.

## Comando y resultado observado

Desde la raíz, con `C:/WINDOWS/system32/cmd.exe` y `login:false`:

```bat
npm run build
```

| Intento | Resultado observado |
| --- | --- |
| Sandbox | Exit **1**. Contratos, generación Prisma y API pasaron; Next compiló y falló con `spawn EPERM` durante su paso interno de TypeScript. |
| Repetición autorizada fuera del sandbox | Exit **0**. Contratos → generación Prisma 7.9.1 → API → Next 16.4.0. Next terminó compilación, TypeScript interno y generación de 3 páginas estáticas. |

El segundo build resolvió la restricción de creación de procesos sin modificar código ni omitir validaciones del build. El paso TypeScript forma parte de los scripts existentes; no se invocó `npm run typecheck`. El cliente generado y los contratos emitidos quedaron actualizados para los modelos multiusuario.

No se instalaron ni actualizaron dependencias. Lectura de `package-lock.json`: Prisma CLI/client/adapter-pg **7.9.1 / 7.9.1 / 7.9.1**, Nest **12.0.3**, Next **16.4.0**, React **19.3.0**, TypeScript **5.9.3**.

## Revisión de fuente — no validación funcional en ejecución

Se inspeccionaron contratos, controllers/services, repositorios memoria/Prisma, adaptadores mock/HTTP y componentes web contra [el contrato acordado](architecture.md).

- Tipos `User`, `CreateUser`, `Expense.userId`, `ExpenseWithUser`, `DailySummary.userId` y `UsersDailySummary` coinciden con las respuestas scoped/global. Usuario contiene solo nombre, UUID y timestamps.
- Mock, repositorio en memoria y repositorio Prisma implementan creación/listado por propietario, historial global sin fecha y resumen global que enumera todos los usuarios, incluidos los de cero gastos. Axios usa las rutas correspondientes. No hay POST global de gastos.
- Los controllers validan UUID; el servicio comprueba propietario y declara 404 para desconocidos. El body scoped no acepta propietario adicional. Fechas/valores inválidos siguen las validaciones compartidas/DTO.
- Importes se normalizan como cadenas decimales; los totales usan centavos `bigint` y suman importes individuales sin multiplicar por cantidad. El resumen global evita volver a validar subtotales como importes individuales limitados.
- Mock v2 empieza vacío, usa exclusivamente `crowanzas.data.v2`, no lee ni borra la clave v1 y verifica que cada gasto pertenezca a un usuario conocido. Los datos de perfiles y gastos se guardan juntos.
- Las claves de carga web incluyen propietario/fecha/revisión; cambio de perfil y respuestas tardías tienen controles para evitar mostrar datos del propietario anterior. Esto se revisó en fuente, sin simular carreras en ejecución.
- Esquema: User UUID, nombre varchar120, timestamps timestamptz3, relación obligatoria y FK Restrict/Cascade; índice global conservado e índice propietario/fecha/createdAt añadido. SQL añade CHECK de nombre no blanco.
- Migración nueva transaccional y offline: columna temporal nullable, bloqueo, backfill `Personal` únicamente si existen gastos históricos, NOT NULL/FK/índice. No borra registros ni cambia los demás campos de gastos. La migración inicial se conserva.
- No se incorporaron autenticación, sesiones, correo ni contraseñas. La selección de perfil no constituye aislamiento de seguridad.

Comparación estática de archivos: los **5231 bytes** de `crowanzas-global.css` original coinciden exactamente con el prefijo de `apps/web/src/app/globals.css` (33956 bytes al revisar). Las reglas adicionales están después del prefijo; no se comprobaron estilos calculados ni responsive en navegador en esta iteración.

## Correcciones de integración y documentación

No se identificó ni corrigió un bloqueo de código de aplicación. El fallo inicial fue una restricción de subprocess del sandbox y se resolvió mediante repetición autorizada.

Se actualizan [README](../README.md), [README de la API](../apps/api/README.md) y [arquitectura](architecture.md) para reflejar implementación, flujo de perfiles, rutas actuales, build observado y guía futura de migración manual por el usuario. Este documento sustituye las afirmaciones de validación actual del MVP.

La limpieza final corrigió el README de la API sin cambios de código ni nueva ejecución de comandos de validación.

## Evidencia histórica — MVP del 7 de octubre, no cubre el código actual

Antes del cambio multiusuario se observaron build/typecheck/schema validation y **23 pruebas** (4 contratos, 11 API, 8 web), arranque raíz, suite de navegador reforzada **6 pasadas / 2 omitidas intencionalmente** y contraste dirigido **4 pasadas**. **No se repitieron esas suites ni se atribuyen sus resultados a esta iteración.** Los scripts/tests existentes pueden necesitar adaptación al nuevo contrato.

Las capturas históricas en `.tmp/browser-artifacts/` y el reporte anterior `playwright-report/index.html` corresponden a la UI/API del MVP, con semillas y sin perfiles; no son evidencia visual de la nueva versión. No se produjeron capturas nuevas.

## Límites pendientes

El build demuestra compilación y generación de artefactos, no comportamiento HTTP/UI. Persistencia/aislamiento de perfiles en ejecución, errores HTTP efectivos, carreras de carga, navegación/teclado, tema y dimensiones móviles requieren validación futura autorizada.

Prisma se generó sin conexión de base. No se aplicó la migración ni se comprobó conexión, backfill o persistencia PostgreSQL/Neon. Memoria es temporal; mock es local al navegador. No se iniciaron servidores en esta iteración, no se hizo commit ni publicación.

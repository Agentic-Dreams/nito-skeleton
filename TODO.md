# TODO — Tareas Pendientes

## Actualizaciones de dependencias

- [ ] **Salto a NestJS 11 + Fastify 5**: decidido posponerlo hasta que dog-reservation dé el salto (se hará en ambos repos a la vez, en rama aparte). Implica: `@nestjs/{common,core,platform-fastify,testing}` v11, `fastify` v5, `@nestjs/swagger` v11, `@fastify/helmet` v13, `@fastify/compress` v9. Requiere Node >= 20 (el Dockerfile ya usa node:22 ✓). Nest 10 está en mantenimiento y Fastify 4 terminó su soporte de seguridad — no demorarlo demasiado.
- [ ] **Avisos de `npm audit` restantes**: los ligados a la línea Fastify 4 (`fast-uri`, `@fastify/middie`) se resuelven con el salto a Fastify 5. Revisar el resto tras cada `npm install`.
- [ ] **class-validator 0.15**: nos quedamos en `^0.14.3` (versión probada en dog-reservation). Evaluar el salto a 0.15.x cuando dog-reservation lo valide.
- [ ] **TypeScript 6.0**: existe pero ts-jest y el ecosistema Nest aún no lo soportan bien. Quedarse en 5.9.x hasta entonces.

## Generador / Templates

- [ ] **Sincronizar plop-templates con los proyectos hijos**: el plopfile del skeleton (fixes de QA, auto-registro en app.module, many-to-many) va por delante del de dog-reservation. Definir el flujo de sincronización skeleton → proyectos (¿script de copia?, ¿release del skeleton?) para que las mejoras no diverjan.

## Infraestructura

- [ ] **Directorio `deploy/`**: existe sin versionar en el working tree (docker-compose de development). Decidir si se commitea como parte del skeleton o se descarta.

---

*Última actualización: 2026-07-04*

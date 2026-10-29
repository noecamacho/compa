# Avance de la revisión QA (rama `qa/revision-completa`)

Si pierdes contexto: lee este archivo, luego `e2e/MAPA.md` y `e2e/INVENTARIO.md`, y sigue desde "Qué sigue".

## Decisiones tomadas

- **Backend real para la suite, no el mock de ejemplos.** `API_MODE=mock` devuelve siempre los mismos ejemplos (sin estado), así que no puede probar dos pasos, puntos ni persistencia. La suite corre los handlers reales contra Postgres en Docker (puerto 3901) con un login de prueba (`COMPA_TEST_AUTH=1`, `lib/server/test-auth.ts`). Es lo que piden `docs/engineering-standards.md` → Testing ("una sesión de prueba, nunca LinkedIn en vivo").
- **Commits en inglés.** El hook `scripts/check-commit-message.sh` rechaza asuntos en español y exige Conventional Commits; el formato pedido ("fix(pantalla): qué se rompía…") se respeta en inglés. No hubo migraciones: el modelo de handles ya existía (`users.links` + `users.visibility.links`).
- **Sin trailer de atribución** en los commits: `AGENTS.md` §5 lo prohíbe y el hook lo bloquea.
- **"Aceptar da +20 a ambos"**: el código reparte a ambos los puntos del tipo (50 nueva / 20 reencuentro); `wiki/open-questions.md` #28 registra que el "+20 por aceptar" se descartó. La suite verifica el modelo decidido. El copy de la solicitud ("los dos ganan +20") no se toca (regla: no cambiar copy).
- **Bienvenida sin selector "Crear cuenta / Ya tengo cuenta"**: no existe en el producto (entrada solo por QR del evento, API spec A10). `bienvenida.spec` cubre lo equivalente: el botón de la puerta cambia texto y destino según haya sesión.
- **Contraste de color (axe `color-contrast`, serio)**: el gris `--color-muted` (#6F6A7E) sobre papel (#FFF6E5) da 4.2:1 en textos de 11–12 px; AA pide 4.5:1. La regla de la sesión prohíbe cambiar colores, así que `accesibilidad.spec` corre axe con `color-contrast` desactivada y aquí queda registrado para quien decide el diseño. Todo lo demás de axe (serio/crítico) está en cero.
- **Doble tap**: `locator.dblclick()` de Playwright es una sola pulsación con `clickCount: 2` (un solo `click`), así que `doble-tap.spec` da dos taps reales seguidos (`tapTwice`).
- **Aislamiento por test**: cada test crea su propio evento y personas (`World`) y los borra al terminar; no hay reset global, así los 3 viewports corren en paralelo. Los helpers escriben directo en Postgres.
- **Áreas de toque de 44 px sin cambiar tamaños**: utilidad `hit-44` (pseudo-elemento) en chips, swatches, segmentos y botones de texto.
- **Inicio vacío**: con 0 conexiones ya no se ocultan las solicitudes ni los invitados reales; solo `?demo=empty` (vista previa del mock) los deja en blanco.

## Secciones

- [x] 0. Reconocimiento: `MAPA.md`, barrido (sin TODO/FIXME/console.log), lint + typecheck + unit tests en verde, app levanta.
- [x] 1. Montaje Playwright (config, scripts, helpers, fixtures).
- [x] 2. Inventario (`INVENTARIO.md`).
- [x] 3. Specs por pantalla (bienvenida, perfil, monito, inicio, conectar, registrar, conexion-dos-pasos, confirmacion, conexiones, perfil-otro, nota, mi-perfil, insignias, ranking, invitar).
- [x] 4. Handles de redes (`redes.spec`).
- [x] 5. Transversales (puntos, navegacion, persistencia, offline, doble-tap, textos-largos, accesibilidad, consola).
- [ ] 6. Suite completa en verde en 3 viewports (corriendo la primera pasada completa).
- [ ] 7. `RESUMEN.md`, push y PR.

## Qué sigue

Leer el resultado de la pasada completa (`npx playwright test`), corregir lo que falle en 375 o 1280, repetir hasta verde, escribir `RESUMEN.md`, subir la rama y abrir el PR con la plantilla del repo (Iker pidió el PR listo para que su equipo haga el merge).

## Bugs corregidos (uno por commit; `git log --oneline main..` tiene la lista)

1. Insignias nunca se otorgaban: consulta `created_at < $1` en `sql` crudo fallaba y el error se tragaba (`lib/server/badges.ts`).
2. Resumen de IA fallaba con 502 sin `OPENAI_API_KEY` en vez de guardar el texto tal cual (`lib/ai/draft-summary.ts`).
3. Handles de redes: solo había flags; ahora se capturan, validan (lib/links.ts) y se muestran a conexiones aceptadas (sección 4).
4. Búsqueda por nombre solo encontraba handles exactos; ahora `GET /api/users?q=` (nombre o handle sin acentos).
5. QR ajeno se ignoraba en silencio; ahora avisa.
6. Conexiones listaba solicitudes rechazadas/pendientes como conexiones.
7. Conexiones: botón buscar y chip de evento sin acción.
8. Nota: `topics: []` al guardar perdía los temas; "Recordar" sin handler.
9. Perfil de otro: "Hoy" fijo; sin redes; insignias abrían las mías.
10. Ranking: podio y fila de arriba enlazaban a `/ranking`; personas con 0 pts aparecían en el podio.
11. Inicio vacío ocultaba solicitudes e invitados reales; campana sin avisos no hacía nada.
12. Registrar: persona conocida en otro evento se ofrecía como Nueva.
13. Monito: error de hidratación por look aleatorio en el servidor; borrador perdido al recargar/regresar.
14. Perfil: lo escrito se perdía al recargar/regresar.
15. Mensajes de error de la API en inglés en pantalla (todas las formas).
16. Doble tap en toggles de redes dejaba la red apagada.
17. 404 de Next en inglés sin salida; ahora pantalla en español con botón.
18. Sin estado offline; ahora franja "Sin conexión".
19. Áreas de toque < 44 px.

## Notas de ejecución

- Servidor e2e: `scripts/e2e/server.sh` (Playwright lo levanta solo; si ya hay uno en 3902 lo reutiliza). Base: `scripts/e2e/db.sh` (`stop` para apagar el contenedor).
- La suite completa tarda unos minutos; `bun run test:e2e:report` abre el HTML en `e2e/report`.

# Avance de la revisión QA (rama `qa/revision-completa`)

Si pierdes contexto: lee este archivo, luego `e2e/MAPA.md` y `e2e/INVENTARIO.md`, y sigue desde "Qué sigue".

## Decisiones tomadas

- **Backend real para la suite, no el mock de ejemplos.** `API_MODE=mock` devuelve siempre los mismos ejemplos (sin estado), así que no puede probar dos pasos, puntos ni persistencia. La suite corre los handlers reales contra Postgres en Docker (puerto 3901) con un login de prueba (`COMPA_TEST_AUTH=1`, `lib/server/test-auth.ts`). Es lo que piden `docs/engineering-standards.md` → Testing ("una sesión de prueba, nunca LinkedIn en vivo").
- **Commits en inglés.** El hook `scripts/check-commit-message.sh` rechaza asuntos en español y exige Conventional Commits; el formato pedido ("fix(pantalla): qué se rompía…") se respeta en inglés. Migraciones: `fix(migration): …`.
- **Sin trailer de atribución** en los commits: `AGENTS.md` §5 lo prohíbe y el hook lo bloquea.
- **"Aceptar da +20 a ambos"**: el código reparte a ambos los puntos del tipo (50 nueva / 20 reencuentro) y `wiki/open-questions.md` #28 registra que el "+20 por aceptar" se descartó. La suite verifica lo que el modelo decidido hace: al aceptar, ambos reciben los puntos del tipo. El copy de la solicitud ("los dos ganan +20") no se toca (regla: no cambiar copy).
- **Bienvenida sin selector "Crear cuenta / Ya tengo cuenta"**: no existe en el producto (entrada solo por QR del evento, API spec A10). `bienvenida.spec` cubre lo equivalente: el botón de la puerta cambia texto y destino según haya sesión.
- **Aislamiento por test**: cada test crea su propio evento y personas (`World`) y los borra al terminar; no hay reset global, así los 3 viewports corren en paralelo.

## Secciones

- [x] 0. Reconocimiento: `MAPA.md`, barrido (sin TODO/FIXME/console.log), lint + typecheck + 119 unit tests en verde, app levanta.
- [x] 1. Montaje Playwright (config, scripts, helpers, fixtures).
- [x] 2. Inventario (`INVENTARIO.md`); los estados se confirman spec por spec.
- [ ] 3. Specs por pantalla.
- [ ] 4. Handles de redes.
- [ ] 5. Transversales.
- [ ] 6. Suite completa en verde en 3 viewports.
- [ ] 7. `RESUMEN.md`.

## Qué sigue

Escribir `e2e/tests/bienvenida.spec.ts` y correrlo; después perfil, monito, inicio…

## Bugs vistos en el barrido (por corregir con su spec)

1. Conexiones: botón buscar sin handler; chip de evento sin acción.
2. Nota: botón "Recordar" sin handler.
3. Inicio: campana sin avisos no hace nada.
4. Conectar: QR ajeno no avisa; búsqueda solo por handle exacto (nombres con sufijo no se encuentran).
5. Perfil de otro: "La última vez" dice "Hoy" fijo; no muestra las redes encendidas; insignias abren las mías.
6. Ranking: podio y fila de arriba enlazan a `/ranking` cuando la persona no es conexión.
7. Nota: al guardar se pierden los temas del borrador (`topics: []`).
8. Mensajes de error de la API en inglés en pantalla (ProfileForm, RegisterForm, RequestActions, NoteEditor).
9. Perfil/Monito: regresar o recargar pierde lo escrito.
10. Handles de redes: solo flags, sin captura de valor (sección 4).
11. Sin estado offline.
12. Áreas de toque < 44 px (swatches, chips de opción, Copiar, Saltar).

## Notas de ejecución

- Servidor e2e: `scripts/e2e/server.sh` (Playwright lo levanta solo). Si ya hay uno en 3902 lo reutiliza.

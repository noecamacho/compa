# Inventario de elementos interactivos

Una fila por cada cosa tocable. Estado: OK (funcionaba y está cubierto) o CORREGIDO (se arregló en esta rama; el commit lo dice).

| Pantalla | Elemento | Qué debería hacer | A dónde navega | Spec | Estado |
|---|---|---|---|---|---|
| Bienvenida `/` | Botón "Volver a mi evento" (solo con sesión y evento) | Entrar a la app | `/home` | bienvenida | OK |
| Bienvenida `/` | Aviso `?error=linkedin` | Mostrar que el login falló o se canceló, sin pantalla en blanco | — | bienvenida | OK |
| Puerta `/e/<code>` | Botón "Entrar con LinkedIn" (sin sesión) | Iniciar login; texto y destino cambian con sesión ("Entrar al evento") | `/auth/linkedin?next=/e/<code>/join` → `/e/<code>/join` | bienvenida | OK |
| Puerta `/e/<code>` | Enlace "Ver la pantalla en vivo" | Abrir la pantalla proyectada | `/e/<code>/live` | bienvenida | OK |
| LinkedIn simulado | Campos nombre, puesto, empresa, ciudad, correo + Permitir | Crear/sincronizar la persona y volver a `next` | `next` | bienvenida | OK |
| LinkedIn simulado | Cancelar | Volver a la bienvenida con aviso | `/?error=linkedin` | bienvenida | OK |
| Join `/e/<code>/join` | "Aceptar y entrar" | Check-in con consentimiento | `/home` | bienvenida | OK |
| Join `/e/<code>/join` | "Ahora no" | Volver a la puerta | `/e/<code>` | bienvenida | OK |
| Perfil (02) | Inputs nombre, puesto, empresa, ciudad | Editables, prellenados de LinkedIn; lo escrito sobrevive recarga y regresar | — | perfil, persistencia | CORREGIDO |
| Perfil (02) | 4 toggles de redes | Encender/apagar red; al encender pide el handle | — | perfil, redes | CORREGIDO |
| Perfil (02) | Inputs de handle (LinkedIn, Instagram, WhatsApp, X) | Capturar y validar el valor | — | redes | CORREGIDO |
| Perfil (02) | "Siguiente: tu monito" / "Guardar" | Guardar perfil y visibilidad | `/onboarding/monito` o `/me` | perfil | OK |
| Perfil (02) | Botón atrás | Regresar sin perder lo escrito | `/` o `/me` | perfil, navegacion | CORREGIDO |
| Monito (02b) | Elegir "Usar mi foto" / "Crear mi monito" | Cambiar el modo del avatar | — | monito | OK |
| Monito (02b) | Swatches de piel (5) | Cambiar la piel del preview | — | monito | OK |
| Monito (02b) | Chips de pelo (4) | Cambiar el peinado | — | monito | OK |
| Monito (02b) | Swatches de color de pelo (4) | Cambiar el color | — | monito | OK |
| Monito (02b) | Swatches de camisa (6) | Cambiar la camisa | — | monito | OK |
| Monito (02b) | Extras gorra, lentes, barba | Combinables, cambian el preview | — | monito | OK |
| Monito (02b) | "Al azar" | Look aleatorio válido | — | monito | OK |
| Monito (02b) | "Listo, entrar" | Guardar el look | `/home` o `/me` | monito | OK |
| Monito (02b) | Botón atrás | Regresar; el look elegido no se pierde | `/onboarding/profile` o `/me` | monito, persistencia | CORREGIDO |
| Inicio (03) | Avatar + saludo | Ir a mi perfil | `/me` | inicio | OK |
| Inicio (03) | Campana de avisos | Abrir la primera solicitud; sin avisos, ir a conexiones | `/requests/<id>` o `/connections` | inicio | CORREGIDO |
| Inicio (03) | Tarjeta de solicitud entrante | Abrir la solicitud | `/requests/<id>` | inicio, conexion-dos-pasos | OK |
| Inicio (03) | Tarjeta EN VIVO: fila de ranking | Ver ranking (o Conectar en estado vacío) | `/ranking` o `/connect` | inicio | OK |
| Inicio (03) | Tarjeta Conectar | Abrir conectar | `/connect` | inicio | OK |
| Inicio (03) | Tarjeta Invita 3 | Abrir invitar | `/invite` | inicio | OK |
| Inicio (03) | Tour: Siguiente / Atrás / Saltar / Entendido | Recorrer y cerrar la guía | — | inicio | OK |
| Barra (dock) | Inicio, Conectar, Conexiones, Perfil | Navegar y marcar el activo | `/home` `/connect` `/connections` `/me` | inicio, navegacion | OK |
| Conectar (04) | Segmento Mi QR / Escanear | Cambiar de modo (y la URL `?tab=scan`) | — | conectar | OK |
| Conectar (04) | Chip "Invitar" | Abrir invitar | `/invite` | conectar | OK |
| Conectar (04) | QR | Codifica `<site>/u/<handle>` real | — | conectar | OK |
| Conectar (04) | Cámara | Sin permiso muestra estado claro; QR ajeno avisa | — | conectar | CORREGIDO |
| Conectar (04) | Buscador por nombre | Encontrar personas reales por nombre | — | conectar | CORREGIDO |
| Conectar (04) | Fila encontrada → "Conectar" | Abrir registrar | `/connect/<handle>` | conectar | OK |
| Registrar (05) | Nueva / Reencuentro | Cambiar la suma del botón (+50 / +20) | — | registrar | OK |
| Registrar (05) | Chips de temas (máx. 3) | Suman +5 una sola vez | — | registrar | OK |
| Registrar (05) | Nota de voz (grabar / terminar / regrabar) | Pasa por sin grabar, grabando, lista y regrabar; sin micrófono no rompe | — | registrar | OK |
| Registrar (05) | "Confirmar · +N pts" | Enviar la solicitud (pendiente) | `/connections/<id>/done` | registrar | OK |
| Registrar (05) | Botón atrás | Volver a escanear | `/connect?tab=scan` | navegacion | OK |
| Confirmación (06) | Cerrar (X) y "Listo" | Volver a inicio | `/home` | confirmacion | OK |
| Confirmación (06) | Tarjeta del resumen | Abrir la nota | `/connections/<id>/note` | confirmacion | OK |
| Confirmación (06) | Botones de redes de la otra persona | Abrir el enlace correcto, solo redes encendidas y conexión aceptada | enlace externo | confirmacion, redes | OK |
| Solicitud (06b) | "Aceptar" | Acepta: puntos para ambos | `/connections/<id>/done` | conexion-dos-pasos | OK |
| Solicitud (06b) | "Ahora no" | Rechaza en silencio, sin puntos | `/home` | conexion-dos-pasos | OK |
| Solicitud (06b) | Cerrar (X) | Volver a inicio | `/home` | navegacion | OK |
| Conexiones (07) | Botón buscar | Filtrar la lista por nombre | — | conexiones | CORREGIDO |
| Conexiones (07) | Chip del evento | Alternar solo este evento / todos | — | conexiones | CORREGIDO |
| Conexiones (07) | Filtros Todas / Nuevas / Reencuentros / Amigos | Filtrar por tipo | — | conexiones | OK |
| Conexiones (07) | Fila de persona | Abrir su perfil | `/people/<handle>` | conexiones | OK |
| Perfil de otro (08) | Botón atrás | Volver a conexiones | `/connections` | perfil-otro | OK |
| Perfil de otro (08) | Píldora de puntos | Ver ranking | `/ranking` | perfil-otro | OK |
| Perfil de otro (08) | Tarjeta de insignias | Ver sus insignias | `/me/badges?of=<handle>` | perfil-otro, insignias | CORREGIDO |
| Perfil de otro (08) | "La última vez" | Abrir la nota (fecha real) | `/connections/<id>/note` | perfil-otro | CORREGIDO |
| Perfil de otro (08) | "Conexiones en común" | Ver conexiones | `/connections` | perfil-otro | OK |
| Perfil de otro (08) | Botones de redes | Solo redes encendidas y conexión aceptada; abren el enlace | enlace externo | redes | CORREGIDO |
| Nota (08b) | Botón atrás | Volver al perfil de la persona | `/people/<handle>` | nota | OK |
| Nota (08b) | Grabar / Terminar / Regrabar / Editar / Resumir | Estados grabando, escuchando, listo, texto; negar micrófono no rompe | — | nota | OK |
| Nota (08b) | "Recordar" | Abrir un recordatorio con el pendiente | calendario externo | nota | CORREGIDO |
| Nota (08b) | "Guardar en la conexión" | Aprobar la nota (+15), conserva los temas | `/people/<handle>` | nota, puntos | CORREGIDO |
| Mi perfil (09) | "Mi QR" | Abrir conectar | `/connect` | mi-perfil | OK |
| Mi perfil (09) | "Editar perfil" | Abrir perfil en modo edición | `/onboarding/profile?from=me` | mi-perfil | OK |
| Mi perfil (09) | Monito / "Mi monito" | Cambiar el monito | `/onboarding/monito?from=me` | mi-perfil | OK |
| Mi perfil (09) | Tarjeta de insignias | Ver insignias | `/me/badges` | mi-perfil | OK |
| Mi perfil (09) | Toggles de redes | Encender/apagar; al encender captura el handle; persiste | — | mi-perfil, redes | CORREGIDO |
| Mi perfil (09) | Fila Ranking | Ver ranking | `/ranking` | mi-perfil | OK |
| Mi perfil (09) | Fila "Guía rápida" | Repetir el tour | `/home?tour=1` | mi-perfil | OK |
| Insignias (10) | Botón atrás | Volver a mi perfil o al perfil de otro | `/me` o `/people/<handle>` | insignias | OK |
| Insignias (10) | Filtros Todas / Ganadas / Por ganar | Filtrar | — | insignias | OK |
| Ranking (11) | Botón atrás | Volver a inicio | `/home` | ranking | OK |
| Ranking (11) | Segmento Esta noche / Todo el año | Cambiar de tablero (datos distintos) | — | ranking | OK |
| Ranking (11) | Columnas del podio | Abrir el perfil de esa persona | `/people/<handle>` | ranking | CORREGIDO |
| Ranking (11) | Fila de quien va arriba | Abrir su perfil | `/people/<handle>` | ranking | CORREGIDO |
| Ranking (11) | "Conectar ahora" | Abrir conectar | `/connect` | ranking | OK |
| Invitar (12) | Cerrar (X) | Volver a inicio | `/home` | invitar | OK |
| Invitar (12) | "Copiar" | Deja el enlace real en el portapapeles | — | invitar | OK |
| Invitar (12) | WhatsApp / Instagram / Más | Abren el share | wa.me / navigator.share | invitar | OK |
| Invitar (12) | "Mostrar mi QR de invitación" | Abrir conectar | `/connect` | invitar | OK |
| Invitación `/i/<code>` | Entrar con el enlace de un amigo | Login y reclamar la invitación; primera conexión da +100/+50 | `/onboarding/profile?invite=<code>` | invitar, puntos | OK |
| QR personal `/u/<handle>` | Abrir el enlace del QR | Con sesión: registrar; sin sesión: login y volver | `/connect/<handle>` | navegacion | OK |
| Todas | Banner sin conexión | Avisar cuando no hay red | — | offline | CORREGIDO |

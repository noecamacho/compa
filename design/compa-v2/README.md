# Compa · V2 cerrada · Handoff para Claude Code

Compa es una app social para eventos: conectas con la gente que conoces escaneando su QR, te quedas con sus redes y de qué hablaron, y ganas puntos, insignias y ropa para tu monito. Este paquete contiene las 16 pantallas de la versión 2, los 4 componentes visuales y toda la información del sistema. Es la fuente de verdad para construir la app.

## Cómo leer este paquete

- `pantallas/*.dc.html`: una pantalla por archivo (390×844, iPhone). Son archivos HTML de un editor de diseño: el markup real está dentro de `<x-dc>`, los estilos en `<helmet><style>` y en atributos `style`. Los `{{ huecos }}`, `<sc-for>`, `<sc-if>` y `<dc-import>` son plantillas: `{{ x }}` es un valor de `renderVals()` del script de abajo, `sc-for` repite, `sc-if` condiciona, `dc-import` incrusta un componente de `componentes/` con props. Úsalos como referencia exacta de layout, copy, colores, tamaños y estados. No se ejecutan tal cual.
- `componentes/`: Monito (pixel art 16×20 generado por código, SVG), Avatar (envuelve a Monito por iniciales de persona), Insignia (20 insignias dibujadas en SVG), DockV2 (barra de navegación).
- Los `href` entre pantallas son el mapa de navegación del prototipo.

## Stack sugerido

Expo + React Native (iOS primero), TypeScript. Backend simple (Supabase o similar) con auth por LinkedIn OAuth. Los SVG de Monito e Insignia se portan tal cual a `react-native-svg` (la lógica de rejilla de Monito es JS puro).

## Flujo (orden de pantallas)

| # | Archivo | Qué hace | A dónde va |
|---|---|---|---|
| 01 | V2Bienvenida | Logo, promesa en 3 pasos, selector Crear cuenta / Ya tengo cuenta, botón único con LinkedIn. Nota: tomamos nombre, puesto, empresa y ciudad; nunca publicamos | Crear cuenta → 02 · Ya tengo cuenta → 03 |
| 02 | V2Perfil | Datos prellenados de LinkedIn (nombre, puesto, empresa, ciudad) editables; toggles de qué redes compartes (LinkedIn, Instagram, WhatsApp, X). Paso 1 de 2 | → 02b |
| 02b | V2Monito | Constructor del monito con pocas opciones: piel 5, pelo 4, color 4, camisa 6, extras gorra/lentes/barba, botón al azar. Paso 2 de 2 | → 03 |
| 03 | V2Inicio | Saludo, tarjeta EN VIVO con contador del evento y pares que se conectan (animación), tu lugar en el ranking, botón Conectar, tarjeta Invita 3 amigos (3 círculos de progreso) | Ranking → 11 · Conectar → 04 · Invitar → 12 |
| 03b | V2InicioVacio | Mismo Inicio con 0 conexiones (primera noche): sin avisos, "Tu primera conexión te mete al ranking +50", sticker Empieza aquí en Conectar | |
| 04 | V2Conectar | Dos pestañas con texto: Mi QR (nombre + QR de 274 px) y Escanear (visor de cámara, al detectar muestra a la persona con botón Conectar, buscador por nombre si el QR no sale). Chip Invitar. La barra se queda abajo | Conectar → 05 |
| 05 | V2Registrar | Tarjeta de la persona, tipo (Nueva +50, Reencuentro +20), chips "¿De qué hablaron?" (+5), nota de voz opcional con estados sin grabar / grabando / lista (+15), botón Confirmar con la suma | → 06 |
| 06 | V2Confirmacion | Dos monitos, +pts grande, título, desglose; tarjeta "De qué platicaron" (chips + resumen que genera la IA de la nota); tarjeta "Conecta con [persona]" con sus redes como botones de ícono; botón Listo | Resumen → 08b · Listo → 03 |
| 06b | V2Solicitud | Lo que ve la otra persona cuando la escanean: quién es, 3 números, en común, temas que le interesan, "Al aceptar los dos ganan +20", Aceptar / Ahora no | Aceptar → 06 · Ahora no → 03 |
| 07 | V2Conexiones | Lista de conexiones con filtro por tipo y chip del evento | Fila → 08 |
| 08 | V2PerfilOtro | Perfil de alguien ya conectado: monito, nombre, puesto, ciudad, pts y lugar, repisa de 5 insignias, números de la relación (reencuentros, eventos juntos, en común), La última vez, Conexiones en común | Última vez → 08b · Insignias → 10 · Pts → 11 |
| 08b | V2NotaVoz | Detalle de la nota: resumen de la IA, 3 puntos, chips, pendiente detectado, +15, Guardar / Regrabar / Editar | → 08 |
| 09 | V2MiPerfil | Tu monito (tap lo cambia), nombre, puesto, ciudad, pts y lugar; repisa de 5 insignias; números (nuevas, reencuentros, eventos); Redes que compartes (4 toggles de ícono); accesos Ranking y Mi monito; QR y editar arriba | Monito → 02b · Insignias → 10 · Ranking → 11 · Editar → 02 · QR → 04 |
| 10 | V2Insignias | Las 20 con filtro Todas / Ganadas / Por ganar, barra de avance, secretas sin pista | → 09 |
| 11 | V2Ranking | Podio de 3 con confeti, toggle Esta noche / Todo el año, tarjeta Tú con cuánto falta para pasar al siguiente, fila de quien va arriba, Conectar ahora | Personas → 08 · Conectar → 04 |
| 12 | V2Invitar | Premio (gorra dorada por 3 amigos), 4 ranuras de progreso, enlace con Copiar, WhatsApp / Instagram / Más, botón Mostrar mi QR de invitación | → 04 |

Barra (DockV2): píldora de 327×66 con 4 íconos: Inicio, QR (Conectar), Conexiones, Perfil. La "gota" de color viaja al activo y muestra su nombre; los demás se recorren. Colores por pestaña: cielo, menta, chicle, sol. Presente en 03, 03b, 04, 07, 09.

## Reglas de negocio

**Conectar es de dos pasos.** A escanea a B y registra (05). B recibe la solicitud (06b). Hasta que B acepta, ninguno ve las redes del otro. Al aceptar, los dos ganan +20 y aparecen en sus Conexiones.

**Puntos**

| Acción | Puntos |
|---|---|
| Conexión nueva | +50 |
| Reencuentro (ya se habían conectado antes) | +20 |
| Marcar temas de la plática | +5 |
| Nota de voz guardada | +15 |
| Aceptar una solicitud | +20 para cada uno |
| Amigo invitado que entra y hace su primera conexión | +100 para ti, +50 para él |
| Invitar 3 amigos | Gorra dorada para el monito |

**Ranking.** Dos alcances: Esta noche (solo el evento activo) y Todo el año. Posición, puntos, delta de posición y cuánto falta para pasar al siguiente.

**Redes y privacidad.** Cada persona elige en su perfil qué redes comparte (LinkedIn, Instagram, WhatsApp, X). Solo se muestran a quien ya conectó contigo. Las apagadas no se muestran a nadie.

**IA.** La nota de voz se transcribe y se resume: título de una línea, 3 puntos, chips de temas, pendiente detectado (ej. "Presentar a Valeria con Andrea"). El resumen se muestra con la etiqueta de que lo generó Compa.

## Insignias (20)

| Categoría | Insignias | Cómo se ganan (propuesta) |
|---|---|---|
| Persona | Primer apretón, Madrugador, Cierre, Imán, Maratón | Primera conexión; conectar en la primera hora; conectar al final del evento; 10 personas te escanean; 15 conexiones en una noche |
| Pareja | Tres de tres, Puente, Dúo dinámico | 3 reencuentros con la misma persona; presentar a 3 personas; 3 eventos con la misma persona |
| Evento | Founders Fest 2026, OG | Asistir; estar entre los primeros 100 usuarios |
| Progreso | Conector 100, Trotamundos, Curioso, Memoria de elefante | 100 conexiones; 4 ciudades; 10 temas distintos; 20 notas de voz |
| Comunidad | 500 en la noche | El evento llega a 500 conexiones |
| Racha | Cuatro trimestres | 4 eventos seguidos |
| Secretas | Rey del reencuentro, Con el speaker, Noctámbulo, Cazatalentos | No se explican hasta ganarlas |

Estados: ganada (color) y bloqueada (gris). En perfiles se muestran 5 en una "repisa" (línea punteada, giradas de 3 a 6 grados). Ids en `componentes/Insignia.dc.html`.

## Monito

Pixel art de 16×20 celdas generado por código (`componentes/Monito.dc.html`, función `grid()`), se escala con `px`. Props del look: `piel`, `pelo` (corto, largo, chongo, rizado), `peloColor`, `camisa`, `ropa` (lisa por defecto), `pantalon`, `tenis`, `gorra` (ninguna, gorra), `gorraColor`, `cara` (nada, lentes), `barba` (bool). Opciones expuestas al usuario en 02b:

- Piel: #FFE0C7, #F5C9A3, #E0A97F, #94603F, #5C3A21
- Pelo: corto, largo, chongo, rizado
- Color de pelo: #2A2438, #5A3825, #D9664F, #E8C170
- Camisa: #6BE4A3, #6CC4FF, #FF8FAB, #FFD93D, #FF6B4A, #1E1B2E
- Extras: gorra, lentes, barba (combinables)

`Avatar` mapea iniciales de personas de muestra (DR Diego, VO Valeria, RP Rodrigo, ST Sofía, XS Ximena, CI Carlos, PN Paola, AM Andrea, MG) a un look; `size` lo muestra como cabeza redonda, `px` como cuerpo completo. Fuera de V2: clóset con ropa desbloqueable, mascotas, monitos sombreados.

## Sistema visual

- Fondo "papel" #FFF6E5 con puntos (radial-gradient rgba(30,27,46,0.07) cada 22 px). Tinta #1E1B2E. Gris de texto secundario #6F6A7E.
- Acentos: Menta #6BE4A3, Cielo #6CC4FF, Chicle #FF8FAB, Sol #FFD93D, Coral #FF6B4A. Claros: #DDF8EA, #DDF1FF, #FFE3EA, #FFF3BF, #FFE1D9. LinkedIn #0A66C2 solo en su botón.
- Tipografía: Fredoka 700 para títulos, números y botones; Nunito 700/800 para texto. Etiquetas de sección: 11 px, 800, mayúsculas, tracking 1.6.
- Bordes 2.5 px tinta. Sombras duras sin blur: 4×4 tarjetas, 3×3 botones de ícono y tarjetas chicas, 2×2 chips. Radios: 22 tarjetas, 16 botones y tarjetas chicas, 10 u 11 chips, 44 el marco del teléfono.
- Padding de pantalla 48 arriba, 18 a los lados, gap 14 entre bloques. Botón principal 54 px de alto, menta. Botones de ícono 44×44. Áreas de toque mínimas 44 px.
- Animaciones: pares que suben en Inicio (7.5 s en loop), pop de puntos en Confirmación, gota del dock (0.8 s con rebote), confeti en Ranking. Todas respetan prefers-reduced-motion.

## Pendientes conocidos (no están en las pantallas)

Solicitud enviada (lado de quien escanea, mientras el otro acepta); Avisos (la campana de Inicio); Permiso de cámara antes de Escanear; Inicio fuera de evento; Compartir tarjeta a stories; cronómetro al grabar; límite de 3 temas; insignia bloqueada y sticker NUEVA en la repisa.

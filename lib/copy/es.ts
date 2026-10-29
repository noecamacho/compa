// Every string the attendee sees, in Spanish (product decision, wiki/open-questions.md #6). Copy comes from design/compa-v2.
// The sections the landing and event entry use also exist in English (lib/copy/en.ts); lib/copy/index.ts picks one per locale.

export const common = {
  back: "Regresar",
  close: "Cerrar",
  done: "Listo",
  notNow: "Ahora no",
  points: "pts",
  live: "EN VIVO",
  liveShort: "Vivo",
  seeAll: "ver todas",
  of: "de",
  you: "Tú",
};

export const profile = {
  title: "Tu perfil",
  subtitle: "Tu nombre viene de LinkedIn. Agrega tu puesto, empresa y ciudad.",
  fromLinkedIn: "Nombre de LinkedIn",
  name: "Nombre",
  role: "Puesto",
  company: "Empresa",
  city: "Ciudad",
  linksLabel: "Redes que compartes",
  linksOnlyConnections: "Solo las ven tus conexiones",
  linksHint: "Las apagadas no se muestran a nadie. Lo cambias cuando quieras desde tu perfil.",
  next: "Siguiente: tu monito",
  step: "Paso 1 de 2",
  save: "Guardar",
  saving: "Guardando…",
};

export const monito = {
  title: "Tu monito",
  random: "Al azar",
  hint: "Así te van a ver en el evento. Pocas opciones a propósito: lo demás lo ganas conectando.",
  skin: "Piel",
  hair: "Pelo",
  hairColor: "Color",
  shirt: "Camisa",
  extras: "Extras",
  skinNames: { "very-light": "Muy clara", light: "Clara", medium: "Media", brown: "Morena", dark: "Oscura" },
  hairNames: { short: "Corto", long: "Largo", bun: "Chongo", curly: "Rizado" },
  hairColorNames: { black: "Negro", brown: "Café", red: "Pelirrojo", blond: "Rubio" },
  shirtNames: { mint: "Menta", sky: "Cielo", gum: "Chicle", sun: "Sol", coral: "Coral", ink: "Tinta" },
  extraNames: { cap: "Gorra", glasses: "Lentes", beard: "Barba" },
  done: "Listo, entrar",
  step: "Paso 2 de 2 · lo puedes cambiar desde tu perfil",
  labelOwn: "Tu monito",
};

export const home = {
  hello: (name: string) => `Hola, ${name}`,
  alerts: (count: number) => (count ? `Avisos, ${count} nuevos` : "Avisos"),
  until: (name: string, hour: string) => `${name} · hasta las ${hour}`,
  connectionsTonight: "conexiones esta noche",
  pairsNow: "Conexiones que están pasando ahora",
  pair: (a: string, b: string) => `${a} y ${b}`,
  rank: (rank: number, points: string) => ["Vas en el ", `#${rank}`, ` con ${points} pts`] as const,
  firstConnection: "Tu primera conexión te mete al ranking",
  connect: "Conectar",
  connectHint: "Muestra tu QR o escanea",
  connectHintEmpty: "Escanea a la primera persona que conozcas",
  startHere: "Empieza aquí",
  inviteTitle: "Invita 3 y gana la gorra dorada",
  invitePoints: "+100 pts por cada amigo que entre",
  inviteProgress: (done: number, total: number) => `${done} de ${total} amigos invitados`,
  inviteLeft: (left: number) => `faltan ${left}`,
  goldenCapLabel: "Tu monito con la gorra dorada",
  noEventTitle: "No estás en un evento ahora",
  noEventHint: "Escanea el QR de tu evento para entrar y ver quién está conectando.",
};

export const connect = {
  title: "Conectar",
  invite: "Invitar",
  modeLabel: "Modo",
  myQr: "Mi QR",
  scan: "Escanear",
  qrLabel: (name: string) => `Código QR de ${name}`,
  showIt: "Muéstralo para que te escaneen.",
  aim: "Apunta a su QR",
  connectButton: "Conectar",
  searchLabel: "Buscar por nombre",
  searchPlaceholder: "¿No sale el QR? Busca por nombre",
  cameraUnavailable: "Sin cámara aquí. Pide que te escaneen o busca por nombre.",
  notFound: "No encontramos a nadie con ese nombre.",
};

export const register = {
  title: "Registrar",
  alreadyKnew: "Ya se conocían",
  typeLabel: "Tipo de conexión",
  newType: "Nueva",
  reconnectionType: "Reencuentro",
  topicsLabel: "¿De qué hablaron?",
  topics: ["Levantar capital", "IA", "Proptech", "Contratar", "Ventas B2B", "Fintech"],
  noteTitle: "O cuéntaselo a Compa",
  noteHint: "Nota de voz, opcional · +15 pts",
  recording: (time: string) => `Grabando · ${time}`,
  tapToStop: "Toca para terminar",
  noteSaved: (time: string) => `Nota guardada · ${time}`,
  noteSavedHint: "Compa agrega los temas que falten",
  rerecord: "Regrabar",
  confirm: (points: number) => `Confirmar · +${points} pts`,
  sending: "Enviando…",
  micUnavailable: "No pudimos usar el micrófono; puedes seguir sin nota.",
};

export const confirmation = {
  points: (points: number) => `+${points} pts`,
  titleNew: (name: string) => `Conectaste con ${name}`,
  titleReconnection: (name: string) => `Reencuentro con ${name}`,
  titlePending: (name: string) => `Solicitud enviada a ${name}`,
  breakdownKind: (kind: "new" | "reconnection", points: number) => `+${points} ${kind === "new" ? "nueva" : "reencuentro"}`,
  breakdownTopics: (points: number) => `+${points} temas`,
  breakdownNote: (points: number) => `+${points} por la nota`,
  talkedAbout: "De qué platicaron",
  fromNote: (time: string) => `De tu nota · ${time}`,
  connectWith: (name: string) => `Conecta con ${name}`,
  keepTalking: "Para seguir la plática",
  linkLabel: (network: string, name: string) => `${network} de ${name}`,
  pendingNote: "Cuando acepte, verás sus redes aquí.",
};

export const request = {
  badge: "Nueva solicitud",
  title: (name: string) => `${name} quiere conectar contigo`,
  scannedAgo: (ago: string, topics: string) => `Te escaneó ${ago} · ${topics}`,
  mutual: "en común",
  connections: "conexiones",
  events: "eventos",
  mutualLabel: "En común",
  interestsLabel: "Le interesa platicar de",
  bothWin: "Al aceptar, los dos ganan +20 pts y aparecen en sus conexiones.",
  accept: "Aceptar",
  accepting: "Aceptando…",
  names: (names: string[]) => (names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} y ${names.at(-1)}`),
};

export const connections = {
  title: "Conexiones",
  search: "Buscar en mis conexiones",
  filterLabel: "Filtrar por tipo",
  filters: { all: "Todas", new: "Nuevas", reconnection: "Reencuentros", friend: "Amigos" },
  types: { new: "Nueva", reconnection: "Reencuentro", friend: "Amigo" },
  empty: "Todavía no tienes conexiones. Escanea a la primera persona que conozcas.",
};

export const person = {
  connected: "Conectados",
  pending: "Pendiente",
  notConnected: "Sin conectar",
  badges: "Sus insignias",
  badgesCount: (earned: number, total: number) => `${earned} de ${total} · ver todas`,
  reconnections: "reencuentros",
  eventsTogether: "eventos juntos",
  mutual: "en común",
  lastTime: "La última vez",
  today: "Hoy",
  mutualConnections: "Conexiones en común",
  pointsRank: (points: string, rank: number | null) => (rank ? `${points} pts · #${rank}` : `${points} pts`),
};

export const note = {
  title: "Cuéntale a Compa",
  reconnectionAgo: (kind: string, ago: string) => `${kind} · ${ago}`,
  recording: (time: string) => `Grabando · ${time}`,
  question: "¿De qué platicaron?",
  hint: "Dilo como se lo contarías a un amigo. Compa lo resume por ti.",
  stop: "Terminar grabación",
  tapToStop: "Toca para terminar",
  understood: "Lo que Compa entendió",
  pendingLabel: "Pendiente detectado",
  remind: "Recordar",
  pointsNote: "+15 pts por guardar la nota",
  save: "Guardar en la conexión",
  saving: "Guardando…",
  rerecord: "Regrabar",
  edit: "Editar",
  transcribing: "Compa está escuchando…",
  failed: "No pudimos resumir la nota. Escribe de qué hablaron:",
  notePlaceholder: "Escribe de qué hablaron",
  draftButton: "Resumir",
};

export const me = {
  myQr: "Mi QR",
  edit: "Editar perfil",
  changeMonito: "Tu monito, cámbialo",
  badges: "Insignias",
  badgesCount: (earned: number, total: number) => `${earned} de ${total} · ver todas`,
  newConnections: "nuevas",
  reconnections: "reencuentros",
  events: "eventos",
  linksLabel: "Redes que compartes",
  hidden: "oculto",
  ranking: "Ranking",
  myMonito: "Mi monito",
  change: "Cambiar",
  pointsRank: (points: string, rank: number | null) => (rank ? `${points} pts · #${rank}` : `${points} pts`),
};

export const badges = {
  title: "Insignias",
  earned: (earned: number, total: number) => `${earned} de ${total} ganadas`,
  summary: (close: number, secret: number) => `${close} a punto · ${secret} secretas`,
  filterLabel: "Filtrar insignias",
  filters: { all: "Todas", earned: "Ganadas", pending: "Por ganar" },
  secret: "Secreta: descúbrela",
  progress: (current: number, total: number, label: string) => `${current} / ${total} ${label}`,
  barLabel: "Insignias ganadas",
};

export const ranking = {
  title: "Top del evento",
  scopeLabel: "Alcance del ranking",
  tonight: "Esta noche",
  allYear: "Todo el año",
  youRank: (rank: number | null) => (rank ? `Tú · #${rank}` : "Tú · sin lugar"),
  youSub: (points: string, extra: string) => `${points} pts · ${extra}`,
  toPass: (name: string) => `Para pasar a ${name}`,
  pointsShort: (points: number) => `${points} pts`,
  connectNow: "Conectar ahora",
  noRank: "Haz tu primera conexión para entrar al ranking.",
  first: "Vas en primer lugar.",
  inEvents: (count: number) => `en ${count} eventos`,
  tonightSub: "esta noche",
};

export const invite = {
  title: "Invita amigos",
  prize: "Invita 3 y gana la gorra dorada",
  prizeDetail: ["Cada amigo que entre te da ", "+100 pts", " y a él le da ", "+50", " para arrancar."],
  invitees: "Tus invitados",
  progress: (done: number, total: number) => `${done} de ${total}`,
  friendSlot: (n: number) => `Amigo ${n}`,
  cap: "Gorra",
  link: "Tu enlace",
  copy: "Copiar",
  copied: "Copiado",
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  more: "Más",
  footer: ["Tu amigo entra con LinkedIn, igual que tú.", "Cuando haga su primera conexión, te llega el +100."],
  showQr: "Mostrar mi QR de invitación",
  shareText: (url: string) => `Vente a Compa, conectamos en el evento y nos quedamos con las redes: ${url}`,
  pointsEach: "+100 pts",
};

export const networks = {
  linkedin: "LinkedIn",
  instagram: "Instagram",
  whatsapp: "WhatsApp",
  x: "X",
};

export const time = {
  minutesAgo: (minutes: number) => (minutes < 1 ? "hace un momento" : minutes === 1 ? "hace 1 min" : `hace ${minutes} min`),
  hoursAgo: (hours: number) => (hours === 1 ? "hace 1 h" : `hace ${hours} h`),
  today: "Hoy",
  clock: (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`,
};

// compa.lol for everyone (API spec A10). No sign-up: people get in through their event's QR.
export const landing = {
  brand: "compa",
  title: ["Conecta en el evento.", "Recuérdalo después."],
  lead: "Escanea el QR de quien conozcas, quédate con sus redes y de qué hablaron, y gana puntos para tu monito.",
  doorTitle: "Solo entras escaneando el QR de tu evento.",
  doorHint: "Está en la entrada y en la pantalla del evento. Apúntale con la cámara de tu teléfono.",
  backToEvent: "Volver a mi evento",
  signInError: "No pudimos entrar con LinkedIn. Escanea el QR de tu evento otra vez.",
  sceneLabel: "Dos monitos se conectan y ganan +50",
  sampleTopic: "Levantar capital",
};

// /e/<code>: the event door.
export const door = {
  live: "EN VIVO",
  invitedTo: "Estás en la puerta de",
  checkedIn: "personas adentro",
  connections: "conexiones",
  cta: "Entrar con LinkedIn",
  ctaSignedIn: "Entrar al evento",
  note: "De LinkedIn solo tomamos tu nombre, tu foto y tu correo. Nunca publicamos nada por ti.",
  notStarted: (hour: string) => `Las puertas abren a las ${hour}. Vuelve a escanear entonces.`,
  ended: "Este evento ya terminó. Gracias por venir.",
  watchLive: "Ver la pantalla en vivo",
};

// /e/<code>/join: check-in with the big-screen notice (A1, M13).
export const join = {
  title: "Antes de entrar",
  notice: "Mientras dure el evento, tu nombre y tu foto aparecen en la pantalla grande. Tus redes y tus notas, no.",
  accept: "Aceptar y entrar",
  sending: "Entrando…",
  cancel: "Ahora no",
  notRunning: "El evento no está abierto ahora.",
  failed: "No pudimos registrarte. Inténtalo otra vez.",
};

// /e/<code>/live: the projected dashboard (A5).
export const live = {
  live: "EN VIVO",
  checkedIn: "personas",
  connections: "conexiones",
  newCount: "nuevas",
  reconnections: "reencuentros",
  legendNew: "Conexión nueva",
  legendReconnection: "Reencuentro",
  leaderboard: "Top conectores",
  empty: "Aún no hay conexiones. La primera aparece aquí.",
  scanToJoin: "Escanea para entrar",
  hint: "Toca a una persona para ver su tarjeta, o el espacio vacío para ver el ranking.",
  vizLabel: "Red de conexiones del evento",
  points: "pts",
  personConnections: "conexiones",
  rank: "lugar",
  close: "Ver ranking",
  loading: "Cargando…",
  noWebgl: "Este navegador no puede dibujar la red. Los números siguen en vivo.",
  stale: "Reconectando…",
};

// Unknown or rotated event code: says nothing about whether the event exists.
export const eventNotFound = {
  title: "Este QR no abre ninguna puerta",
  body: "Revisa que escaneaste el QR de tu evento completo, o pide a quien lo organiza que te lo muestre otra vez.",
  home: "Ir a compa.lol",
};

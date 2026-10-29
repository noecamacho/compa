// Every string the attendee sees, in Spanish (product decision, wiki/open-questions.md #6). Copy comes from design/compa-v2.

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

export const welcome = {
  brand: "compa",
  title: ["Conecta en el evento.", "Recuérdalo después."],
  steps: [
    "Conecta con quien conozcas escaneando su QR",
    "Te quedas con sus redes y de qué hablaron",
    "Gana puntos y ropa para tu monito por cada conexión",
  ],
  modeLabel: "¿Cuenta nueva o ya tienes?",
  create: "Crear cuenta",
  signIn: "Ya tengo cuenta",
  ctaCreate: "Crear cuenta con LinkedIn",
  ctaSignIn: "Entrar con LinkedIn",
  noteCreate: "Tomamos tu nombre, puesto, empresa y ciudad. Nunca publicamos nada por ti.",
  noteSignIn: "Entras directo a tu perfil y tus conexiones.",
  sampleTopic: "Levantar capital",
  signInError: "No pudimos entrar con LinkedIn. Inténtalo otra vez.",
};

export const profile = {
  title: "Tu perfil",
  subtitle: "Lo jalamos de LinkedIn. Corrige lo que quieras.",
  fromLinkedIn: "Datos de LinkedIn",
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

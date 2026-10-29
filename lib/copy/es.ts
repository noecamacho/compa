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

// Progress labels per badge ("7 / 10 te escanearon") and the earned note.
export const badgeProgress = {
  labels: {
    apreton: "tu primera conexión",
    madrugador: "conecta en la primera hora",
    cierre: "conecta al final del evento",
    iman: "te escanearon",
    maraton: "en una noche",
    tresdetres: "reencuentros con la misma persona",
    puente: "presentaciones",
    duo: "eventos con alguien",
    ff2026: "asiste a Founders Fest",
    og: "de los primeros 100",
    conector100: "conexiones",
    trotamundos: "ciudades",
    curioso: "temas distintos",
    memoria: "notas de voz",
    quinientos: "del evento",
    cuatro: "eventos seguidos",
  } as Record<string, string>,
  earnedOn: (date: Date) =>
    new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Mexico_City" }).format(date),
};

// Leaderboard hints under the progress bar (V2Ranking).
export const rankingTips = {
  first: "Vas en primer lugar.",
  gap: (gap: number) => (gap <= 50 ? "Una conexión nueva (+50) y la pasas." : `Te faltan ${gap} pts: ${Math.ceil(gap / 50)} conexiones nuevas.`),
};

// Guided onboarding: one spotlight per button, in the order a new person meets them.
export const tour = {
  step: (n: number, total: number) => `${n} de ${total}`,
  skip: "Saltar",
  back: "Atrás",
  next: "Siguiente",
  done: "¡Entendido!",
  replay: "Guía rápida",
  home: [
    { target: "live", title: "Esto es lo que pasa en el evento", body: "Cuántas conexiones van esta noche, quiénes se acaban de conectar y en qué lugar vas tú. Toca la fila de abajo para ver el ranking completo." },
    { target: "connect", title: "Aquí conectas con la gente", body: "Es el botón principal. Muestra tu QR para que te escaneen, o escanea el de la otra persona. Cada conexión nueva vale +50 pts; un reencuentro, +20." },
    { target: "invite", title: "Invita a tus amigos", body: "Comparte tu enlace. Cada amigo que entre y haga su primera conexión te da +100 pts, y con tres ganas la gorra dorada para tu monito." },
    { target: "dock", title: "Tu barra de siempre", body: "Inicio, Conectar (tu QR), tus Conexiones con lo que platicaron, y tu Perfil con puntos, insignias y las redes que compartes." },
  ],
  connect: [
    { target: "mode", title: "Dos formas de conectar", body: "\"Mi QR\" lo enseñas para que te escaneen. \"Escanear\" abre la cámara para leer el QR de la otra persona; si no sale, búscala por nombre." },
    { target: "qr", title: "Tu QR personal", body: "Cualquier cámara lo lee y abre tu tarjeta en Compa. La otra persona registra la conexión y tú recibes la solicitud para aceptarla." },
  ],
  register: [
    { target: "kind", title: "¿Nueva o reencuentro?", body: "Nueva si es la primera vez que se conectan (+50). Reencuentro si ya se conocían (+20). Si ya aparece en tus conexiones, lo marcamos solos." },
    { target: "topics", title: "¿De qué hablaron?", body: "Marca hasta tres temas. Te quedan guardados con la persona y suman +5 pts." },
    { target: "note", title: "Cuéntaselo a Compa", body: "Graba una nota de voz de hasta dos minutos. Compa la resume en un título, tres puntos y un pendiente. Vale +15 pts al guardarla." },
    { target: "confirm", title: "Manda la solicitud", body: "La otra persona la acepta desde su teléfono y, hasta entonces, nadie ve las redes del otro. Al aceptar, los dos ganan los puntos." },
  ],
  me: [
    { target: "avatar", title: "Tu monito", body: "Así te ven en el evento. Tócalo para cambiarlo; con el tiempo ganas ropa y accesorios por conectar." },
    { target: "links", title: "Las redes que compartes", body: "Enciende solo las que quieras mostrar. Nadie las ve hasta que acepta una conexión contigo; las apagadas no se muestran a nadie." },
    { target: "badges", title: "Tus insignias", body: "Las ganas por conectar: la primera, madrugador, maratón… Hay cuatro secretas que no te decimos cómo se ganan." },
  ],
  ranking: [
    { target: "scope", title: "Esta noche o todo el año", body: "El ranking de esta noche cuenta solo el evento actual; el del año suma todos los eventos a los que has ido." },
    { target: "you", title: "Tú en el ranking", body: "Tu lugar, tus puntos y cuánto te falta para pasar a la persona de arriba. Una conexión nueva suele bastar." },
  ],
  incoming: {
    title: (name: string) => `${name} quiere conectar contigo`,
    hint: "Toca para ver quién es y aceptar.",
    view: "Ver",
  },
  outsideEvent: {
    title: "No estás en un evento ahora",
    body: "Cuando llegues a uno, escanea el QR de la entrada para registrarte y empezar a conectar.",
  },
};

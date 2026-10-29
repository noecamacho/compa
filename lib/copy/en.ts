// English copy for the screens that exist in both languages (landing and event entry, API spec A10).
// Each section has the same shape as its Spanish twin in lib/copy/es.ts; add a section here to translate another screen.
import type * as es from "./es";

export const landing: typeof es.landing = {
  brand: "compa",
  title: ["Meet people at the event.", "Remember them after."],
  lead: "Scan the QR of anyone you meet, keep their socials and what you talked about, and earn points for your monito.",
  doorTitle: "Have an event QR? Scan it to join.",
  doorHint: "It's at the entrance and on the event screen. Point your phone camera at it.",
  backToEvent: "Back to my event",
  goToAccount: "Go to my account",
  signIn: "Sign in with LinkedIn",
  signInNote: "New here or coming back? Same button. We only take your name, photo and email.",
  signInError: "We couldn't sign you in. Please try again.",
  sceneLabel: "Two monitos connect and earn +50",
  sampleTopic: "Raising capital",
};

export const door: typeof es.door = {
  live: "LIVE",
  invitedTo: "You're at the door of",
  checkedIn: "people inside",
  connections: "connections",
  cta: "Enter with LinkedIn",
  ctaSignedIn: "Enter the event",
  note: "From LinkedIn we only take your name, photo and email. We never post anything for you.",
  notStarted: (hour: string) => `Doors open at ${hour}. Scan again then.`,
  ended: "This event has ended. Thanks for coming.",
  watchLive: "Watch the live screen",
  orEmail: "or enter with your email",
  emailLabel: "Email",
  emailPlaceholder: "you@email.com",
  emailCta: "Send me a link",
  emailSending: "Sending…",
  emailSent: (email: string) => `Done. Open the link we sent to ${email} on this phone.`,
  emailFailed: "We couldn't send the email. Check the address and try again.",
};

export const join: typeof es.join = {
  title: "Before you go in",
  notice: "While the event runs, your name and photo appear on the big screen. Your socials and notes don't.",
  accept: "Accept and go in",
  sending: "Going in…",
  cancel: "Not now",
  notRunning: "The event isn't open right now.",
  failed: "We couldn't check you in. Try again.",
};

export const live: typeof es.live = {
  live: "LIVE",
  checkedIn: "people",
  connections: "connections",
  newCount: "new",
  reconnections: "reconnections",
  legendNew: "New connection",
  legendReconnection: "Reconnection",
  leaderboard: "Top connectors",
  empty: "No connections yet. The first one shows up here.",
  scanToJoin: "Scan to join",
  hint: "Tap a person to see their card, or empty space for the leaderboard.",
  vizLabel: "The event's connection network",
  points: "pts",
  personConnections: "connections",
  rank: "rank",
  close: "Show leaderboard",
  loading: "Loading…",
  noWebgl: "This browser can't draw the network. The numbers stay live.",
  stale: "Reconnecting…",
};

export const eventNotFound: typeof es.eventNotFound = {
  title: "This QR doesn't open any door",
  body: "Check that you scanned your event's whole QR, or ask the organizers to show it again.",
  home: "Go to compa.lol",
};

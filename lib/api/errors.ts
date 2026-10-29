// Error body for every route (API spec §3): { error: { code, message, fields? } }.
export type ErrorFieldMap = Record<string, string[]>;

export type ErrorBody = { error: { code: string; message: string; fields?: ErrorFieldMap } };

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fields?: ErrorFieldMap,
  ) {
    super(message);
    this.name = "ApiError";
  }

  toBody(): ErrorBody {
    const fields = this.fields ? { fields: this.fields } : {};
    return { error: { code: this.code, message: this.message, ...fields } };
  }
}

export const errorResponse = (error: ApiError, headers?: HeadersInit): Response =>
  Response.json(error.toBody(), { status: error.status, headers });

// Documented error of one route: status, code and the example message the mock mode returns.
export type ErrorSpec = { status: number; code: string; message: string; fields?: ErrorFieldMap };

export const toApiError = (spec: ErrorSpec): ApiError =>
  new ApiError(spec.status, spec.code, spec.message, spec.fields);

const spec = (status: number, code: string, message: string, fields?: ErrorFieldMap): ErrorSpec => ({
  status,
  code,
  message,
  ...(fields ? { fields } : {}),
});

// Every error code the API returns. Routes pick the subset they document.
export const E = {
  invalidInput: spec(400, "invalid_input", "Some fields are invalid.", { name: ["Too small: expected string to have >=1 characters"] }),
  invalidAudio: spec(400, "invalid_audio", "The audio could not be read. Type the note instead."),
  unauthorized: spec(401, "unauthorized", "Sign in with LinkedIn to continue."),
  forbidden: spec(403, "forbidden", "You cannot do this."),
  notAdmin: spec(403, "forbidden", "Only COMPA admins can create events."),
  notAuthor: spec(403, "not_author", "Only the author of the summary can approve it."),
  notFound: spec(404, "not_found", "Not found."),
  userNotFound: spec(404, "user_not_found", "No person with that handle."),
  // Same body for a malformed, unknown or rotated code: it never hints whether an event exists (A10).
  eventNotFound: spec(404, "event_not_found", "Event not found."),
  connectionNotFound: spec(404, "connection_not_found", "No connection with that id for you."),
  attendeeNotFound: spec(404, "attendee_not_found", "That person is not checked in to this event."),
  slugTaken: spec(409, "slug_taken", "An event with that slug already exists."),
  eventNotRunning: spec(409, "event_not_running", "The event is not running right now."),
  selfConnection: spec(409, "self_connection", "You cannot connect with yourself."),
  notAtEvent: spec(409, "not_at_event", "That person is not at an event right now."),
  consentRequired: spec(409, "consent_required", "Accept that your name and photo appear on the event screen, then retry with screenConsent: true."),
  notPending: spec(409, "not_pending", "This request was already answered."),
  eventEnded: spec(409, "event_ended", "The event has ended; the request expired."),
  connectionNotAccepted: spec(409, "connection_not_accepted", "The other person has to accept the connection first."),
  notSubstantive: spec(409, "not_substantive", "The summary does not describe a conversation."),
  alreadyApproved: spec(409, "already_approved", "This connection already has an approved summary."),
  internal: spec(500, "internal_error", "Something went wrong."),
  notImplemented: spec(501, "not_implemented", "This route only works in mock mode for now."),
  transcriptionFailed: spec(502, "transcription_failed", "Transcription failed. Type the note instead."),
  summaryFailed: spec(502, "summary_failed", "The summary could not be drafted. Retry."),
} as const satisfies Record<string, ErrorSpec>;

export const fail = (error: ErrorSpec, message = error.message): never => {
  throw new ApiError(error.status, error.code, message);
};

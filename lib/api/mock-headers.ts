export const MOCK_HEADERS = {
  mock: "x-compa-mock",
  error: "x-compa-mock-error",
  // "documented": routes that do not document the chosen error answer their success example instead of 400.
  errorScope: "x-compa-mock-error-scope",
  status: "x-compa-mock-status",
  example: "x-compa-mock-example",
} as const;

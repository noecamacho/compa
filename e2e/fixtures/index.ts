// One `test` with every fixture: mock (mock mode), realUser, testEvent and twoUsers (real mode).
import { mergeTests } from "@playwright/test";
import { ApiClientError } from "../../lib/api/client";
import { errorText } from "../../lib/api/error-text";
import { copyFor } from "../../lib/copy";
import type { Locale } from "../../lib/i18n";
import type { ErrorSpec } from "../../lib/api/errors";
import { test as mockTest } from "./mock";
import { test as realTest } from "./two-users";

export const test = mergeTests(mockTest, realTest);
export { expect } from "@playwright/test";
export { TEST_EVENT_SLUG } from "./real-mode";

// What the attendee reads for an API error: the copy errorText picks (lib/api/error-text.ts), never the API message.
export const errorCopy = (error: ErrorSpec, locale: Locale = "es"): string => errorText(copyFor(locale), new ApiClientError(error.status, error.code, error.message));

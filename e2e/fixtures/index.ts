// One `test` with every fixture: mock (mock mode), realUser, testEvent and twoUsers (real mode).
import { mergeTests } from "@playwright/test";
import { test as mockTest } from "./mock";
import { test as realTest } from "./two-users";

export const test = mergeTests(mockTest, realTest);
export { expect } from "@playwright/test";
export { TEST_EVENT_SLUG } from "./real-mode";

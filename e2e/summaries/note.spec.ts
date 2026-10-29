// 08b NotaVoz (F-37): read the saved draft, type or record a note, draft it (default, fallback, not substantive),
// approve it (+15) and every documented error. The note copy is Spanish-only, so both locales assert lib/copy/es.
import type { Page, Request } from "@playwright/test";
import { E } from "../../lib/api/errors";
import { connectionDetail, draft, ids, valeriaConnected } from "../../lib/api/examples";
import { approveSummary, draftSummary, transcribe } from "../../lib/api/routes";
import { Me } from "../../lib/api/schemas";
import { common, connections, note } from "../../lib/copy/es";
import { SUMMARY_POINTS } from "../../lib/points";
import { acceptedConnection, call, expect, expectApiError, expectNotFound, sendRequest, test } from "../profiles/helpers";

const NOTE = `/connections/${ids.connection}/note`;
const DRAFT_URL = "**/api/interactions/draft";
const APPROVE_URL = "**/api/interactions/*/approve";
const TYPED = "Hablamos de su serie A y quedé de presentarla con Andrea la próxima semana.";
const fallbackExample = draftSummary.success.examples?.fallback?.value;
const transcriptExample = transcribe.success.example;

const isPost = (suffix: string) => (request: Request) => request.method() === "POST" && new URL(request.url()).pathname.endsWith(suffix);
const pointsNote = note.pointsNote.replace("15", String(SUMMARY_POINTS));

// From the saved draft, "Editar" opens the text box with the note so far.
async function openTyping(page: Page): Promise<void> {
  await page.goto(NOTE);
  await page.getByRole("button", { name: note.edit }).click();
  await expect(page.getByPlaceholder(note.notePlaceholder)).toBeVisible();
}

async function draftTyped(page: Page, text = TYPED): Promise<Request> {
  await page.getByPlaceholder(note.notePlaceholder).fill(text);
  const sent = page.waitForRequest(isPost("/api/interactions/draft"));
  await page.getByRole("button", { name: note.draftButton }).click();
  return sent;
}

test.describe("voice note in mock mode", () => {
  test("shows the saved draft with its points and links back to the person @mock", async ({ page }) => {
    await page.goto(NOTE);
    const interaction = connectionDetail.interaction;
    if (!interaction) throw new Error("the mock detail has no interaction");
    await expect(page.getByRole("heading", { name: note.title })).toBeVisible();
    await expect(page.getByText(valeriaConnected.name, { exact: true })).toBeVisible();
    await expect(page.getByText(new RegExp(`^${connections.types.reconnection} · `))).toBeVisible();
    await expect(page.getByText(note.understood)).toBeVisible();
    await expect(page.getByText(interaction.title, { exact: true })).toBeVisible();
    for (const bullet of interaction.bullets) await expect(page.getByText(bullet, { exact: true })).toBeVisible();
    for (const topic of interaction.topics) await expect(page.getByText(topic, { exact: true }).first()).toBeVisible();
    await expect(page.getByText(note.pendingLabel)).toBeVisible();
    await expect(page.getByText(pointsNote)).toBeVisible();
    await expect(page.getByRole("link", { name: common.back })).toHaveAttribute("href", `/people/${valeriaConnected.handle}`);
  });

  test("approving sends the summary and opens the person (+15) @mock", async ({ page }) => {
    await page.goto(NOTE);
    const interaction = connectionDetail.interaction;
    if (!interaction) throw new Error("the mock detail has no interaction");
    const sent = page.waitForRequest(isPost("/approve"));
    await page.getByRole("button", { name: note.save }).click();
    const request = await sent;
    expect(new URL(request.url()).pathname).toBe(`/api/interactions/${interaction.id}/approve`);
    expect(request.postDataJSON()).toMatchObject({ summary: interaction.bullets.join(" "), title: interaction.title, pendingAction: interaction.pendingAction });
    await expect(page).toHaveURL(new RegExp(`/people/${valeriaConnected.handle}$`));
  });

  test("a double tap on save sends one approval @mock", async ({ page }) => {
    await page.goto(NOTE);
    const approvals: string[] = [];
    page.on("request", (request) => isPost("/approve")(request) && approvals.push(request.url()));
    await page.getByRole("button", { name: note.save }).dblclick();
    await expect(page).toHaveURL(new RegExp(`/people/${valeriaConnected.handle}$`));
    expect(approvals).toHaveLength(1);
  });

  test("typing a note drafts it with the default example @mock", async ({ page }) => {
    await openTyping(page);
    const textbox = page.getByPlaceholder(note.notePlaceholder);
    await textbox.fill("   ");
    await expect(page.getByRole("button", { name: note.draftButton })).toBeDisabled();
    const request = await draftTyped(page);
    expect(request.postDataJSON()).toEqual({ connectionId: ids.connection, text: TYPED });
    await expect(page.getByText(draft.summary, { exact: true })).toBeVisible();
    for (const step of draft.nextSteps) await expect(page.getByText(step, { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: note.save })).toBeEnabled();
  });

  test("the fallback draft keeps the person's own text @mock", async ({ page, mock }) => {
    if (!fallbackExample) throw new Error("the fallback example is missing");
    await mock.mockExample("fallback", DRAFT_URL);
    await openTyping(page);
    await draftTyped(page);
    await expect(page.getByText(fallbackExample.summary, { exact: true })).toBeVisible();
    await expect(page.getByText(draft.nextSteps[1] ?? "", { exact: true })).toHaveCount(0);
  });

  test("a not substantive draft cannot be approved @mock", async ({ page, mock }) => {
    await mock.mockExample("notSubstantive", DRAFT_URL);
    await mock.mockError("not_substantive", APPROVE_URL);
    await openTyping(page);
    await draftTyped(page, "hola");
    await page.getByRole("button", { name: note.save }).click();
    await expect(page.getByText(E.notSubstantive.message)).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`${NOTE}$`));
  });

  for (const [code, text] of [
    ["summary_failed", E.summaryFailed.message],
    ["connection_not_accepted", E.connectionNotAccepted.message],
    ["not_found", E.notFound.message],
    ["invalid_input", E.invalidInput.message],
    ["rate_limited", common.rateLimited],
    ["limit_reached", common.limitReached],
  ] as const) {
    test(`a draft that fails with ${code} keeps the text and says why @mock`, async ({ page, mock }) => {
      expect(draftSummary.errors.map((error) => error.code)).toContain(code);
      await mock.mockError(code, DRAFT_URL);
      await openTyping(page);
      await draftTyped(page);
      await expect(page.getByText(text, { exact: true })).toBeVisible();
      await expect(page.getByPlaceholder(note.notePlaceholder)).toHaveValue(TYPED);
    });
  }

  for (const [code, text] of [
    ["already_approved", E.alreadyApproved.message],
    ["not_author", E.notAuthor.message],
    ["not_found", E.notFound.message],
  ] as const) {
    test(`an approval that fails with ${code} stays on the note @mock`, async ({ page, mock }) => {
      expect(approveSummary.errors.map((error) => error.code)).toContain(code);
      await mock.mockError(code, APPROVE_URL);
      await page.goto(NOTE);
      await page.getByRole("button", { name: note.save }).click();
      await expect(page.getByText(text, { exact: true })).toBeVisible();
      await expect(page).toHaveURL(new RegExp(`${NOTE}$`));
      await expect(page.getByRole("button", { name: note.save })).toBeEnabled();
    });
  }

  test("recording a note transcribes and drafts it @mock", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "only Chromium has the fake microphone");
    await page.goto(NOTE);
    await page.getByRole("button", { name: note.rerecord }).click();
    await expect(page.getByText(/^Grabando · /)).toBeVisible();
    const drafted = page.waitForRequest(isPost("/api/interactions/draft"));
    await page.getByRole("button", { name: note.stop }).click();
    expect((await drafted).postDataJSON()).toEqual({ connectionId: ids.connection, text: transcriptExample?.text });
    await expect(page.getByText(draft.summary, { exact: true })).toBeVisible();
  });

  test("an unknown connection is not found @mock", async ({ page, mock }) => {
    await mock.mockServerError("connection_not_found");
    await page.goto(NOTE);
    await expectNotFound(page);
  });
});

test.describe("voice note in real mode", () => {
  test("a person outside the connection gets not found @real", async ({ people }) => {
    const [ana, bruno, carla] = await people([{}, {}, {}]);
    if (!ana || !bruno || !carla) throw new Error("test users not created");
    const id = await acceptedConnection(ana, bruno);
    await carla.page.goto(`/connections/${id}/note`);
    await expectNotFound(carla.page);
    await expectApiError(await carla.page.request.post("/api/interactions/draft", { data: { connectionId: id, text: TYPED } }), 404, "not_found");
  });

  test("a pending request cannot be summarized yet @real", async ({ people }) => {
    const [ana, bruno] = await people([{}, {}]);
    if (!ana || !bruno) throw new Error("test users not created");
    const id = await sendRequest(ana, bruno.user);
    await ana.page.goto(`/connections/${id}/note`);
    await draftTyped(ana.page);
    await expect(ana.page.getByText(E.connectionNotAccepted.message, { exact: true })).toBeVisible();
    await expectApiError(await ana.page.request.post("/api/interactions/draft", { data: { connectionId: id, text: TYPED } }), 409, "connection_not_accepted");
    await expectApiError(await ana.page.request.post("/api/interactions/draft", { data: { connectionId: id, text: " " } }), 400, "invalid_input");
  });

  test("approving an unknown draft is not found @real", async ({ people }) => {
    const [ana] = await people([{}]);
    if (!ana) throw new Error("test user not created");
    const body = { summary: TYPED, topics: [], nextSteps: [] };
    await expectApiError(await ana.page.request.post(`/api/interactions/${ids.interaction}/approve`, { data: body }), 404, "not_found");
  });

  test("a note left on the register screen is drafted on arrival @real", async ({ people }) => {
    const [ana, bruno] = await people([{}, {}]);
    if (!ana || !bruno) throw new Error("test users not created");
    const id = await acceptedConnection(ana, bruno);
    await ana.context.addInitScript(([key, value]) => sessionStorage.setItem(key, value), [`compa:note:${id}`, JSON.stringify({ seconds: 12, text: TYPED })] as const);
    const drafted = ana.page.waitForRequest(isPost("/api/interactions/draft"));
    await ana.page.goto(`/connections/${id}/note`);
    expect((await drafted).postDataJSON()).toEqual({ connectionId: id, text: TYPED });
  });

  test("the author drafts and approves once: +15, then already_approved and not_author @real", async ({ people }) => {
    const [ana, bruno] = await people([{}, {}]);
    if (!ana || !bruno) throw new Error("test users not created");
    const id = await acceptedConnection(ana, bruno);
    await ana.page.goto(`/connections/${id}/note`);
    const response = ana.page.waitForResponse((r) => isPost("/api/interactions/draft")(r.request()));
    await draftTyped(ana.page);
    const drafted = await response;
    // The draft calls OpenAI; a server without OPENAI_API_KEY answers summary_failed, which the screen must say.
    if (drafted.status() === 502) {
      await expect(ana.page.getByText(E.summaryFailed.message, { exact: true })).toBeVisible();
      test.skip(true, "the real-mode server has no OpenAI key: approval needs a draft");
    }
    const { interactionId } = (await drafted.json()) as { interactionId: string };
    const approved = ana.page.waitForResponse((r) => isPost("/approve")(r.request()));
    await ana.page.getByRole("button", { name: note.save }).click();
    expect((await approved).status()).toBe(200);
    await expect(ana.page).toHaveURL(new RegExp(`/people/${bruno.user.handle}$`));
    const body = { summary: TYPED, topics: [], nextSteps: [] };
    await expectApiError(await ana.page.request.post(`/api/interactions/${interactionId}/approve`, { data: body }), 409, "already_approved");
    await expectApiError(await bruno.page.request.post(`/api/interactions/${interactionId}/approve`, { data: body }), 403, "not_author");
    const me = await call(ana.page.request, "GET", "/api/me", Me);
    expect(me.scores?.event.points).toBe(50 + SUMMARY_POINTS);
    await ana.page.goto(`/people/${bruno.user.handle}`);
    await expect(ana.page.getByRole("link", { name: /La última vez/ })).toHaveAttribute("href", `/connections/${id}/note`);
  });
});

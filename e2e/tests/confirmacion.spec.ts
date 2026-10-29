import type { Page } from "@playwright/test";
import { acceptedConnection, approvedNote, pendingRequest } from "../helpers/db";
import { alertIn, skipTours } from "../helpers/ui";
import { expect, test } from "../fixtures";

// Leaves a note recorded on the register screen waiting for the note screen (lib/note-draft.ts).
const rememberNote = (page: Page, connectionId: string, text: string) =>
  page.context().addInitScript(({ key, value }: { key: string; value: string }) => sessionStorage.setItem(key, value), {
    key: `compa:note:${connectionId}`,
    value: JSON.stringify({ seconds: 12, text }),
  });

// 06 Confirmación: exact points, the AI summary's loading and error states, Listo goes home, the summary opens the note.
test.describe("Confirmación", () => {
  test.beforeEach(async ({ context }) => skipTours(context));

  test("the total is the exact sum of what was chosen", async ({ pageA, world, userA, userB }) => {
    const id = await acceptedConnection(world, userA, userB, "new", ["IA", "Fintech"]);
    await pageA.goto(`/connections/${id}/done`);
    await expect(pageA.getByText("+55 pts")).toBeVisible();
    await expect(pageA.getByText("+50 nueva · +5 temas")).toBeVisible();
    await expect(pageA.getByRole("heading", { name: "Conectaste con Bruno" })).toBeVisible();

    await approvedNote(id, userA, "Hablamos de IA.", "IA para fintech", ["AI Products"], "Mandar el deck");
    await pageA.reload();
    await expect(pageA.getByText("+70 pts")).toBeVisible();
    await expect(pageA.getByText("+50 nueva · +5 temas · +15 por la nota")).toBeVisible();

    // The scanned person earns the kind only.
    const other = await world.addPerson({ name: "Carla Ríos" });
    const reconnection = await acceptedConnection(world, other, userA, "reconnection", ["IA"]);
    await pageA.goto(`/connections/${reconnection}/done`);
    await expect(pageA.getByText("+20 pts")).toBeVisible();
    await expect(pageA.getByRole("heading", { name: "Reencuentro con Carla" })).toBeVisible();
  });

  test("pending: zero points, no networks, and it refreshes itself when the other person accepts", async ({ pageA, pageB, world, userA, userB, contextB }) => {
    await skipTours(contextB);
    const id = await pendingRequest(world, userA, userB, ["Proptech"]);
    await pageA.goto(`/connections/${id}/done`);
    await expect(pageA.getByRole("heading", { name: "Solicitud enviada a Bruno" })).toBeVisible();
    await expect(pageA.getByText("+0 pts")).toBeVisible();
    await expect(pageA.getByText("Cuando acepte, verás sus redes aquí.")).toBeVisible();
    await pageB.goto(`/requests/${id}`);
    await pageB.getByRole("button", { name: "Aceptar" }).click();
    await expect(pageA.getByRole("heading", { name: "Conectaste con Bruno" })).toBeVisible({ timeout: 10_000 });
    await expect(pageA.getByText("+55 pts")).toBeVisible();
  });

  test("Listo and the close button go home; the summary opens the note", async ({ pageA, world, userA, userB }) => {
    const id = await acceptedConnection(world, userA, userB, "new");
    await approvedNote(id, userA, "Hablamos de IA.", "IA para fintech", ["AI Products"]);
    await pageA.goto(`/connections/${id}/done`);
    await expect(pageA.getByText("De qué platicaron")).toBeVisible();
    await pageA.getByRole("link", { name: /De qué platicaron/ }).click();
    await expect(pageA).toHaveURL(`/connections/${id}/note`);
    await pageA.goto(`/connections/${id}/done`);
    await pageA.getByRole("link", { name: "Listo" }).click();
    await expect(pageA).toHaveURL("/home");
    await pageA.goto(`/connections/${id}/done`);
    await pageA.getByRole("link", { name: "Cerrar" }).click();
    await expect(pageA).toHaveURL("/home");
  });

  test("the AI summary shows a loading state and a Spanish error when the API fails", async ({ pageA, world, userA, userB }) => {
    const id = await acceptedConnection(world, userA, userB, "new");
    await rememberNote(pageA, id, "Hablamos de levantar capital y de proptech.");
    await pageA.route("**/api/interactions/draft", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 800));
      await route.fulfill({ status: 502, contentType: "application/json", body: JSON.stringify({ error: { code: "summary_failed", message: "x" } }) });
    });
    await pageA.goto(`/connections/${id}/note`);
    await expect(pageA.getByText("Compa está escuchando…")).toBeVisible();
    await expect(alertIn(pageA)).toContainText("No pudimos resumir la nota.");
    await expect(pageA.getByRole("textbox")).toHaveValue("Hablamos de levantar capital y de proptech.");

    // Retrying with the API back drafts the summary (no OpenAI key: the text is kept verbatim).
    await pageA.unroute("**/api/interactions/draft");
    await pageA.getByRole("button", { name: "Resumir" }).click();
    await expect(pageA.getByText("Lo que Compa entendió")).toBeVisible();
    await expect(pageA.getByText("Hablamos de levantar capital y de proptech.").first()).toBeVisible();
  });

  test("an unknown connection shows the not-found screen", async ({ pageA }) => {
    await pageA.goto("/connections/00000000-0000-4000-8000-000000000000/done");
    await expect(pageA.getByRole("heading", { name: "Aquí no hay nada" })).toBeVisible();
  });
});

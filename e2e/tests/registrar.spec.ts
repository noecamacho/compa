import { acceptedConnection, connectionsBetween } from "../helpers/db";
import { fakeMicrophone, routeTranscript } from "../helpers/media";
import { alertIn, skipTours } from "../helpers/ui";
import { expect, test } from "../fixtures";

// 05 Registrar: kind changes the total, topics add +5 once, the voice note runs through its states, Confirmar sends a pending request.
test.describe("Registrar", () => {
  test.beforeEach(async ({ context }) => skipTours(context));

  test("Nueva and Reencuentro change the button total", async ({ pageA, userB }) => {
    await pageA.goto(`/connect/${userB.handle}`);
    const kinds = pageA.getByRole("group", { name: "Tipo de conexión" });
    await expect(kinds.getByRole("button", { name: /Nueva/ })).toHaveAttribute("aria-pressed", "true");
    await expect(pageA.getByRole("button", { name: "Confirmar · +50 pts" })).toBeVisible();
    await kinds.getByRole("button", { name: /Reencuentro/ }).click();
    await expect(pageA.getByRole("button", { name: "Confirmar · +20 pts" })).toBeVisible();
    await kinds.getByRole("button", { name: /Nueva/ }).click();
    await expect(pageA.getByRole("button", { name: "Confirmar · +50 pts" })).toBeVisible();
  });

  test("topics add +5 once, at most three", async ({ pageA, userB }) => {
    await pageA.goto(`/connect/${userB.handle}`);
    const chip = (name: string) => pageA.getByRole("button", { name, exact: true });
    await chip("IA").click();
    await expect(pageA.getByRole("button", { name: "Confirmar · +55 pts" })).toBeVisible();
    await chip("Fintech").click();
    await chip("Proptech").click();
    await expect(pageA.getByRole("button", { name: "Confirmar · +55 pts" })).toBeVisible();
    await chip("Contratar").click();
    await expect(chip("Contratar")).toHaveAttribute("aria-pressed", "false");
    await chip("IA").click();
    await chip("Fintech").click();
    await chip("Proptech").click();
    await expect(pageA.getByRole("button", { name: "Confirmar · +50 pts" })).toBeVisible();
  });

  test("the voice note goes through idle, recording, ready and re-record", async ({ pageA, userB, context }) => {
    await fakeMicrophone(context);
    await routeTranscript(pageA, "Hablamos de levantar capital para Kuali.");
    await pageA.goto(`/connect/${userB.handle}`);
    await pageA.getByRole("button", { name: /O cuéntaselo a Compa/ }).click();
    await expect(pageA.getByText(/Grabando · 0:0\d/)).toBeVisible();
    await expect(pageA.getByText("Grabando · 0:01")).toBeVisible({ timeout: 5_000 });
    await pageA.getByRole("button", { name: /Grabando/ }).click();
    await expect(pageA.getByText(/Nota guardada · 0:0\d/)).toBeVisible();
    await expect(pageA.getByRole("button", { name: "Confirmar · +65 pts" })).toBeVisible();
    await pageA.getByRole("button", { name: "Regrabar" }).click();
    await expect(pageA.getByText(/Grabando · 0:0\d/)).toBeVisible();
    await expect(pageA.getByRole("button", { name: "Confirmar · +50 pts" })).toBeVisible();
    await pageA.getByRole("button", { name: /Grabando/ }).click();
    await expect(pageA.getByText(/Nota guardada/)).toBeVisible();
  });

  test("denying the microphone does not break the screen", async ({ pageA, userB, context }) => {
    await fakeMicrophone(context, { denied: true });
    await pageA.goto(`/connect/${userB.handle}`);
    await pageA.getByRole("button", { name: /O cuéntaselo a Compa/ }).click();
    await expect(pageA.getByText("No pudimos usar el micrófono; puedes seguir sin nota.")).toBeVisible();
    await expect(pageA.getByRole("button", { name: "Confirmar · +50 pts" })).toBeEnabled();
  });

  test("a failed transcription falls back to no note", async ({ pageA, userB, context }) => {
    await fakeMicrophone(context);
    await routeTranscript(pageA, "", 502);
    await pageA.goto(`/connect/${userB.handle}`);
    await pageA.getByRole("button", { name: /O cuéntaselo a Compa/ }).click();
    await pageA.getByRole("button", { name: /Grabando/ }).click();
    await expect(pageA.getByText("No pudimos usar el micrófono; puedes seguir sin nota.")).toBeVisible();
    await expect(pageA.getByRole("button", { name: "Confirmar · +50 pts" })).toBeVisible();
  });

  test("Confirmar stores the connection as pending with the topics and opens the confirmation", async ({ pageA, world, userA, userB }) => {
    await pageA.goto(`/connect/${userB.handle}`);
    await pageA.getByRole("button", { name: "IA", exact: true }).click();
    await pageA.getByRole("button", { name: "Proptech", exact: true }).click();
    await pageA.getByRole("button", { name: "Confirmar · +55 pts" }).click();
    await expect(pageA).toHaveURL(/\/connections\/[0-9a-f-]+\/done$/);
    await expect(pageA.getByRole("heading", { name: "Solicitud enviada a Bruno" })).toBeVisible();
    const rows = await connectionsBetween(userA, userB);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.status).toBe("pending");
    expect(rows[0]?.requesterId).toBe(userA.id);
    expect(rows[0]?.topics).toEqual(["IA", "Proptech"]);
    expect(rows[0]?.points).toBeNull();
    void world;
  });

  test("someone already connected is marked as known and defaults to Reencuentro", async ({ pageA, world, userA, userB }) => {
    await acceptedConnection(world, userA, userB, "new");
    await pageA.goto(`/connect/${userB.handle}`);
    await expect(pageA.getByText("Ya se conocían")).toBeVisible();
    await expect(pageA.getByRole("group", { name: "Tipo de conexión" }).getByRole("button", { name: /Reencuentro/ })).toHaveAttribute("aria-pressed", "true");
    await expect(pageA.getByRole("button", { name: "Confirmar · +20 pts" })).toBeVisible();
  });

  test("scanning myself shows a Spanish error", async ({ pageA, userA }) => {
    await pageA.goto(`/connect/${userA.handle}`);
    await pageA.getByRole("button", { name: /Confirmar/ }).click();
    await expect(alertIn(pageA)).toHaveText("No puedes conectar contigo mismo.");
    await expect(pageA.getByRole("button", { name: /Confirmar/ })).toBeEnabled();
  });

  test("an unknown handle shows the not-found page and back returns to the scanner", async ({ pageA, userB }) => {
    await pageA.goto("/connect/nadie-aqui-xyz");
    await expect(pageA.getByRole("heading", { name: "Aquí no hay nada" })).toBeVisible();
    await expect(pageA.getByRole("link", { name: "Ir a inicio" })).toHaveAttribute("href", "/home");
    await pageA.goto(`/connect/${userB.handle}`);
    await expect(pageA.getByRole("link", { name: "Regresar" })).toHaveAttribute("href", "/connect?tab=scan");
  });
});

import { acceptedConnection, approvedNote, eventPoints, sql } from "../helpers/db";
import { fakeMicrophone, routeTranscript } from "../helpers/media";
import { alertIn, skipTours } from "../helpers/ui";
import { expect, test } from "../fixtures";

// 08b Nota: real data, every recording state, saving pays +15 and keeps the topics, Recordar opens a reminder.
test.describe("Nota", () => {
  test.beforeEach(async ({ context }) => skipTours(context));

  test("shows the saved note with its real data and goes back to the person", async ({ pageA, world, userA, userB }) => {
    const id = await acceptedConnection(world, userA, userB, "new");
    await approvedNote(id, userA, "Bruno levanta serie A.", "Serie A de Kuali", ["Startups", "Product"], "Presentarle a Andrea");
    await pageA.goto(`/connections/${id}/note`);
    await expect(pageA.getByRole("heading", { name: "Cuéntale a Compa" })).toBeVisible();
    await expect(pageA.getByText(userB.name)).toBeVisible();
    await expect(pageA.getByText(/Nueva · hace/)).toBeVisible();
    await expect(pageA.getByText("Serie A de Kuali")).toBeVisible();
    await expect(pageA.getByText("Startups")).toBeVisible();
    await expect(pageA.getByText("Product")).toBeVisible();
    await expect(pageA.getByText("Presentarle a Andrea").first()).toBeVisible();
    await expect(pageA.getByRole("link", { name: "Regresar" })).toHaveAttribute("href", `/people/${userB.handle}`);

    const remind = pageA.getByRole("link", { name: "Recordar" });
    const href = await remind.getAttribute("href");
    expect(href).toContain("calendar.google.com");
    expect(new URL(href ?? "").searchParams.get("text")).toBe("Presentarle a Andrea");
    await expect(remind).toHaveAttribute("target", "_blank");

    // Already approved: Guardar just returns to the person, no second approval.
    await pageA.getByRole("button", { name: "Guardar en la conexión" }).click();
    await expect(pageA).toHaveURL(`/people/${userB.handle}`);
  });

  test("typing a note, drafting and saving pays +15 and keeps the topics", async ({ pageA, world, userA, userB }) => {
    const id = await acceptedConnection(world, userA, userB, "new");
    // The draft comes from the real API (verbatim fallback without an OpenAI key) with topics added, as the AI would.
    await pageA.route("**/api/interactions/draft", async (route) => {
      const response = await route.fetch();
      const body = (await response.json()) as Record<string, unknown>;
      await route.fulfill({ response, json: { ...body, topics: ["Startups", "AI Products"], title: "IA para fintech", pendingAction: "Mandar el deck" } });
    });
    await pageA.goto(`/connections/${id}/note`);
    await expect(pageA.getByRole("button", { name: "Resumir" })).toBeDisabled();
    await pageA.getByRole("textbox").fill("Hablamos de IA aplicada a fintech y de su ronda.");
    await pageA.getByRole("button", { name: "Resumir" }).click();
    await expect(pageA.getByText("Lo que Compa entendió")).toBeVisible();
    await expect(pageA.getByText("IA para fintech")).toBeVisible();
    await expect(pageA.getByText("Mandar el deck")).toBeVisible();
    await expect(pageA.getByText("+15 pts por guardar la nota")).toBeVisible();
    await pageA.getByRole("button", { name: "Guardar en la conexión" }).click();
    await expect(pageA).toHaveURL(`/people/${userB.handle}`);
    expect(await eventPoints(userA, world.event)).toBe(65);
    const [row] = await sql()<{ topics: string[]; title: string; pending_action: string }[]>`select topics, title, pending_action from interactions where connection_id = ${id} and approved_at is not null`;
    expect(row?.topics).toEqual(["Startups", "AI Products"]);
    expect(row?.title).toBe("IA para fintech");
    expect(row?.pending_action).toBe("Mandar el deck");
    await expect(pageA.getByText(/La última vez/)).toBeVisible();
    await expect(pageA.getByText(/Hoy · IA para fintech/)).toBeVisible();
  });

  test("recording passes through listening and ready; re-record and edit work", async ({ pageA, world, userA, userB, context }) => {
    await fakeMicrophone(context);
    await routeTranscript(pageA, "Quedamos de vernos la próxima semana.");
    const id = await acceptedConnection(world, userA, userB, "new");
    await pageA.goto(`/connections/${id}/note`);
    await pageA.getByRole("button", { name: "Regrabar" }).click();
    await expect(pageA.getByText(/Grabando · 0:0\d/)).toBeVisible();
    await pageA.getByRole("button", { name: "Terminar grabación" }).click();
    await expect(pageA.getByText("Lo que Compa entendió")).toBeVisible();
    await expect(pageA.getByText("Quedamos de vernos la próxima semana.").first()).toBeVisible();
    await pageA.getByRole("button", { name: "Editar" }).click();
    await expect(pageA.getByRole("textbox")).toHaveValue("Quedamos de vernos la próxima semana.");
    await pageA.getByRole("button", { name: "Resumir" }).click();
    await expect(pageA.getByText("Lo que Compa entendió")).toBeVisible();
    await pageA.getByRole("button", { name: "Regrabar" }).click();
    await expect(pageA.getByText(/Grabando/)).toBeVisible();
  });

  test("denying the microphone leaves the text path", async ({ pageA, world, userA, userB, context }) => {
    await fakeMicrophone(context, { denied: true });
    const id = await acceptedConnection(world, userA, userB, "new");
    await pageA.goto(`/connections/${id}/note`);
    await pageA.getByRole("button", { name: "Regrabar" }).click();
    await expect(alertIn(pageA)).toHaveText("No pudimos usar el micrófono. Escribe de qué hablaron:");
    await expect(pageA.getByRole("textbox")).toBeVisible();
  });

  test("a note on a pending connection is refused in Spanish", async ({ pageA, world, userA, userB }) => {
    const id = await sql()<{ id: string }[]>`insert into connections (event_id, requester_id, addressee_id) values (${world.event.id}, ${userA.id}, ${userB.id}) returning id`.then((rows) => rows[0]?.id ?? "");
    await pageA.goto(`/connections/${id}/note`);
    await pageA.getByRole("textbox").fill("Hablamos de algo.");
    await pageA.getByRole("button", { name: "Resumir" }).click();
    await expect(alertIn(pageA)).toContainText("Primero tiene que aceptar la conexión.");
  });
});

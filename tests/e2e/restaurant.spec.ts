import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { expect, type Page, test } from "@playwright/test";
import axe from "axe-core";
import type { createDemoFixture } from "../../scripts/demo-fixture";

const password = `E2E-${randomUUID()}`;
let fixture: Awaited<ReturnType<typeof createDemoFixture>>;

function databaseCommand<T>(args: string[]): T {
  const result = execFileSync(process.execPath, ["--import", "tsx", "scripts/browser-db.ts", ...args], {
    encoding: "utf8", timeout: 30000, env: { ...process.env, BROWSER_FIXTURE_PASSWORD: password },
  });
  return JSON.parse(result.trim()) as T;
}

function snapshot() {
  return databaseCommand<{ quantity: string; orderStatus: string | null; payment: string | null; difference: string | null }>(["snapshot", fixture.organizationId, fixture.branchId, fixture.ingredientId]);
}

test.beforeAll(() => { fixture = databaseCommand<Awaited<ReturnType<typeof createDemoFixture>>>(["seed"]); });

async function login(page: Page, email: string, context: string) {
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.getByLabel("Seleccionar espacio de trabajo").selectOption(context);
  await page.getByRole("button", { name: "Aplicar" }).click();
  await expect(page.getByRole("heading", { name: "Módulos de tu espacio de trabajo" })).toBeVisible();
  await expect(page.getByLabel("Seleccionar espacio de trabajo")).toHaveValue(context);
}

async function checkViewport(page: Page, width: number) {
  await page.setViewportSize({ width, height: 900 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
}

async function checkSemantics(page: Page) {
  await page.addScriptTag({ content: axe.source });
  const result = await page.evaluate(async () => {
    const engine = (window as unknown as { axe: typeof axe }).axe;
    const audit = await engine.run({ runOnly: { type: "rule", values: ["label", "button-name", "link-name", "html-has-lang", "document-title", "image-alt"] } });
    return audit.violations.map((item) => ({ id: item.id, count: item.nodes.length }));
  });
  expect(result).toEqual([]);
}

test("owner completes POS, kitchen, stock, cash, reports and audit", async ({ page }) => {
  await page.goto("/login");
  await checkViewport(page, 320);
  await checkSemantics(page);
  await login(page, fixture.ownerEmail, fixture.ownerContext);
  for (const width of [320, 375, 768, 1440]) await checkViewport(page, width);
  await page.setViewportSize({ width: 375, height: 900 });
  await page.getByText("Menú de trabajo", { exact: true }).click();
  await expect(page.getByRole("navigation", { name: "Menú administrativo" })).toBeVisible();
  await page.getByText("Menú de trabajo", { exact: true }).click();
  await page.goto("/dashboard/pos");
  await checkViewport(page, 375);
  await page.getByRole("button", { name: "Agregar Arroz demo", exact: true }).click();
  await page.getByRole("link", { name: /Ir al pedido actual/ }).click();
  await page.getByRole("button", { name: "Para llevar", exact: true }).click();
  await page.getByRole("button", { name: "Registrar pedido", exact: true }).click();
  await expect(page.getByText("Pedido registrado.", { exact: false })).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/dashboard/kitchen");
  await page.getByRole("button", { name: "Iniciar preparación" }).click();
  await page.getByRole("button", { name: "Marcar listo" }).click();
  await page.getByRole("button", { name: "Marcar entregado" }).click();
  await expect(page.getByText("0 comandas activas")).toBeVisible();
  expect(snapshot().quantity).toBe("9.500");
  await page.goto("/dashboard/cash");
  await page.getByLabel("Base inicial de efectivo").fill("10000");
  await page.getByRole("button", { name: "Abrir caja" }).click();
  await page.locator("summary").filter({ hasText: "Para llevar" }).click();
  await page.getByRole("button", { name: "Confirmar pago y cerrar pedido" }).click();
  await expect(page.getByText("Sin pedidos abiertos.")).toBeVisible();
  await page.getByText("Cerrar turno y conciliar efectivo").click();
  await page.getByLabel("Efectivo contado (incluye base)").fill("35000");
  await page.getByRole("button", { name: "Confirmar cierre" }).click();
  await expect(page.getByRole("button", { name: "Abrir caja" })).toBeVisible();
  expect(snapshot()).toEqual({ quantity: "9.500", orderStatus: "COMPLETED", payment: "25000.00", difference: "0.00" });
  await page.goto("/dashboard/reports");
  for (const [label, ext] of [["Descargar Excel", ".xlsx"], ["Descargar PDF", ".pdf"]]) {
    const pending = page.waitForEvent("download");
    await page.getByRole("link", { name: label }).first().click();
    const download = await pending;
    expect(download.suggestedFilename()).toContain(ext);
    expect(await download.failure()).toBeNull();
  }
  await page.goto("/dashboard/audit");
  await expect(page.locator("summary").getByText("Pedido cobrado", { exact: true }).first()).toBeVisible();
  await expect(page.locator("summary").getByText("Cierre de caja", { exact: true }).first()).toBeVisible();
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/dashboard/cash");
  await expect(page).toHaveURL(/\/login$/);
});

test("staff cannot access administration, cash or report API", async ({ page }) => {
  await login(page, fixture.staffEmail, fixture.staffContext);
  await expect(page.getByRole("link", { name: "Administración", exact: true })).toHaveCount(0);
  for (const path of ["/dashboard/team", "/dashboard/audit", "/dashboard/cash", "/dashboard/reports"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/dashboard\?error=permission/);
  }
  expect((await page.request.get("/api/reports")).status()).toBe(403);
  await page.goto("/dashboard/pos");
  await expect(page.getByRole("heading", { name: "Punto de venta" })).toBeVisible();
});

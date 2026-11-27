import { expect, test } from "@playwright/test";

test("exibe o login e abre o menu de acessibilidade", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Login" })).toBeVisible();
  await expect(page.getByLabel("E-mail")).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Senha" })).toBeVisible();

  await page.getByRole("button", { name: "Abrir opções de acessibilidade" }).first().click();

  const dialog = page.getByRole("dialog", { name: "Acessibilidade" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("Tamanho da fonte")).toBeVisible();
  await expect(dialog.getByText("Fonte para dislexia (OpenDyslexic)")).toBeVisible();
});

test("alterna entre tema claro e escuro", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Abrir opções de acessibilidade" }).first().click();
  const dialog = page.getByRole("dialog", { name: "Acessibilidade" });

  await dialog.getByRole("button", { name: "Escuro" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "escuro");

  await dialog.getByRole("button", { name: "Claro" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "claro");
});

import { expect, test, type Page } from "@playwright/test";

const EMAIL = "zecki1@hotmail.com";
const SENHA = "Mudar123@-";

async function entrar(page: Page) {
  await page.goto("/");
  await page.getByLabel("E-mail").fill(EMAIL);
  await page.getByRole("textbox", { name: "Senha" }).fill(SENHA);
  await page.getByRole("button", { name: /entrar/i }).click();
  await expect(page.getByRole("heading", { name: /Recursos disponíveis/i })).toBeVisible();
}

test("busca com palavras de ligação não zera o resultado", async ({ page }) => {
  await entrar(page);

  const busca = page.getByLabel("Buscar recursos por palavras, tags ou autor");
  await busca.fill("diversidade em familia");

  await expect(page.getByText(/resultado/i).first()).not.toHaveText(/^0 resultados?/, { timeout: 5000 });
  await expect(page.getByRole("heading", { name: /Recursos disponíveis/i })).toBeVisible();
});

test("abre a análise, os logs e os relatórios", async ({ page }) => {
  await entrar(page);

  await page.getByRole("link", { name: "Análise" }).first().click();
  await expect(page.getByRole("heading", { name: "Análise do acervo" })).toBeVisible();
  await expect(page.getByText("Cobertura de tags")).toBeVisible();

  await page.getByRole("link", { name: "Logs" }).first().click();
  await expect(page.getByRole("heading", { name: "Logs de atividade" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Exportar CSV" })).toBeVisible();

  await page.getByRole("link", { name: "Relatórios" }).first().click();
  await expect(page.getByRole("heading", { name: "Relatórios", level: 1 })).toBeVisible();
  await expect(page.getByLabel("Mínimo de poses")).toBeVisible();
  await expect(page.getByRole("button", { name: "Imprimir" })).toBeVisible();
});

test("envia vários arquivos para o mesmo recurso", async ({ page }) => {
  await entrar(page);

  await page.getByRole("button", { name: /Preencher detalhes/i }).click();
  const dialog = page.getByRole("dialog");

  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64"
  );
  await dialog.locator('input[type="file"]').setInputFiles([
    { name: "pose-1.png", mimeType: "image/png", buffer: png },
    { name: "pose-2.png", mimeType: "image/png", buffer: png },
  ]);

  await dialog.getByLabel("Título do recurso").fill("Personagem de teste");
  await dialog.getByLabel("Tags (separadas por vírgula)").fill("diversidade, teste");
  await dialog.getByRole("button", { name: /Enviar 2 arquivo/i }).click();

  await expect(page.getByText(/2 arquivos adicionados a “Personagem de teste”/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Personagem de teste" })).toHaveCount(1);

  await page.getByRole("button", { name: /Abrir Personagem de teste/i }).click();
  const detalhe = page.getByRole("dialog");
  await expect(detalhe.getByText("Arquivos · 2")).toBeVisible();
  await expect(detalhe.getByText("pose-2.png")).toBeVisible();
});

test("edita a história do recurso e vê o histórico de autorias", async ({ page }) => {
  await entrar(page);

  await page.getByRole("button", { name: /Abrir .*Imagem/i }).first().click();
  const modal = page.getByRole("dialog");
  await expect(modal).toBeVisible();
  await expect(modal.getByRole("heading", { name: "História" })).toBeVisible();

  await modal.getByRole("button", { name: "Editar" }).click();
  const historia = modal.getByLabel("História do personagem");
  await historia.fill("História ajustada pelo teste automatizado.");

  const tags = modal.getByLabel("Tags separadas por vírgula");
  await tags.fill("diversidade, teste");

  await modal.getByRole("button", { name: "Salvar alterações" }).click();
  await expect(modal.getByText("História ajustada pelo teste automatizado.")).toBeVisible();
  await expect(modal.getByText("#teste")).toBeVisible();
});

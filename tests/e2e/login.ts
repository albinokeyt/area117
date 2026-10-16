import type { Page } from '@playwright/test';

export async function openLogin(page: Page) {
  const direct = page.getByRole('button', { name: 'Acceder directamente', exact: true });
  await direct.or(page.getByLabel('Usuario o correo electrónico', { exact: true })).first().waitFor({ state: 'visible' });
  if (await direct.isVisible()) await direct.click();
}

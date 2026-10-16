import type { Page } from '@playwright/test';

export async function openLogin(page: Page) {
  const nozzle = page.getByRole('button', { name: 'Mover boquilla de combustible', exact: true });
  const username = page.getByLabel('Usuario o correo electrónico', { exact: true });
  await nozzle.or(username).first().waitFor({ state: 'visible' });
  if (await username.isVisible()) return;
  for (let step = 0; step < 4; step++) await nozzle.press('ArrowRight');
  for (let step = 0; step < 3; step++) await nozzle.press('ArrowDown');
  await nozzle.press('Enter');
  await username.waitFor({ state: 'visible' });
}

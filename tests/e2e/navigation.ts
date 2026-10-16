import type { Page } from '@playwright/test';

export async function openNavigation(page: Page) {
  const trigger = page.getByRole('button', { name: 'Navegación AREA117', exact: true });
  if (await trigger.getAttribute('aria-expanded') !== 'true') await trigger.click();
}

export async function navigate(page: Page, name: string) {
  await openNavigation(page);
  await page.getByRole('navigation', { name: 'Navegación principal' }).getByRole('button', { name, exact: true }).click();
}

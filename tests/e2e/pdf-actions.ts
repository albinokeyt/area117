import type { Page } from '@playwright/test';

export async function openPdfActions(page: Page) {
  if (await page.locator('details.efi-pdf-actions').getAttribute('open') === null) {
    await page.getByLabel('Opciones y descargas PDF', { exact: true }).click();
  }
}

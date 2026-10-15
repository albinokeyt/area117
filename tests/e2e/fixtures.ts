import { test as base, expect } from '@playwright/test';
// Existing workflow tests acknowledge the release dialog through the same user control.
// Dedicated release tests use Playwright's base fixture to exercise the notice itself.
export const test = base.extend({ page: async ({ page }, use) => {
  await page.addLocatorHandler(page.getByRole('dialog', { name: /^Novedades / }), async () => {
    await page.getByRole('dialog', { name: /^Novedades / }).getByRole('button', { name: 'Entendido', exact: true }).click();
  });
  await use(page);
} });
export { expect };

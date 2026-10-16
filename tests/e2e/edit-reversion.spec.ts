import { openLogin } from './login';
import { test, expect } from './fixtures';

test('typing each character across background save responses keeps every character', async ({ page }) => {
  let writes = 0;
  page.on('request', request => { if (request.url().endsWith('/api/sync') && request.method() === 'POST') writes++; });
  await page.goto('/');
  await openLogin(page);
  await page.getByLabel('Usuario o correo electrónico').fill('admin@efidataoil.com');
  await page.getByLabel('Contraseña', { exact: true }).fill('admin123');
  await page.getByRole('button', { name: 'Iniciar Sesión' }).click();
  const input = page.getByLabel('ALFAJARIN GOA curr', { exact: true });
  await expect(input).toBeVisible();
  await expect.poll(() => writes).toBeGreaterThan(0);
  await page.waitForTimeout(2500);
  const settledWrites = writes;
  await page.waitForTimeout(2000);
  expect(writes).toBe(settledWrites);
  await input.fill('');
  let expected = '';
  for (const character of '1,567') {
    await input.pressSequentially(character);
    expected += character;
    await expect(input).toHaveValue(expected);
    await page.waitForTimeout(900);
    await expect(input).toHaveValue(expected);
    await expect(input).toBeFocused();
  }
  await page.getByRole('button', { name: 'Guardar Precios', exact: true }).click();
  await expect(page.getByRole('button', { name: '¡Guardado!', exact: true })).toBeVisible();
  const result = await (await page.request.get('/api/sync')).json();
  expect(result.data.efi_compras_data.data.ALFAJARIN_GOA.curr).toBe(expected);
  const startIdle = writes;
  await page.waitForTimeout(3000);
  expect(writes - startIdle).toBeLessThanOrEqual(1);
});

test('a delayed acknowledgement cannot undo a newer keystroke or remove its daily highlight', async ({ page }) => {
  await page.goto('/');
  await openLogin(page);
  await page.getByLabel('Usuario o correo electrónico').fill('admin@efidataoil.com');
  await page.getByLabel('Contraseña', { exact: true }).fill('admin123');
  await page.getByRole('button', { name: 'Iniciar Sesión' }).click();
  const input = page.getByLabel('ALFAJARIN GOA curr', { exact: true });
  await expect(input).toBeVisible();
  await page.waitForTimeout(2000);
  let release!: () => void;
  let acknowledge!: () => void;
  const releaseResponse = new Promise<void>(resolve => { release = resolve; });
  const received = new Promise<void>(resolve => { acknowledge = resolve; });
  let held = false;
  await page.route('**/api/sync', async route => {
    if (route.request().method() !== 'POST' || held) return route.continue();
    held = true;
    const response = await route.fetch();
    acknowledge();
    await releaseResponse;
    await route.fulfill({ response });
  });
  await input.fill('1,777');
  await received;
  await input.fill('1,888');
  release();
  await expect(input).toHaveValue('1,888');
  await expect(input).toHaveClass(/bg-amber/);
  await page.getByRole('button', { name: 'Guardar Precios', exact: true }).click();
  await expect(page.getByRole('button', { name: '¡Guardado!', exact: true })).toBeVisible();
  const result = await (await page.request.get('/api/sync')).json();
  expect(result.data.efi_compras_data.data.ALFAJARIN_GOA.curr).toBe('1,888');
  await page.reload();
  await expect(input).toHaveValue('1,888');
  await expect(input).toHaveClass(/bg-amber/);
});

test('saving identical JSONB content with reordered keys does not create another server version', async ({ request }) => {
  await request.post('/api/auth', { data: { email: 'admin@efidataoil.com', password: 'admin123' } });
  const initial = await request.post('/api/sync', { data: { data: { efi_test_key_order: { longKey: 'same', a: { porte: 0.006, curr: 1.354 } } }, baseData: {} } });
  expect(initial.ok()).toBe(true);
  const baseline = await initial.json();
  const repeated = await request.post('/api/sync', { data: {
    data: { efi_test_key_order: { a: { curr: 1.354, porte: 0.006 }, longKey: 'same' } }, baseData: baseline.data,
  } });
  expect(repeated.ok()).toBe(true);
  expect((await repeated.json()).version).toBe(baseline.version);
});

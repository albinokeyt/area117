import { navigate } from './navigation';
import { test, expect } from './fixtures';

test('fuel nozzle reveals login, gauge responds and existing authentication receives unchanged credentials', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const authPosts: Record<string, string>[] = [];
  page.on('request', request => { if (request.method() === 'POST' && request.url().endsWith('/api/auth')) authPosts.push(request.postDataJSON()); });
  await page.goto('/');
  const meter = page.getByRole('meter', { name: 'Preparación del acceso' });
  await expect(meter).toHaveAttribute('aria-valuenow', '0');
  await page.screenshot({ path: testInfo.outputPath('crystal-login-intro.png'), fullPage: true });
  const nozzle = (await page.getByRole('button', { name: 'Conectar surtidor al coche', exact: true }).boundingBox())!;
  const port = (await page.locator('.fuel-port').boundingBox())!;
  await page.mouse.move(nozzle.x + nozzle.width / 2, nozzle.y + nozzle.height / 2);
  await page.mouse.down();
  await page.mouse.move(port.x + port.width / 2, port.y + port.height / 2, { steps: 15 });
  await page.mouse.up();
  const username = page.getByLabel('Usuario o correo electrónico', { exact: true });
  const password = page.getByLabel('Contraseña', { exact: true });
  await expect(username).toBeVisible();
  await expect(username).toBeFocused();
  await expect(meter).toHaveAttribute('aria-valuenow', '12');
  await username.fill('usuario-prueba');
  const partial = Number(await meter.getAttribute('aria-valuenow'));
  await password.fill('clave-prueba');
  expect(Number(await meter.getAttribute('aria-valuenow'))).toBeGreaterThan(partial);
  await page.getByRole('button', { name: 'Mostrar contraseña', exact: true }).click();
  await expect(password).toHaveAttribute('type', 'text');
  await page.getByRole('button', { name: 'Ocultar contraseña', exact: true }).click();
  await expect(password).toHaveAttribute('type', 'password');
  await password.fill('');
  expect(Number(await meter.getAttribute('aria-valuenow'))).toBe(partial);
  await password.fill('clave-prueba');
  expect(authPosts).toEqual([]);
  await page.getByRole('button', { name: 'Iniciar Sesión', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Acceso al sistema', exact: true }).getByRole('alert')).toContainText('Credenciales inválidas');
  expect(authPosts).toEqual([{ email: 'usuario-prueba', password: 'clave-prueba' }]);
  await expect(page.getByRole('button', { name: 'Iniciar Sesión', exact: true })).toBeEnabled();
});

test('crystal workspace adapts to mobile, keeps every module accessible and preserves PDF paper styles', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Acceder directamente', exact: true }).click();
  await page.getByLabel('Usuario o correo electrónico', { exact: true }).fill('admin@efidataoil.com');
  await page.getByLabel('Contraseña', { exact: true }).fill('admin123');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('crystal-login-mobile.png'), fullPage: true });
  await page.getByRole('button', { name: 'Iniciar Sesión', exact: true }).click();
  await expect(page.getByLabel('TORREJON GOA curr', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('crystal-compras-mobile.png') });
  await page.setViewportSize({ width: 1600, height: 1000 });
  for (const name of ['Dashboard', 'Compras', 'Postes', 'Sábana de Precios', 'PDFs & Clientes', 'EFI Export', 'Usuarios', 'Instrucciones']) {
    await navigate(page, name);
    await expect(page.locator('.notch-current')).toHaveText(name);
    await expect(page.getByRole('main').getByRole('heading').first()).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath(`crystal-module-${name.replace(/[^a-z0-9]/gi, '')}.png`) });
  }
  await navigate(page, 'PDFs & Clientes');
  const paper = page.locator('.printable-document');
  const original = await paper.evaluate(element => ({ color: getComputedStyle(element).color, background: getComputedStyle(element).backgroundColor, font: getComputedStyle(element).fontFamily }));
  expect(original.background).toBe('rgb(255, 255, 255)');
  expect(original.color).toBe('rgb(15, 23, 42)');
  expect(original.font).not.toContain('Inter');
  await page.emulateMedia({ media: 'print' });
  expect(await paper.evaluate(element => getComputedStyle(element).backdropFilter)).toBe('none');
  await page.emulateMedia({ media: 'screen' });
  expect(errors).toEqual([]);
});

test('keyboard remains usable after an unsuccessful drag and reduced motion disables decorative animation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const nozzle = page.getByRole('button', { name: 'Conectar surtidor al coche', exact: true });
  const box = (await nozzle.boundingBox())!;
  await page.mouse.move(box.x + 15, box.y + 15);
  await page.mouse.down();
  await page.mouse.move(box.x - 50, box.y + 15, { steps: 5 });
  await page.mouse.up();
  await expect(page.getByRole('button', { name: 'Acceder directamente', exact: true })).toBeVisible();
  await nozzle.press('Enter');
  await expect(page.getByLabel('Usuario o correo electrónico', { exact: true })).toBeFocused();
  expect(await page.locator('.station-car').evaluate(element => parseFloat(getComputedStyle(element).animationDuration))).toBeLessThan(.001);
});

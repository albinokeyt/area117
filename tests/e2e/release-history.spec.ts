import { test, expect } from '@playwright/test';
import { Client } from 'pg';

test('release notice is per user, persists in PostgreSQL and history stays available', async ({ page, request, browser }) => {
  const db = new Client({ connectionString: 'postgresql://postgres:test-only@127.0.0.1:55437/postgres' });
  await db.connect();
  try {
    await request.post('/api/auth', { data: { email: 'admin@efidataoil.com', password: 'admin123' } });
    await db.query("DELETE FROM efi_release_reads WHERE user_id IN ('1','3')");
    await page.goto('/');
    await page.getByLabel('Usuario o correo electrónico').fill('admin@efidataoil.com');
    await page.getByLabel('Contraseña', { exact: true }).fill('admin123');
    await page.getByRole('button', { name: 'Iniciar Sesión' }).click();
    const notice = page.getByRole('dialog', { name: 'Novedades v1.5.6', exact: true });
    await expect(notice).toBeVisible();
    await expect(notice).toContainText('TALAEXPRESS');
    await expect(notice).toContainText('TAX MOVING 24');
    await page.route('**/api/releases', route => route.request().method() === 'POST' ? route.fulfill({ status: 503, contentType: 'application/json', body: '{}' }) : route.continue());
    await notice.getByRole('button', { name: 'Entendido', exact: true }).click();
    await expect(notice.getByRole('alert')).toContainText('No se pudo guardar');
    expect((await (await request.get('/api/releases')).json()).unread).toBe(true);
    await page.unroute('**/api/releases');
    await notice.getByRole('button', { name: 'Entendido', exact: true }).click();
    await expect(notice).not.toBeVisible();
    expect((await (await request.get('/api/releases')).json()).unread).toBe(false);
    expect((await db.query("SELECT release_index FROM efi_release_reads WHERE user_id='1'")).rows[0].release_index).toBe(6);
    await page.reload();
    await expect(page.getByLabel('TORREJON GOA curr', { exact: true })).toBeVisible();
    await expect(notice).not.toBeVisible();
    await page.getByRole('button', { name: 'Historial de versiones', exact: true }).click();
    const history = page.getByRole('dialog', { name: 'Historial de versiones', exact: true });
    await expect(history.getByRole('article')).toHaveCount(6);
    await expect(history).toContainText('v1.5.1');
    await expect(history).toContainText('v1.5.5');
    await history.getByRole('button', { name: 'Entendido', exact: true }).click();
    const other = await browser.newPage();
    await other.goto('/');
    await other.getByLabel('Usuario o correo electrónico').fill('efi@efidataoil.com');
    await other.getByLabel('Contraseña', { exact: true }).fill('efi123');
    await other.getByRole('button', { name: 'Iniciar Sesión' }).click();
    await expect(other.getByRole('dialog', { name: 'Novedades v1.5.6', exact: true })).toBeVisible();
    await other.close();
    expect((await request.post('/api/releases', { data: { version: 'v99.0.0' } })).status()).toBe(400);
    expect((await (await request.get('/api/releases')).json()).unread).toBe(false);
    await page.route('**/api/releases', route => route.request().method() === 'GET' ? route.fulfill({ contentType: 'application/json', body: JSON.stringify({ currentVersion: 'v1.5.7', unread: true, releases: [{ version: 'v1.5.7', date: '16/10/2026', title: 'Siguiente versión', changes: ['Cambio publicado mientras la aplicación estaba abierta.'] }] }) }) : route.continue());
    await page.getByRole('button', { name: 'Historial de versiones', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Guardar y actualizar aplicación', exact: true })).toBeVisible();
  } finally { await db.end(); }
});

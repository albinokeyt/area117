import { test, expect } from '@playwright/test';
import { Client } from 'pg';

test('environment admin logs in with a username and can manage users and save data', async ({ page }) => {
  const rejected = await page.request.post('/api/auth', { data: { email: 'recovery-test', password: 'incorrect' } });
  expect(rejected.status()).toBe(401);
  await page.goto('/');
  await page.getByLabel('Usuario o correo electrónico').fill('recovery-test');
  await page.getByLabel('Contraseña', { exact: true }).fill('recovery-test-password');
  await page.getByRole('button', { name: 'Iniciar Sesión' }).click();
  await expect(page.getByLabel('TORREJON GOA curr', { exact: true })).toBeVisible();
  const auth = await (await page.request.get('/api/auth')).json();
  expect(auth.user.id).toBe('__environment_admin__');
  expect(auth.user.role).toBe('ADMIN');
  expect(auth.user.password).toBeUndefined();
  expect(auth.user.fingerprint).toBeUndefined();
  expect((await page.context().cookies()).find(cookie => cookie.name === 'efi_session')?.httpOnly).toBe(true);

  const list = await (await page.request.get('/api/users')).json();
  expect(list.users.some((user: any) => user.id === auth.user.id)).toBe(false);
  const created = await page.request.post('/api/users', { data: { name: 'Recovery created', email: 'created-by-recovery@test.invalid', role: 'VISITOR', password: 'registered-test-password' } });
  expect(created.ok()).toBe(true);
  const registered = (await created.json()).users.find((user: any) => user.email === 'created-by-recovery@test.invalid');
  expect(registered.password).toBeUndefined();
  expect((await page.request.delete(`/api/users?id=${registered.id}`)).ok()).toBe(true);
  expect((await page.request.delete('/api/users?id=__environment_admin__')).status()).toBe(400);

  // Read/write uses the very same PostgreSQL path as any other administrator.
  const baseline = await (await page.request.get('/api/sync')).json();
  const saved = await page.request.post('/api/sync', { data: { data: { efi_test_recovery: 'saved' }, baseData: baseline.data } });
  expect(saved.ok()).toBe(true);
  expect((await saved.json()).data.efi_test_recovery).toBe('saved');
  await page.reload();
  await expect(page.getByLabel('TORREJON GOA curr', { exact: true })).toBeVisible();
  expect((await page.request.delete('/api/auth')).ok()).toBe(true);
  expect((await page.request.get('/api/sync')).status()).toBe(401);
});

test('environment sessions live in PostgreSQL independently and reject an obsolete credential fingerprint', async ({ request }) => {
  expect((await request.post('/api/auth', { data: { email: 'recovery-test', password: 'recovery-test-password' } })).ok()).toBe(true);
  const db = new Client({ connectionString: 'postgresql://postgres:test-only@127.0.0.1:55437/postgres' });
  await db.connect();
  try {
    expect((await db.query("SELECT COUNT(*) FROM efi_server_users WHERE id = '__environment_admin__'")).rows[0].count).toBe('0');
    const sessions = await db.query('SELECT user_id, environment_fingerprint FROM efi_sessions WHERE environment_fingerprint IS NOT NULL');
    expect(sessions.rows.length).toBeGreaterThan(0);
    expect(sessions.rows.every(row => row.user_id === null)).toBe(true);
    // A credential rotation makes the stored fingerprint obsolete in the same way.
    await db.query("UPDATE efi_sessions SET environment_fingerprint = 'obsolete' WHERE environment_fingerprint IS NOT NULL");
    expect((await request.get('/api/sync')).status()).toBe(401);
    expect((await (await request.get('/api/auth')).json()).user).toBeNull();
    // The original registered administrator remains usable.
    expect((await request.post('/api/auth', { data: { email: 'admin@efidataoil.com', password: 'admin123' } })).ok()).toBe(true);
    expect((await request.get('/api/sync')).ok()).toBe(true);
  } finally { await db.end(); }
});

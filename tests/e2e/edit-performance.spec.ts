import { openLogin } from './login';
import { test, expect } from './fixtures';
import { readFile } from 'node:fs/promises';

test('editing stays responsive with production-sized formulas and preserves the final price', async ({ page, request }, testInfo) => {
  test.setTimeout(120000);
  await request.post('/api/auth', { data: { email: 'admin@efidataoil.com', password: 'admin123' } });
  const initialState = (await (await request.get('/api/sync')).json()).data;
  try {
    if (process.env.AREA117_PROFILE_SNAPSHOT) {
      const data = JSON.parse(await readFile(process.env.AREA117_PROFILE_SNAPSHOT, 'utf8'));
      const baseline = (await (await request.get('/api/sync')).json()).data;
      expect((await request.post('/api/sync', { data: { data, baseData: baseline } })).ok()).toBe(true);
    } else {
      const formulas = Object.fromEntries(Array.from({ length: 190 }, (_, i) => [`PERF_${i}_TORREJON_sinIva`, {
        rawFormula: '[COMPRAS:TORREJON:COMPRA_HOY] + 0.012', evaluatedValue: 0, updatedAt: '',
      }]));
      const baseline = (await (await request.get('/api/sync')).json()).data;
      expect((await request.post('/api/sync', { data: { data: { efi_sabana_custom_formulas_global: formulas }, baseData: baseline } })).ok()).toBe(true);
    }
    await page.setViewportSize({ width: 1600, height: 1000 });
    await page.addInitScript(() => {
      (window as any).editMeasurements = [];
      (window as any).parseCount = 0;
      const parse = JSON.parse;
      JSON.parse = (...args: Parameters<typeof JSON.parse>) => { (window as any).parseCount++; return parse(...args); };
      document.addEventListener('input', event => {
        if (!(event.target instanceof HTMLInputElement) || event.target.getAttribute('aria-label') !== 'TORREJON GOA curr') return;
        const start = performance.now();
        requestAnimationFrame(() => requestAnimationFrame(() => (window as any).editMeasurements.push(performance.now() - start)));
      }, true);
    });
    await page.goto('/');
    await openLogin(page);
    await page.getByLabel('Usuario o correo electrónico').fill('admin@efidataoil.com');
    await page.getByLabel('Contraseña', { exact: true }).fill('admin123');
    await page.getByRole('button', { name: 'Iniciar Sesión' }).click();
    const input = page.getByLabel('TORREJON GOA curr', { exact: true });
    await expect(input).toBeVisible({ timeout: 30000 });
    await page.waitForTimeout(1500);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await cdp.send('Profiler.enable');
    await cdp.send('Profiler.start');
    await page.evaluate(() => { (window as any).editMeasurements = []; (window as any).parseCount = 0; });
    const started = Date.now();
    for (const value of ['1,501', '1,502', '1,503', '1,504', '1,505']) {
      await input.fill(value);
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    }
    const profile = (await cdp.send('Profiler.stop')).profile;
    await testInfo.attach('cpu-profile.json', { body: JSON.stringify(profile), contentType: 'application/json' });
    const measures = await page.evaluate(() => ({ paints: (window as any).editMeasurements as number[], parses: (window as any).parseCount as number }));
    const report = { ...measures, elapsedMs: Date.now() - started, hottest: profile.nodes.filter(n => n.hitCount).sort((a, b) => (b.hitCount || 0) - (a.hitCount || 0)).slice(0, 12).map(n => ({ function: n.callFrame.functionName, hits: n.hitCount, line: n.callFrame.lineNumber })) };
    console.log('EDIT_PERFORMANCE', JSON.stringify(report));
    await testInfo.attach('edit-performance.json', { body: JSON.stringify(report, null, 2), contentType: 'application/json' });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    await page.getByRole('button', { name: 'Guardar Precios', exact: true }).click();
    await expect(page.getByRole('button', { name: '¡Guardado!', exact: true })).toBeVisible();
    expect((await (await page.request.get('/api/sync')).json()).data.efi_compras_data.data.TORREJON_GOA.curr).toBe('1,505');
    expect(measures.paints).toHaveLength(5);
    expect(Math.max(...measures.paints)).toBeLessThan(500);
  } finally {
    // This fixture always targets the isolated PostgreSQL started by Playwright.
    // Stop browser writers before restoring state so subsequent tests stay independent.
    await page.close();
    const currentState = (await (await request.get('/api/sync')).json()).data;
    const keys = new Set([...Object.keys(initialState), ...Object.keys(currentState)]);
    const data = Object.fromEntries(Array.from(keys, key => [key, key in initialState ? initialState[key] : null]));
    expect((await request.post('/api/sync', { data: { data, baseData: currentState } })).ok()).toBe(true);
  }
});

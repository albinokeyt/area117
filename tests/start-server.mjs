import EmbeddedPostgres from 'embedded-postgres';
import { spawn } from 'node:child_process';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Always isolated from DATABASE_URL in the developer/production environment.
const pg = new EmbeddedPostgres({ databaseDir: join(await mkdtemp(join(tmpdir(), 'area117-test-')), 'db'),
  user: 'postgres', password: 'test-only', port: 55437, persistent: false,
  onLog: () => {}, onError: message => process.stderr.write(String(message)) });
await pg.initialise();
await pg.start();
const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', '3107', '-H', '127.0.0.1'], {
  env: { ...process.env, DATABASE_URL: 'postgresql://postgres:test-only@127.0.0.1:55437/postgres', NEXT_TELEMETRY_DISABLED: '1' },
  stdio: 'inherit', windowsHide: true,
});
let closing = false;
async function close() {
  if (closing) return;
  closing = true;
  child.kill();
  await pg.stop();
}
process.on('SIGINT', () => void close());
process.on('SIGTERM', () => void close());
child.on('exit', () => void close());

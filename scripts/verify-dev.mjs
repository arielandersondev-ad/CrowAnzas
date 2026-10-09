import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Never adopt or stop a server that was already running on the normal dev ports.
for (const port of [3000, 3001]) {
  await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', () => reject(new Error(`Port ${port} is occupied; stop your own dev server before this check.`)));
    server.listen(port, '127.0.0.1', () => server.close(resolve));
  });
}
if (!process.env.npm_execpath) throw new Error('Run this check through npm run test:dev.');
const child = spawn(process.execPath, [process.env.npm_execpath, 'run', 'dev'], {
  cwd: root, windowsHide: true, detached: process.platform !== 'win32',
  env: { ...process.env, API_PORT: '3001', API_STORAGE: 'memory', DATABASE_URL: '', WEB_ORIGIN: 'http://localhost:3000', APP_TIMEZONE: 'America/La_Paz', NEXT_PUBLIC_DATA_MODE: 'mock', NEXT_TELEMETRY_DISABLED: '1' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
const startedAt = Date.now();
let log = `Verification started ${new Date(startedAt).toISOString()}; child PID=${child.pid}; expected API=127.0.0.1:3001, web=127.0.0.1:3000\n`;
child.stdout.on('data', data => { log += data; });
child.stderr.on('data', data => { log += data; });
child.on('error', error => { log += String(error); });
async function ready(url) {
  const end = Date.now() + 120000;
  let lastAttempt = 'No request yet';
  while (Date.now() < end) {
    if (child.exitCode !== null) throw new Error(`npm run dev exited ${child.exitCode}.`);
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
      if (response.ok) { log += `\nReadiness ${url}: HTTP ${response.status}; elapsed=${Date.now() - startedAt}ms\n`; return response; }
      lastAttempt = `HTTP ${response.status}: ${(await response.text()).slice(0, 200)}`;
    } catch (error) { lastAttempt = `${error.name}: ${error.message}; cause=${error.cause?.code ?? 'none'}`; }
    log += `\nReadiness ${url}: ${lastAttempt}; elapsed=${Date.now() - startedAt}ms\n`;
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error(`Dev readiness timed out: ${url}; last attempt: ${lastAttempt}`);
}
try {
  assert.deepEqual(await (await ready('http://127.0.0.1:3001/api/health')).json(), { status: 'ok', storage: 'memory' });
  const html = await (await ready('http://127.0.0.1:3000')).text();
  assert.ok(html.includes('Crowanzas'));
  assert.ok(html.includes('Modo demostración'));
  console.log('Root npm run dev: API memory health and web mock HTTP 200 verified on 3001/3000.');
} finally {
  await fs.mkdir(path.join(root, '.tmp'), { recursive: true });
  await fs.writeFile(path.join(root, '.tmp/dev-verification.log'), log);
  if (child.exitCode === null) {
    if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
    else process.kill(-child.pid, 'SIGTERM');
  }
}

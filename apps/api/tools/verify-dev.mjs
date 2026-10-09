import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

// Exercise the actual npm dev command, including its emitted-code watch runner.
const reservation = createServer();
await new Promise(resolve => reservation.listen(0, '127.0.0.1', resolve));
const port = reservation.address().port;
await new Promise(resolve => reservation.close(resolve));
const windows = process.platform === 'win32';
const child = spawn(windows ? (process.env.ComSpec || 'cmd.exe') : 'npm', windows ? ['/d', '/s', '/c', 'npm run dev'] : ['run', 'dev'], {
  cwd: fileURLToPath(new URL('../', import.meta.url)),
  env: { ...process.env, API_PORT: String(port), API_STORAGE: 'memory' },
  stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true,
});
let logs = '';
let spawnError;
child.on('error', error => { spawnError = error; });
child.stdout.on('data', chunk => { logs = (logs + chunk).slice(-10000); });
child.stderr.on('data', chunk => { logs = (logs + chunk).slice(-10000); });
const base = `http://127.0.0.1:${port}/api`;
try {
  let ready = false;
  for (let attempt = 0; attempt < 120; attempt++) {
    if (spawnError) throw spawnError;
    if (child.exitCode !== null) throw new Error(`dev exited: ${logs}`);
    try { ready = (await fetch(`${base}/health`)).ok; } catch {}
    if (ready) break;
    await delay(500);
  }
  assert.ok(ready, `dev did not start: ${logs}`);
  const input = { name: 'Dev validation', amount: '1.25', quantity: 5, date: '2024-02-29' };
  for (const bad of [{ ...input, amount: '1.001' }, { ...input, quantity: '2' }, { ...input, date: '2023-02-29' }, { ...input, name: '  ' }, { ...input, description: null }]) {
    const response = await fetch(`${base}/expenses`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(bad) });
    assert.equal(response.status, 400, JSON.stringify(bad));
    assert.ok(Array.isArray((await response.json()).message));
  }
  assert.equal((await fetch(`${base}/expenses/summary?date=invalid`)).status, 400);
  const created = await fetch(`${base}/expenses`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
  assert.equal(created.status, 201);
  const summary = await (await fetch(`${base}/expenses/summary?date=${input.date}`)).json();
  assert.equal(summary.total, '1.25');
  assert.equal(summary.count, 1);
  console.log('Actual npm run dev HTTP smoke passed: invalid body/query 400, valid POST 201, exact summary.');
} finally {
  // Only stop the process tree launched by this script.
  if (child.pid) {
    if (windows) {
      const result = spawnSync('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { encoding: 'utf8', windowsHide: true });
      if (result.error) throw result.error;
    } else {
      child.kill('SIGTERM');
    }
  }
}

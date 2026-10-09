import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mode = process.argv[2];
const env = { ...process.env, NEXT_TELEMETRY_DISABLED: '1' };
let cwd = root;
let args;
if (mode === 'api') {
  Object.assign(env, { API_PORT: '3102', WEB_ORIGIN: 'http://127.0.0.1:3101', APP_TIMEZONE: 'America/La_Paz', API_STORAGE: 'memory', DATABASE_URL: '' });
  args = [path.join(root, 'apps/api/dist/main.js')];
} else if (mode === 'mock' || mode === 'web-api') {
  // Copy only product source/config, never .env files, node_modules or generated output.
  // This keeps Next's generated tsconfig/types/cache changes out of apps/web.
  const stagingRoot = path.resolve(root, '.tmp/browser-smoke');
  const destination = path.resolve(stagingRoot, mode);
  if (path.dirname(destination) !== stagingRoot || !stagingRoot.startsWith(root + path.sep)) {
    throw new Error('Unsafe smoke staging directory.');
  }
  // This destination contains only our prior disposable source copy and Next output.
  await fs.rm(destination, { recursive: true, force: true });
  await fs.mkdir(destination, { recursive: true });
  for (const name of ['src', 'public', 'package.json', 'tsconfig.json', 'next.config.ts', 'postcss.config.mjs', 'next-env.d.ts']) {
    const source = path.join(root, 'apps/web', name);
    try {
      await fs.cp(source, path.join(destination, name), { recursive: true, force: true });
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  const isApi = mode === 'web-api';
  Object.assign(env, {
    NEXT_PUBLIC_DATA_MODE: isApi ? 'api' : 'mock',
    NEXT_PUBLIC_API_URL: 'http://127.0.0.1:3102/api',
    NEXT_PUBLIC_APP_TIMEZONE: 'America/La_Paz', NEXT_PUBLIC_CURRENCY: 'Bs',
  });
  cwd = destination;
  args = [path.join(root, 'node_modules/next/dist/bin/next'), 'dev', destination, '--hostname', '127.0.0.1', '--port', isApi ? '3101' : '3100'];
} else throw new Error('Expected api, mock, or web-api.');

const child = spawn(process.execPath, args, { cwd, env, stdio: 'inherit', windowsHide: true });
child.on('error', error => { console.error(error); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));

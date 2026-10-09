import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const compiler = spawn(process.execPath, [require.resolve('typescript/bin/tsc'), '-p', 'tsconfig.json', '--watch', '--preserveWatchOutput', '--pretty', 'false'], { stdio: ['inherit', 'pipe', 'inherit'] });
const children = [compiler];
let server;
let output = '';
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  children.forEach(child => child.kill());
  process.exitCode = code;
}
function track(child) {
  child.on('error', error => { console.error(error.message); stop(1); });
  child.on('exit', code => stop(code ?? 1));
}
track(compiler);
compiler.stdout.on('data', chunk => {
  process.stdout.write(chunk);
  output = (output + chunk).slice(-2000);
  // Wait for the initial watch compilation to finish before serving emitted files.
  if (!server && !stopping && output.includes('Found 0 errors. Watching for file changes.')) {
    server = spawn(process.execPath, ['--watch', 'dist/main.js'], { stdio: 'inherit' });
    children.push(server);
    track(server);
  }
});
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());

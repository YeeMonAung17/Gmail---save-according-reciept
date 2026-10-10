import { spawn } from 'node:child_process';

const compiler = spawn(process.execPath, ['../node_modules/typescript/bin/tsc', '--watch', '--preserveWatchOutput'], { stdio: ['inherit', 'pipe', 'inherit'] });
let server;
let restart = Promise.resolve();
let stopping = false;
let partialOutput = '';

compiler.stdout.on('data', (chunk) => {
  process.stdout.write(chunk);
  partialOutput += chunk.toString();
  const lines = partialOutput.split('\n');
  partialOutput = lines.pop() || '';
  if (!lines.some((line) => line.includes('Found 0 errors.'))) return;
  restart = restart.then(async () => {
    if (stopping) return;
    if (server && server.exitCode === null && server.signalCode === null) {
      const exited = new Promise((resolve) => server.once('exit', resolve));
      server.kill();
      await exited;
    }
    server = spawn(process.execPath, ['dist/main.js'], { stdio: 'inherit' });
    server.on('error', (error) => { console.error('Backend process failed:', error.message); stop(); process.exitCode = 1; });
  }).catch((error) => { console.error('Backend restart failed:', error.message); stop(); process.exitCode = 1; });
});

function stop() {
  stopping = true;
  compiler.kill();
  server?.kill();
}

process.on('SIGINT', stop);
process.on('SIGTERM', stop);
compiler.on('exit', (code) => {
  const expected = stopping;
  stop();
  if (!expected) process.exitCode = code ?? 1;
});
compiler.on('error', (error) => { console.error('Compiler failed:', error.message); stop(); process.exitCode = 1; });

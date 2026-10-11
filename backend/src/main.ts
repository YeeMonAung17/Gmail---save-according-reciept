import { createApp } from './bootstrap';

async function start(): Promise<void> {
  const port = Number(process.env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error('PORT must be a valid port number.');
  const origin = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
  if (new URL(origin).origin !== origin)
    throw new Error('FRONTEND_ORIGIN must be an origin without a path.');
  const app = await createApp();
  await app.listen(port, '127.0.0.1');
}

start().catch((error: unknown) => {
  console.error(
    'Backend could not start:',
    error instanceof Error ? error.message : 'Unknown error',
  );
  process.exitCode = 1;
});

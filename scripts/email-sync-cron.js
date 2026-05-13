/**
 * Lanceur : le projet est en "type": "module", la logique cron est en CommonJS
 * dans email-sync-cron.cjs (require, dotenv, etc.).
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const cjs = path.join(path.dirname(fileURLToPath(import.meta.url)), 'email-sync-cron.cjs');
const r = spawnSync(process.execPath, [cjs, ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: process.env,
});
process.exit(r.status === null ? 1 : r.status);

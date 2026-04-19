import { readFile, unlink } from 'fs/promises';
import { resolve } from 'path';

const STATE_PATH = resolve(process.cwd(), 'e2e', '.api-server.pid');

export default async function globalTeardown() {
  try {
    const pidText = await readFile(STATE_PATH, 'utf-8');
    const pid = Number(pidText.trim());
    if (!Number.isNaN(pid)) {
      process.kill(pid, 'SIGTERM');
    }
  } catch {
    // ignore missing PID file or already-terminated process
  }

  try {
    await unlink(STATE_PATH);
  } catch {
    // ignore if file does not exist
  }
}

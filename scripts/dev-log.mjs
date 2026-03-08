import { spawn } from 'child_process';
import { createWriteStream, mkdirSync } from 'fs';
import { resolve } from 'path';

const [,, name, ...cmd] = process.argv;

mkdirSync(resolve('logs'), { recursive: true });
const logFile = createWriteStream(resolve(`logs/${name}-latest.log`), { flags: 'a' });

const child = spawn(cmd[0], cmd.slice(1), { stdio: ['inherit', 'pipe', 'pipe'], shell: true });

function write(chunk) {
  const line = chunk.toString();
  process.stdout.write(line);
  logFile.write(`[${new Date().toISOString()}] ${line}`);
}

child.stdout.on('data', write);
child.stderr.on('data', write);
child.on('exit', code => process.exit(code ?? 0));

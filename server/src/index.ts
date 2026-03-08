import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import boardsRouter from './routes/boards';
import cardsRouter from './routes/cards';
import likesRouter from './routes/likes';
import authRouter from './routes/auth';

// File logger: writes to backend-latest.log (overwrite) and backend-YYYY-MM-DD.log (append).
// In Docker WORKDIR=/app, volume at /app/logs; locally go up one level.
const logsDir = process.env.LOG_DIR ?? path.resolve('..', 'logs');
fs.mkdirSync(logsDir, { recursive: true });
const dateTag = new Date().toISOString().slice(0, 10);
const latestStream = fs.createWriteStream(path.join(logsDir, 'backend-latest.log'), { flags: 'w' });
const sessionStream = fs.createWriteStream(path.join(logsDir, `backend-${dateTag}.log`), { flags: 'a' });
function writeLog(line: string) { latestStream.write(line); sessionStream.write(line); }

const _log = console.log.bind(console);
const _error = console.error.bind(console);
console.log = (...args) => { const line = `[${new Date().toISOString()}] ${args.join(' ')}\n`; process.stdout.write(line); writeLog(line); };
console.error = (...args) => { const line = `[${new Date().toISOString()}] ERROR ${args.join(' ')}\n`; process.stderr.write(line); writeLog(line); };

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors({ origin: process.env.FRONTEND_URL ?? 'http://localhost:5173' }));
app.use(express.json());

// Log every request.
app.use((req, _res, next) => { console.log(`${req.method} ${req.path}`); next(); });

app.use('/api/auth', authRouter);
app.use('/api/boards', boardsRouter);
app.use('/api/cards', cardsRouter);
app.use('/api/likes', likesRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

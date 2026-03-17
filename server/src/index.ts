import express from 'express';
import cors from 'cors';
import boardsRouter from './routes/boards';
import cardsRouter from './routes/cards';
import likesRouter from './routes/likes';
import authRouter from './routes/auth';
import imagesRouter from './routes/images';
import columnsRouter from './routes/columns';
import commentsRouter from './routes/comments';
import tagsRouter from './routes/tags';

const app = express();
const PORT = process.env.PORT ?? 3001;

// FRONTEND_URL may be comma-separated list of allowed origins.
// In dev/preview, Vercel generates unique URLs per push, so we allow
// the whole *.vercel.app subdomain in non-production environments.
const allowedOrigins: (string | RegExp)[] = (process.env.FRONTEND_URL ?? 'http://localhost:5173')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

if (process.env.NODE_ENV !== 'production') {
  allowedOrigins.push(/^https:\/\/.*\.vercel\.app$/);
}

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

// Log every request.
app.use((req, _res, next) => { console.log(`${req.method} ${req.path}`); next(); });

// Open routes (no auth)
app.use('/api/images', imagesRouter);

app.use('/api/auth', authRouter);
app.use('/api/boards', boardsRouter);
app.use('/api/cards', cardsRouter);
app.use('/api/likes', likesRouter);
app.use('/api/columns', columnsRouter);
app.use('/api/comments', commentsRouter);
app.use('/api/tags', tagsRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

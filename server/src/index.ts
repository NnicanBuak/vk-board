import express from 'express';
import cors from 'cors';
import boardsRouter from './routes/boards';
import cardsRouter from './routes/cards';
import likesRouter from './routes/likes';
import authRouter from './routes/auth';

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors({ origin: process.env.FRONTEND_URL ?? 'http://localhost:5173' }));
app.use(express.json());

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

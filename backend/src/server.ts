import express from 'express';
import cors from 'cors';
import interviewRouter from './routes/interview';

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());

app.use('/api', interviewRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import db from './db';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/projects', async (req, res) => {
  const { name, framework } = req.body;
  try {
    const project = await db.project.create({
      data: { name, framework },
    });
    res.json(project);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/projects', async (req, res) => {
  try {
    const projects = await db.project.findMany();
    res.json({ projects });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/data', async (req, res) => {
  try {
    const result = await db.$queryRaw`SELECT 1 as val`;
    res.json({ rows: result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

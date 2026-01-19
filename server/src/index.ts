import dotenv from 'dotenv';
import { createApp } from './app';
import { env } from './config/env';

dotenv.config();

const app = createApp();

app.listen(env.port, () => {
  console.log(`Server is running on http://localhost:${env.port}`);
  console.log(`Swagger UI available at http://localhost:${env.port}/api-docs`);
});

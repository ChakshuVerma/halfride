import { createApp } from "./app";
import { env } from "./config/env";

const app = createApp();

app.listen(env.port, () => {
  console.log(`Server is running on http://localhost:${env.port}`);
  console.log(`Swagger UI available at http://localhost:${env.port}/docs`);
});

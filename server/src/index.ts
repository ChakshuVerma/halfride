import { env } from "./config/env";
import { createApp } from "./app";

const app = createApp();

app.listen(env.port, () => {
  console.log(`Server is running on http://localhost:${env.port}`);
});

import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";

import { swaggerSpec } from "./config/swagger";
import { apiRouter } from "./routes";

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // Swagger UI (includes an "Authorize" button for Bearer tokens)
  app.use(
    "/docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      swaggerOptions: { persistAuthorization: true },
    })
  );

  app.use(apiRouter);

  return app;
}


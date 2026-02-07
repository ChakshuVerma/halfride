import express from "express";
import cors from "cors";
import { apiRouter } from "./routes";

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // API routes (keep existing paths under /api/*)
  app.use("/api", apiRouter);

  // Basic error handler (avoid Express default HTML error pages)
  app.use(
    (
      err: any,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      console.error(err);
      res.status(500).json({
        ok: false,
        error: "Internal Server Error",
        message: err?.message ?? "Unknown error",
      });
    },
  );

  return app;
}

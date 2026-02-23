import express from "express";
import cors from "cors";
import { apiRouter } from "./routes";
import { ApiError, buildErrorBody } from "./utils/errors";

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // API routes (keep existing paths under /api/*)
  app.use("/api", apiRouter);

  // Basic error handler (avoid Express default HTML error pages)
  app.use(
    (
      err: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      if (res.headersSent) {
        // Let Express handle it if headers are already sent
        return;
      }

      // Known, structured API error
      if (err instanceof ApiError) {
        console.error(err);
        const body = buildErrorBody({
          statusCode: err.statusCode,
          code: err.code,
          message: err.message,
          details: err.details,
        });
        return res.status(err.statusCode).json(body);
      }

      // Fallback for unexpected errors
      console.error(err);
      const message =
        process.env.NODE_ENV === "production"
          ? "Something went wrong. Please try again."
          : err instanceof Error
            ? err.message
            : "Unknown error";

      const body = buildErrorBody({
        statusCode: 500,
        code: "INTERNAL_SERVER_ERROR",
        message,
      });

      res.status(500).json(body);
    },
  );

  return app;
}

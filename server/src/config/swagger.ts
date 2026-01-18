import swaggerJSDoc from "swagger-jsdoc";

export const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: "3.0.3",
    info: {
      title: "HalfRide Server API",
      version: "1.0.0",
      description: "Express API with Firebase Auth (ID token) verification",
    },
    servers: [{ url: "http://localhost:3000" }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Firebase Auth ID token (Authorization: Bearer <idToken>)",
        },
      },
    },
    tags: [{ name: "Health" }],
    paths: {
      "/health": {
        get: {
          tags: ["Health"],
          summary: "Health check (verifies Firebase ID token)",
          security: [{ bearerAuth: [] }],
          responses: {
            "200": {
              description: "Token valid; service healthy",
              content: {
                "application/json": {
                  example: {
                    ok: true,
                    message: "healthy",
                    uid: "someUid",
                    phone_number: "+15551234567",
                  },
                },
              },
            },
            "401": {
              description: "Missing/invalid token",
              content: {
                "application/json": {
                  example: { ok: false, error: "Invalid token" },
                },
              },
            },
          },
        },
      },
      "/health/public": {
        get: {
          tags: ["Health"],
          summary: "Public health check (no auth)",
          responses: {
            "200": {
              description: "Service healthy",
              content: {
                "application/json": {
                  example: { ok: true, message: "healthy" },
                },
              },
            },
          },
        },
      },
    },
  },
  apis: [],
});


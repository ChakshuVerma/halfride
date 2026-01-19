// Minimal OpenAPI v3 type surface (enough for our static spec object).
// We keep this local to avoid adding extra npm dependencies.
export namespace OpenAPIV3 {
  export type Document = {
    openapi: string;
    info: {
      title: string;
      version: string;
      description?: string;
    };
    servers?: Array<{ url: string }>;
    tags?: Array<{ name: string; description?: string }>;
    components?: Record<string, unknown>;
    paths: Record<string, unknown>;
  };
}


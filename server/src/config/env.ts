import dotenv from "dotenv";

dotenv.config();

export type NodeEnv = "development" | "test" | "production";

export interface Env {
  port: number;
  nodeEnv: NodeEnv;
  accessTokenSecret: string;
  refreshTokenSecret: string;
  firebaseProjectId: string;
  googleMapsApiKey?: string;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(
      `${name} must be set (check server/.env for exact variable name)`,
    );
  }
  return value.trim();
}

const nodeEnv: NodeEnv =
  (process.env.NODE_ENV as NodeEnv | undefined) ?? "development";

export const env: Env = {
  port: process.env.PORT ? Number(process.env.PORT) : 3000,
  nodeEnv,
  accessTokenSecret: requireEnv("ACCESS_TOKEN_SECRET"),
  refreshTokenSecret: requireEnv("REFRESH_TOKEN_SECRET"),
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID || "halfride-c5355",
  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY?.trim() || undefined,
};


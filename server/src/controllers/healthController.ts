import type { RequestHandler } from "express";

export const publicHealth: RequestHandler = async (_req, res) => {
  return res.json({ ok: true, message: "healthy" });
};

export const authedHealth: RequestHandler = async (req, res) => {
  return res.json({
    ok: true,
    message: "healthy",
    uid: req.user?.uid ?? null,
    phone_number: (req.user as any)?.phone_number ?? null,
  });
};


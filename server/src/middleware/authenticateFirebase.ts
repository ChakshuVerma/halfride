import type { RequestHandler } from "express";
import { firebaseAdmin } from "../config/firebaseAdmin";

/**
 * Verifies Firebase Auth ID token from: Authorization: Bearer <idToken>
 * On success, attaches decoded token to req.user
 */
export const authenticateFirebase: RequestHandler = async (req, res, next) => {
  try {
    const authHeader = req.header("authorization") || "";
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (!match) return res.status(401).json({ ok: false, error: "Missing Bearer token" });

    const idToken = match[1];
    const decoded = await firebaseAdmin.auth().verifyIdToken(idToken);
    req.user = decoded;
    return next();
  } catch (e: any) {
    return res.status(401).json({ ok: false, error: "Invalid token", detail: e?.message });
  }
};


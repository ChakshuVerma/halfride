import type { DecodedIdToken } from "firebase-admin/auth";
import type { SessionAuth } from "../middleware/sessionAuth";

declare global {
  namespace Express {
    interface Request {
      user?: DecodedIdToken;
      auth?: SessionAuth;
    }
  }
}

export {};


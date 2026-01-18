import type { DecodedIdToken } from '../firebase/admin';
import type { SessionAuth } from '../middleware/sessionAuth';

declare global {
  namespace Express {
    interface Request {
      user?: DecodedIdToken;
      auth?: SessionAuth;
    }
  }
}

export {};

import type { DecodedIdToken } from "../firebase/admin";

declare module "express-serve-static-core" {
  interface Request {
    user?: DecodedIdToken;
  }
}

export {};

import type { DecodedIdToken } from "firebase-admin/auth";

declare module "express-serve-static-core" {
  interface Request {
    user?: DecodedIdToken;
  }
}

export {};


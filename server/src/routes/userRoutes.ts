import { Router } from "express";
import { createMe } from "../controllers/userController";
import { authenticateFirebase } from "../middleware/authenticateFirebase";

export const userRouter = Router();

// Create a user profile for the authenticated uid
userRouter.post("/me", authenticateFirebase, createMe);


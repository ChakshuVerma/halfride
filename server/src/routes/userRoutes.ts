import { Router } from "express";
import { createMe, meExists } from "../controllers/userController";
import { authenticateFirebase } from "../middleware/authenticateFirebase";

export const userRouter = Router();

// Create a user profile for the authenticated uid
userRouter.post("/me", authenticateFirebase, createMe);

// Check if a user profile exists for the authenticated uid
userRouter.get("/me/exists", authenticateFirebase, meExists);


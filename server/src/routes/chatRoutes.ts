import { Router } from "express";
import { requireSession } from "../middleware/sessionAuth";
import {
  sendGroupMessage,
  getGroupMessages,
} from "../controllers/chatController";

export const chatRouter = Router();

chatRouter.post(
  "/groups/:groupId/messages",
  requireSession,
  sendGroupMessage,
);

chatRouter.get(
  "/groups/:groupId/messages",
  requireSession,
  getGroupMessages,
);


import { Router } from "express";
import {
  markNotificationRead,
  markAllNotificationsRead,
  seedDummyNotifications,
} from "./notification.controller";
import { requireSession } from "../../middleware/sessionAuth";

export const notificationRouter = Router();

// Mark a single notification as read
notificationRouter.patch(
  "/notifications/:notificationId/read",
  requireSession,
  markNotificationRead,
);

// Mark all as read
notificationRouter.patch(
  "/notifications/read-all",
  requireSession,
  markAllNotificationsRead,
);

// Seeder (Dev only)
notificationRouter.post(
  "/notifications/seed",
  requireSession,
  seedDummyNotifications,
);


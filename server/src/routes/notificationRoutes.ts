import { Router } from "express";
import {
  markNotificationRead,
  markAllNotificationsRead,
  seedDummyNotifications,
} from "../controllers/notificationController";
import { requireSession } from "../middleware/sessionAuth";

const router = Router();

// Mark a single notification as read
router.patch(
  "/notifications/:notificationId/read",
  requireSession,
  markNotificationRead,
);

// Mark all as read
router.patch(
  "/notifications/read-all",
  requireSession,
  markAllNotificationsRead,
);

// Seeder (Dev only)
router.post("/notifications/seed", requireSession, seedDummyNotifications);

export const notificationRouter = router;

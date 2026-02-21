import { Router } from "express";
import {
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getUnreadCount,
  seedDummyNotifications,
} from "../controllers/notificationController";
import { requireSession } from "../middleware/sessionAuth";

const router = Router();

// Retrieve notifications (Fetch)
router.get("/notifications", requireSession, getMyNotifications);

// Retrieve unread count
router.get("/notifications/unread-count", requireSession, getUnreadCount);

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

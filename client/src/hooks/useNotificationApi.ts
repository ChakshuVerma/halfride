import { useCallback, useState } from "react";
import { useApi } from "./useApi";
import { API_ROUTES } from "@/lib/apiRoutes";
import { toast } from "sonner";

/** Page size used for client-side notifications list */
export const NOTIFICATIONS_PAGE_SIZE = 6;

export interface Notification {
  notificationId: string;
  recipientUserId: string;
  type: string;
  title: string;
  body: string;
  data: any;
  isRead: boolean;
  createdAt: any;
}

export function useNotificationApi() {
  const { sessionRequest } = useApi();
  const [seedLoading, setSeedLoading] = useState(false);

  const markRead = useCallback(
    async (notificationId: string) => {
      try {
        await sessionRequest(
          `${API_ROUTES.NOTIFICATIONS}/${notificationId}/read`,
          {
            method: "PATCH",
          },
        );
        return true;
      } catch (error) {
        console.error("Mark Read Error:", error);
        return false;
      }
    },
    [sessionRequest],
  );

  const markAllRead = useCallback(async () => {
    try {
      await sessionRequest(API_ROUTES.NOTIFICATIONS_READ_ALL, {
        method: "PATCH",
      });
      return true;
    } catch (error) {
      console.error("Mark All Read Error:", error);
      return false;
    }
  }, [sessionRequest]);

  const seedNotifications = useCallback(async () => {
    setSeedLoading(true);
    try {
      const response = await sessionRequest<{
        ok: boolean;
        message: string;
      }>(API_ROUTES.NOTIFICATIONS_SEED, {
        method: "POST",
      });

      if (response.ok) {
        toast.success("Dummy notifications seeded!");
      } else {
        toast.error("Failed to seed notifications");
      }
      return response;
    } catch (error: any) {
      console.error("Seed Notifications Error:", error);
      toast.error(error.message || "Failed to seed notifications");
      return { ok: false };
    } finally {
      setSeedLoading(false);
    }
  }, [sessionRequest]);

  return {
    markRead,
    markAllRead,
    seedNotifications,
    seedLoading,
  };
}

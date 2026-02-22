import { useCallback } from "react";
import { useApi } from "./useApi";
import { API_ROUTES } from "@/lib/apiRoutes";
import { toast } from "sonner";

/** Max notifications per page (must match server NOTIFICATIONS_PAGE_SIZE) */
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
  const { sessionRequest, loading } = useApi();

  const fetchNotifications = useCallback(
    async (
      limit = NOTIFICATIONS_PAGE_SIZE,
      lastId?: string,
    ): Promise<{ data: Notification[]; hasMore: boolean }> => {
      try {
        const params = new URLSearchParams({ limit: limit.toString() });
        if (lastId) params.append("lastId", lastId);

        const response = await sessionRequest<{
          ok: boolean;
          data: Notification[];
          hasMore?: boolean;
        }>(`${API_ROUTES.NOTIFICATIONS}?${params.toString()}`);
        const data = response.data || [];
        const hasMore = response.hasMore ?? false;
        return { data, hasMore };
      } catch (error) {
        console.error("Fetch Notifications Error:", error);
        return { data: [], hasMore: false };
      }
    },
    [sessionRequest],
  );

  const getUnreadCount = useCallback(async () => {
    try {
      const response = await sessionRequest<{
        ok: boolean;
        count: number;
      }>(API_ROUTES.NOTIFICATIONS_UNREAD);
      return response.ok ? response.count : 0;
    } catch (error) {
      console.error("Get Unread Count Error:", error);
      return 0;
    }
  }, [sessionRequest]);

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
    }
  }, [sessionRequest]);

  return {
    fetchNotifications,
    getUnreadCount,
    markRead,
    markAllRead,
    seedNotifications,
    loading,
  };
}

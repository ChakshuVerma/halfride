import { useEffect, useState, useCallback } from "react";
import {
  collection,
  doc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  startAfter,
  getDocs,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "@/firebase/setup";
import { useAuth } from "@/contexts/AuthContext";
import {
  useNotificationApi,
  NOTIFICATIONS_PAGE_SIZE,
} from "./useNotificationApi";
import type { Notification } from "./useNotificationApi";
export type { Notification };

/** Map Firestore notification doc to client Notification shape (refs -> IDs). */
function mapDocToNotification(
  docSnap: QueryDocumentSnapshot<DocumentData>,
): Notification {
  const d = docSnap.data() as Record<string, unknown>;
  const recipientRef = d["recipientRef"] as { id: string } | undefined;
  const data = (d["data"] as Record<string, unknown>) ?? {};
  const groupRef = data["groupRef"] as { id: string } | undefined;
  const actorUserRef = data["actorUserRef"] as { id: string } | undefined;
  const createdAt = d["createdAt"] as
    | { seconds?: number; _seconds?: number; toDate?: () => Date }
    | undefined;

  return {
    notificationId: (d["notificationId"] as string) ?? docSnap.id,
    recipientUserId: recipientRef?.id ?? "",
    type: (d["type"] as string) ?? "",
    title: (d["title"] as string) ?? "",
    body: (d["body"] as string) ?? "",
    data: {
      ...data,
      groupRef: undefined,
      actorUserRef: undefined,
      groupId: groupRef?.id ?? data["groupId"],
      actorUserId: actorUserRef?.id ?? data["actorUserId"],
    },
    isRead: (d["isRead"] as boolean) ?? false,
    createdAt: createdAt ?? null,
  };
}

/**
 * Real-time notifications for the first page via Firestore onSnapshot.
 * Unread count is derived from the first page. Load more and mark read use REST.
 */
export function useNotificationRealtime() {
  const { user } = useAuth();
  const { markRead: markReadApi, markAllRead: markAllReadApi } =
    useNotificationApi();

  const markRead = useCallback(
    async (notificationId: string) => {
      const ok = await markReadApi(notificationId);
      if (ok) {
        setRealtimeFirstPage((prev) =>
          prev.map((n) =>
            n.notificationId === notificationId ? { ...n, isRead: true } : n,
          ),
        );
        setOlderPages((prev) =>
          prev.map((n) =>
            n.notificationId === notificationId ? { ...n, isRead: true } : n,
          ),
        );
      }
      return ok;
    },
    [markReadApi],
  );

  const markAllRead = useCallback(async () => {
    const ok = await markAllReadApi();
    if (ok) {
      setRealtimeFirstPage((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setOlderPages((prev) => prev.map((n) => ({ ...n, isRead: true })));
    }
    return ok;
  }, [markAllReadApi]);

  const [realtimeFirstPage, setRealtimeFirstPage] = useState<Notification[]>([]);
  const [olderPages, setOlderPages] = useState<Notification[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastDoc, setLastDoc] =
    useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [loadMoreLoading, setLoadMoreLoading] = useState(false);

  const notifications = [...realtimeFirstPage, ...olderPages];
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  useEffect(() => {
    if (!user?.uid) {
      setRealtimeFirstPage([]);
      setOlderPages([]);
      setHasMore(false);
      setLoading(false);
      setError(null);
      setLastDoc(null);
      setLoadMoreLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const notificationsRef = collection(db, "notifications");
    const userRef = doc(db, "users", user.uid);
    const q = query(
      notificationsRef,
      where("recipientRef", "==", userRef),
      orderBy("createdAt", "desc"),
      limit(NOTIFICATIONS_PAGE_SIZE),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs;
        setHasMore(docs.length === NOTIFICATIONS_PAGE_SIZE);
        setRealtimeFirstPage(docs.map(mapDocToNotification));
        setLastDoc(docs.length ? docs[docs.length - 1] : null);
        setLoading(false);
      },
      (err) => {
        console.error("useNotificationRealtime snapshot error", err);
        setError("Failed to load notifications");
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [user?.uid]);

  const loadMore = useCallback(async () => {
    if (!user?.uid || !lastDoc || !hasMore || loadMoreLoading) return;

    setLoadMoreLoading(true);
    try {
      const notificationsRef = collection(db, "notifications");
      const userRef = doc(db, "users", user.uid);
      const q = query(
        notificationsRef,
        where("recipientRef", "==", userRef),
        orderBy("createdAt", "desc"),
        startAfter(lastDoc),
        limit(NOTIFICATIONS_PAGE_SIZE),
      );

      const snapshot = await getDocs(q);
      const docs = snapshot.docs;
      setLastDoc(docs.length ? docs[docs.length - 1] : lastDoc);
      setHasMore(docs.length === NOTIFICATIONS_PAGE_SIZE);
      const nextPage = docs.map(mapDocToNotification);
      setOlderPages((prev) => [...prev, ...nextPage]);
    } catch (err) {
      console.error("useNotificationRealtime loadMore error", err);
    } finally {
      setLoadMoreLoading(false);
    }
  }, [user?.uid, lastDoc, hasMore, loadMoreLoading]);

  return {
    notifications,
    unreadCount,
    hasMore,
    loading,
    error,
    loadMore,
    loadMoreLoading,
    markRead,
    markAllRead,
  };
}

import { useEffect, useMemo, useState, useCallback } from "react";
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  startAfter,
  addDoc,
  serverTimestamp,
  getDocs,
  type QueryDocumentSnapshot,
  type DocumentData,
} from "firebase/firestore";
import { db } from "@/firebase/setup";
import { useAuth } from "@/contexts/AuthContext";

export type GroupMessage = {
  id: string;
  groupId: string | null;
  /** "system" for join/leave info; "user" for normal messages (default). */
  type?: "user" | "system";
  senderId: string | null;
  senderDisplayName: string | null;
  senderPhotoURL: string | null;
  text: string;
  createdAt: string | null;
};

type UseGroupChatOptions = {
  pageSize?: number;
};

export function useGroupChat(groupId: string | undefined, options?: UseGroupChatOptions) {
  const { user, userProfile } = useAuth();
  const pageSize = options?.pageSize ?? 50;

  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);

  useEffect(() => {
    if (!groupId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const messagesRef = collection(db, "groups", groupId, "messages");
    const q = query(messagesRef, orderBy("createdAt", "desc"), limit(pageSize));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs;
        setLastDoc(docs.length > 0 ? docs[docs.length - 1] : null);
        setHasMore(docs.length === pageSize);

        const data: GroupMessage[] = docs
          .map((doc) => {
            const d = doc.data() as Record<string, unknown>;
            const createdAt = d["createdAt"] as { toDate?: () => Date } | undefined;
            const type = d["type"] as "user" | "system" | undefined;
            return {
              id: doc.id,
              groupId: (d["groupId"] as string) ?? null,
              type: type === "system" ? "system" : "user",
              senderId: (d["senderId"] as string) ?? null,
              senderDisplayName: (d["senderDisplayName"] as string) ?? null,
              senderPhotoURL: (d["senderPhotoURL"] as string | null) ?? null,
              text: (d["text"] as string) ?? "",
              createdAt: createdAt?.toDate?.()?.toISOString?.() ?? null,
            };
          })
          // convert desc -> asc for UI
          .reverse();

        setMessages(data);
        setLoading(false);
      },
      (err) => {
        console.error("useGroupChat snapshot error", err);
        setError("Failed to load messages");
        setLoading(false);
      },
    );

    return () => {
      unsubscribe();
    };
  }, [groupId, pageSize]);

  const loadMore = useCallback(async () => {
    if (!groupId || !lastDoc || !hasMore || loadingMore) return;

    setLoadingMore(true);
    try {
      const messagesRef = collection(db, "groups", groupId, "messages");
      const q = query(
        messagesRef,
        orderBy("createdAt", "desc"),
        startAfter(lastDoc),
        limit(pageSize),
      );

      const snapshot = await getDocs(q);

      const docs = snapshot.docs;
      setLastDoc(docs.length > 0 ? docs[docs.length - 1] : lastDoc);
      setHasMore(docs.length === pageSize);

      const older: GroupMessage[] = docs
        .map((doc) => {
          const d = doc.data() as Record<string, unknown>;
          const createdAt = d["createdAt"] as { toDate?: () => Date } | undefined;
          const type = d["type"] as "user" | "system" | undefined;
          return {
            id: doc.id,
            groupId: (d["groupId"] as string) ?? null,
            type: type === "system" ? "system" : "user",
            senderId: (d["senderId"] as string) ?? null,
            senderDisplayName: (d["senderDisplayName"] as string) ?? null,
            senderPhotoURL: (d["senderPhotoURL"] as string | null) ?? null,
            text: (d["text"] as string) ?? "",
            createdAt: createdAt?.toDate?.()?.toISOString?.() ?? null,
          };
        })
        .reverse();

      setMessages((prev) => [...older, ...prev]);
    } catch (err) {
      console.error("useGroupChat loadMore error", err);
      setError("Failed to load more messages");
    } finally {
      setLoadingMore(false);
    }
  }, [groupId, hasMore, lastDoc, loadingMore, pageSize]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!groupId || !trimmed) return;
      if (!user) {
        throw new Error("Not authenticated");
      }

      const senderId = user.uid;
      const senderDisplayName =
        userProfile?.firstName ??
        user.username ??
        "You";
      const senderPhotoURL = userProfile?.photoURL ?? null;

      await addDoc(collection(db, "groups", groupId, "messages"), {
        groupId,
        senderId,
        senderDisplayName,
        senderPhotoURL,
        text: trimmed,
        createdAt: serverTimestamp(),
      });
    },
    [groupId, user, userProfile],
  );

  const orderedMessages = useMemo(() => messages, [messages]);

  return {
    messages: orderedMessages,
    loading,
    error,
    hasMore,
    loadingMore,
    loadMore,
    sendMessage,
  };
}


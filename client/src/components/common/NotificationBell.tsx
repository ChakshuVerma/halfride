import {
  useState,
  useEffect,
  useMemo,
  type ReactNode,
  type MouseEvent,
} from "react";
import { Bell, Inbox, MessageCircle, Loader2, ChevronDown } from "lucide-react";
import { useEntityModal } from "@/contexts/useEntityModal";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useNotificationApi,
  NOTIFICATIONS_PAGE_SIZE,
  type Notification,
} from "@/hooks/useNotificationApi";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

/** Action types sent by the backend; frontend performs navigation based on these. */
const NOTIFICATION_ACTION_TYPES = {
  OPEN_GROUP: "OPEN_GROUP",
  OPEN_TRAVELLER: "OPEN_TRAVELLER",
} as const;

type NotificationAction = {
  type: (typeof NOTIFICATION_ACTION_TYPES)[keyof typeof NOTIFICATION_ACTION_TYPES];
  payload: { airportCode: string; groupId?: string; userId?: string };
};

function isNotificationAction(action: unknown): action is NotificationAction {
  return (
    typeof action === "object" &&
    action !== null &&
    "type" in action &&
    "payload" in action &&
    typeof (action as NotificationAction).payload === "object" &&
    typeof (action as NotificationAction).payload.airportCode === "string"
  );
}

/** Use the action type and payload from the backend to determine behaviour. */
function getNotificationAction(n: Notification): NotificationAction | null {
  const action = n.data?.action;
  if (!isNotificationAction(action)) return null;
  if (action.type !== NOTIFICATION_ACTION_TYPES.OPEN_GROUP && action.type !== NOTIFICATION_ACTION_TYPES.OPEN_TRAVELLER) {
    return null;
  }
  return action;
}

type FilterType = "all" | "unread";

const NOTIFICATION_CONSTANTS = {
  TITLE: "Notifications",
  ACTIONS: {
    MARK_ALL_READ: "Mark all as read",
  },
  EMPTY_STATES: {
    ALL_CAUGHT_UP: "All caught up!",
    NO_NOTIFICATIONS: "No notifications",
    NO_UNREAD_MESSAGES: "You have no unread messages.",
    IMPORTANT_NOTIFICATIONS:
      "We'll notify you when something important happens.",
  },
  TIME: {
    JUST_NOW: "Just now",
  },
  ERRORS: {
    LOAD_FAILED: "Failed to load notifications:",
  },
  FILTERS: {
    ALL: "all" as const,
    UNREAD: "unread" as const,
  },
};

function renderNotificationBody(
  body: string,
  groupName: string | undefined,
): ReactNode {
  if (
    !groupName ||
    typeof groupName !== "string" ||
    !body.includes(groupName)
  ) {
    return body;
  }
  const idx = body.indexOf(groupName);
  if (idx === -1) return body;
  return (
    <>
      {body.slice(0, idx)}
      <strong className="font-semibold text-foreground">{groupName}</strong>
      {body.slice(idx + groupName.length)}
    </>
  );
}

export function NotificationBell() {
  const { openEntityModal } = useEntityModal();
  const {
    fetchNotifications,
    getUnreadCount,
    markRead,
    markAllRead,
    loadMoreLoading,
  } = useNotificationApi();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>(
    NOTIFICATION_CONSTANTS.FILTERS.ALL,
  );

  const loadData = async () => {
    try {
      const [{ data: msgs, hasMore: more }, count] = await Promise.all([
        fetchNotifications(NOTIFICATIONS_PAGE_SIZE),
        getUnreadCount(),
      ]);
      setNotifications(msgs);
      setHasMore(more);
      setUnreadCount(count);
    } catch (err) {
      console.error(NOTIFICATION_CONSTANTS.ERRORS.LOAD_FAILED, err);
    }
  };

  // Initial load & Polling
  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, []);

  const loadMore = async () => {
    if (!notifications.length || !hasMore || loadMoreLoading) return;
    const lastId = notifications[notifications.length - 1]?.notificationId;
    if (!lastId) return;
    try {
      const { data: nextPage, hasMore: more } = await fetchNotifications(
        NOTIFICATIONS_PAGE_SIZE,
        lastId,
      );
      setNotifications((prev) => [...prev, ...nextPage]);
      setHasMore(more);
    } catch (e) {
      console.error(NOTIFICATION_CONSTANTS.ERRORS.LOAD_FAILED, e);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      loadData();
    }
  };

  const handleNotificationClick = async (n: Notification) => {
    const { notificationId, isRead } = n;
    if (!isRead) {
      const success = await markRead(notificationId);
      if (success) {
        setNotifications((prev) =>
          prev.map((item) =>
            item.notificationId === notificationId
              ? { ...item, isRead: true }
              : item,
          ),
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      }
    }
    const action = getNotificationAction(n);
    if (action) {
      setIsOpen(false);
      const { airportCode } = action.payload;
      if (action.type === NOTIFICATION_ACTION_TYPES.OPEN_GROUP && action.payload.groupId) {
        openEntityModal({
          type: "group",
          airportCode,
          entityId: action.payload.groupId,
        });
      } else if (action.type === NOTIFICATION_ACTION_TYPES.OPEN_TRAVELLER && action.payload.userId) {
        openEntityModal({
          type: "traveller",
          airportCode,
          entityId: action.payload.userId,
        });
      }
    }
  };

  const handleNotificationActionClick = async (
    event: MouseEvent<HTMLSpanElement>,
    n: Notification,
  ) => {
    event.stopPropagation();
    await handleNotificationClick(n);
  };

  const handleMarkAllRead = async () => {
    const success = await markAllRead();
    if (success) {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    }
  };

  const formatTime = (createdAt: any) => {
    if (!createdAt) return NOTIFICATION_CONSTANTS.TIME.JUST_NOW;
    try {
      const date = createdAt._seconds
        ? new Date(createdAt._seconds * 1000)
        : createdAt.seconds
          ? new Date(createdAt.seconds * 1000)
          : new Date(createdAt);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (e) {
      return NOTIFICATION_CONSTANTS.TIME.JUST_NOW;
    }
  };

  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      if (activeFilter === NOTIFICATION_CONSTANTS.FILTERS.UNREAD)
        return !n.isRead;
      return true;
    });
  }, [notifications, activeFilter]);

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors focus-visible:ring-0"
        >
          <Bell className="h-5 w-5" />

          {/* Static, Clean Badge (No blinking) */}
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[calc(100vw-2rem)] max-w-[400px] mx-4 p-0 rounded-2xl border-0 shadow-[0_8px_30px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.4)] overflow-hidden bg-card/95 backdrop-blur-xl"
        align="end"
        sideOffset={8}
      >
        {/* Header */}
        <div className="px-4 sm:px-5 pt-5 pb-4 border-b border-border/50">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Bell className="h-4.5 w-4.5" />
              </div>
              <h4 className="font-semibold text-base tracking-tight text-foreground">
                {NOTIFICATION_CONSTANTS.TITLE}
              </h4>
            </div>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-8 text-muted-foreground hover:text-primary hover:bg-primary/5"
                onClick={handleMarkAllRead}
              >
                {NOTIFICATION_CONSTANTS.ACTIONS.MARK_ALL_READ}
              </Button>
            )}
          </div>

          {/* Filter pills */}
          <div className="flex gap-1.5 mt-4 px-0">
            {(
              [
                NOTIFICATION_CONSTANTS.FILTERS.ALL,
                NOTIFICATION_CONSTANTS.FILTERS.UNREAD,
              ] as const
            ).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveFilter(tab)}
                className={cn(
                  "flex-1 text-xs font-medium py-2 px-3 rounded-xl transition-all duration-200 capitalize",
                  activeFilter === tab
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <ScrollArea className="h-[420px]">
          <div className="px-4 py-4 sm:px-3 sm:py-3">
            {filteredNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 px-6 text-center rounded-2xl bg-muted/20 border border-dashed border-border/60">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/40 mb-4">
                  <Inbox className="h-7 w-7 text-muted-foreground/50" />
                </div>
                <p className="text-sm font-semibold text-foreground">
                  {activeFilter === NOTIFICATION_CONSTANTS.FILTERS.UNREAD
                    ? NOTIFICATION_CONSTANTS.EMPTY_STATES.ALL_CAUGHT_UP
                    : NOTIFICATION_CONSTANTS.EMPTY_STATES.NO_NOTIFICATIONS}
                </p>
                <p className="text-xs text-muted-foreground mt-1.5 max-w-[200px] leading-relaxed">
                  {activeFilter === NOTIFICATION_CONSTANTS.FILTERS.UNREAD
                    ? NOTIFICATION_CONSTANTS.EMPTY_STATES.NO_UNREAD_MESSAGES
                    : NOTIFICATION_CONSTANTS.EMPTY_STATES.IMPORTANT_NOTIFICATIONS}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {filteredNotifications.map((n) => {
                  const isUnread = !n.isRead;
                  const action = getNotificationAction(n);
                  return (
                    <button
                      key={n.notificationId}
                      type="button"
                      onClick={() => handleNotificationClick(n)}
                      className={cn(
                        "relative w-full flex gap-3 text-left px-4 py-3.5 rounded-xl cursor-pointer transition-all duration-200",
                        "hover:shadow-md hover:scale-[1.01] active:scale-[0.99]",
                        "border border-transparent hover:border-border/50",
                        isUnread
                          ? "bg-primary/5 hover:bg-primary/10"
                          : "bg-muted/20 hover:bg-muted/40",
                      )}
                    >
                      <div className="relative shrink-0">
                        <div
                          className={cn(
                            "flex h-9 w-9 items-center justify-center rounded-lg",
                            isUnread ? "bg-primary/15 text-primary" : "bg-muted/50 text-muted-foreground",
                          )}
                        >
                          <MessageCircle className="h-4 w-4" />
                        </div>
                        {isUnread && (
                          <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-primary border-2 border-card" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 pt-0.5">
                        <div className="flex items-start justify-between gap-2">
                          <span
                            className={cn(
                              "text-sm leading-snug",
                              isUnread
                                ? "font-semibold text-foreground"
                                : "font-medium text-muted-foreground",
                            )}
                          >
                            {n.title}
                          </span>
                          <span className="text-[10px] text-muted-foreground/80 shrink-0 mt-0.5">
                            {formatTime(n.createdAt)}
                          </span>
                        </div>
                        <p
                          className={cn(
                            "text-xs line-clamp-2 leading-relaxed mt-1",
                            isUnread
                              ? "text-muted-foreground"
                              : "text-muted-foreground/70",
                          )}
                        >
                          {renderNotificationBody(n.body, n.data?.groupName)}
                        </p>
                        {action && (
                          <span
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-primary mt-2"
                            onClick={(event) =>
                              handleNotificationActionClick(event, n)
                            }
                          >
                            {action.type === NOTIFICATION_ACTION_TYPES.OPEN_GROUP
                              ? "View group"
                              : "View request"}
                            <ChevronDown className="h-3 w-3 rotate-270" />
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
                {hasMore && activeFilter === NOTIFICATION_CONSTANTS.FILTERS.ALL && (
                  <div className="pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full rounded-xl text-xs h-9 border-dashed text-muted-foreground hover:text-foreground hover:bg-muted/40"
                      onClick={loadMore}
                      disabled={loadMoreLoading}
                    >
                      {loadMoreLoading ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                          Loading…
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-3.5 w-3.5 mr-2" />
                          Load more
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

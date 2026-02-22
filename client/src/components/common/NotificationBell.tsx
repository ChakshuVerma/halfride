import { useState, useEffect, useMemo, type ReactNode } from "react";
import { Bell, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useNotificationApi,
  type Notification,
} from "@/hooks/useNotificationApi";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

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
  const { fetchNotifications, getUnreadCount, markRead, markAllRead } =
    useNotificationApi();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>(
    NOTIFICATION_CONSTANTS.FILTERS.ALL,
  );

  // Initial load & Polling
  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [msgs, count] = await Promise.all([
        fetchNotifications(50),
        getUnreadCount(),
      ]);
      setNotifications(msgs);
      setUnreadCount(count);
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

  const handleNotificationClick = async (id: string, isRead: boolean) => {
    if (!isRead) {
      const success = await markRead(id);
      if (success) {
        setNotifications((prev) =>
          prev.map((n) =>
            n.notificationId === id ? { ...n, isRead: true } : n,
          ),
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      }
    }
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
        className="w-[380px] p-0 border-border/60 shadow-xl"
        align="end"
        sideOffset={5}
      >
        {/* Header Area */}
        <div className="flex flex-col border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center justify-between px-4 py-3">
            <h4 className="font-semibold text-sm tracking-tight">
              {NOTIFICATION_CONSTANTS.TITLE}
            </h4>
            {unreadCount > 0 && (
              <button
                className="text-[11px] font-medium text-muted-foreground hover:text-primary transition-colors"
                onClick={handleMarkAllRead}
              >
                {NOTIFICATION_CONSTANTS.ACTIONS.MARK_ALL_READ}
              </button>
            )}
          </div>

          {/* Segmented Control Filter */}
          <div className="px-4 pb-3">
            <div className="flex p-1 bg-muted/40 rounded-lg">
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
                    "flex-1 text-xs font-medium py-1.5 rounded-md transition-all duration-200 capitalize",
                    activeFilter === tab
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/50",
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Notification List */}
        <ScrollArea className="h-[400px]">
          {filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="bg-muted/30 p-4 rounded-full mb-3">
                <Inbox className="h-8 w-8 text-muted-foreground/40" />
              </div>
              <p className="text-sm font-medium text-foreground">
                {activeFilter === NOTIFICATION_CONSTANTS.FILTERS.UNREAD
                  ? NOTIFICATION_CONSTANTS.EMPTY_STATES.ALL_CAUGHT_UP
                  : NOTIFICATION_CONSTANTS.EMPTY_STATES.NO_NOTIFICATIONS}
              </p>
              <p className="text-xs text-muted-foreground mt-1 max-w-[180px]">
                {activeFilter === NOTIFICATION_CONSTANTS.FILTERS.UNREAD
                  ? NOTIFICATION_CONSTANTS.EMPTY_STATES.NO_UNREAD_MESSAGES
                  : NOTIFICATION_CONSTANTS.EMPTY_STATES.IMPORTANT_NOTIFICATIONS}
              </p>
            </div>
          ) : (
            <div className="flex flex-col">
              {filteredNotifications.map((n) => {
                const isUnread = !n.isRead;
                return (
                  <div
                    key={n.notificationId}
                    onClick={() =>
                      handleNotificationClick(n.notificationId, n.isRead)
                    }
                    className={cn(
                      "relative flex gap-3 px-4 py-3.5 border-b last:border-0 cursor-pointer transition-all duration-200 group",
                      "hover:bg-muted/40",
                      isUnread ? "bg-background" : "bg-background/40",
                    )}
                  >
                    {/* Unread Indicator Bar */}
                    {isUnread && (
                      <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-blue-600 rounded-r-full" />
                    )}

                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={cn(
                            "text-sm leading-none",
                            isUnread
                              ? "font-semibold text-foreground"
                              : "font-medium text-muted-foreground",
                          )}
                        >
                          {n.title}
                        </span>
                        <span className="text-[10px] text-muted-foreground/70 shrink-0">
                          {formatTime(n.createdAt)}
                        </span>
                      </div>

                      <p
                        className={cn(
                          "text-xs line-clamp-2 leading-relaxed pr-2",
                          isUnread
                            ? "text-muted-foreground"
                            : "text-muted-foreground/60",
                        )}
                      >
                        {renderNotificationBody(n.body, n.data?.groupName)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

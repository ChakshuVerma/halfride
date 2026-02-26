import { useEffect, useMemo, useRef } from "react";
import { MessageCircle, ChevronUp } from "lucide-react";
import type { GroupMessage } from "@/hooks/useGroupChat";
import { MessageBubble } from "./MessageBubble";

type MessageListProps = {
  messages: GroupMessage[];
  currentUserId: string | null;
  onLoadMore?: () => void;
  hasMore?: boolean;
};

type DatedGroup = {
  dateLabel: string;
  messages: GroupMessage[];
};

function formatDateLabel(isoString: string | null): string {
  if (!isoString) return "";
  const date = new Date(isoString);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (isSameDay(date, today)) return "Today";
  if (isSameDay(date, yesterday)) return "Yesterday";

  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
  });
}

export function MessageList({
  messages,
  currentUserId,
  onLoadMore,
  hasMore,
}: MessageListProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const groupedByDay: DatedGroup[] = useMemo(() => {
    if (!messages.length) return [];
    const groups: DatedGroup[] = [];

    for (const msg of messages) {
      const label = formatDateLabel(msg.createdAt);
      const lastGroup = groups[groups.length - 1];
      if (lastGroup && lastGroup.dateLabel === label) {
        lastGroup.messages.push(msg);
      } else {
        groups.push({ dateLabel: label, messages: [msg] });
      }
    }

    return groups;
  }, [messages]);

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto no-scrollbar px-3 py-3 space-y-4 bg-muted/40 bg-[radial-gradient(circle_at_top,_rgba(0,0,0,0.03),_transparent)]"
    >
      {hasMore && onLoadMore && (
        <div className="flex justify-center mb-1">
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-full border border-muted-foreground/20 bg-background/80 px-3 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted/60 transition-colors"
            onClick={onLoadMore}
          >
            <ChevronUp className="h-3 w-3" />
            Load earlier messages
          </button>
        </div>
      )}

      {messages.length === 0 && (
        <div className="h-full flex flex-col items-center justify-center gap-3 text-xs text-muted-foreground">
          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shadow-sm">
            <MessageCircle className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="text-center px-4">
            <div className="font-semibold text-sm">No messages yet</div>
            <div className="text-[11px]">
              Start the conversation with your group.
            </div>
          </div>
        </div>
      )}

      {groupedByDay.map((group) => (
        <div key={group.dateLabel || `group-${group.messages[0]?.id}`}>
          {group.dateLabel && (
            <div className="flex items-center justify-center my-1">
              <div className="flex items-center gap-2 px-3 py-0.5 rounded-full bg-background/80 border border-border/40 text-[10px] font-medium text-muted-foreground">
                <span>{group.dateLabel}</span>
              </div>
            </div>
          )}
          <div className="space-y-2 mt-2">
            {group.messages.map((m, idx) => {
              const isOwn = m.senderId === currentUserId;
              const prev = idx > 0 ? group.messages[idx - 1] : null;
              const isSameSenderAsPrev = prev && prev.senderId === m.senderId;
              const showMeta = !isSameSenderAsPrev;

              return (
                <div key={m.id} className="flex">
                  <div
                    className={`w-full flex ${
                      isOwn ? "justify-end" : "justify-start"
                    }`}
                  >
                    <MessageBubble
                      message={m}
                      isOwn={isOwn}
                      showMeta={!!showMeta}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}


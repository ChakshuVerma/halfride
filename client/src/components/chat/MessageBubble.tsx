import type { GroupMessage } from "@/hooks/useGroupChat";

type MessageBubbleProps = {
  message: GroupMessage;
  isOwn: boolean;
  showMeta: boolean;
};

export function MessageBubble({ message, isOwn, showMeta }: MessageBubbleProps) {
  const alignment = isOwn ? "items-end" : "items-start";
  const bubbleClasses = isOwn
    ? "bg-primary text-primary-foreground rounded-3xl rounded-br-md shadow-md"
    : "bg-muted text-foreground rounded-3xl rounded-bl-md shadow-sm";

  const createdAt =
    message.createdAt != null
      ? new Date(message.createdAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "";

  return (
    <div className={`flex w-full max-w-full flex-col gap-1 ${alignment}`}>
      {showMeta && !isOwn && (
        <span className="text-[10px] font-medium text-muted-foreground">
          {message.senderDisplayName ?? "Someone"}
        </span>
      )}
      <div className="flex w-fit max-w-[60%] items-end gap-2">
        {showMeta && !isOwn && message.senderPhotoURL && (
          <img
            src={message.senderPhotoURL}
            alt={message.senderDisplayName ?? "User"}
            className="h-7 w-7 shrink-0 rounded-full object-cover shadow-sm"
          />
        )}
        <div
          className={`px-3 py-2 sm:px-4 sm:py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words ${bubbleClasses}`}
        >
          {message.text}
        </div>
      </div>
      {createdAt && (
        <span
          className={`text-[10px] text-muted-foreground/80 mt-0.5 ${
            isOwn ? "text-right" : "text-left"
          }`}
        >
          {createdAt}
        </span>
      )}
    </div>
  );
}


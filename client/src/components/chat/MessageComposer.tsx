import { useState, type FormEvent, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";

type MessageComposerProps = {
  onSend: (text: string) => Promise<void> | void;
  disabled?: boolean;
  maxLength?: number;
  disabledHint?: string;
};

const DEFAULT_MAX_LENGTH = 4000;

export function MessageComposer({
  onSend,
  disabled = false,
  maxLength = DEFAULT_MAX_LENGTH,
  disabledHint,
}: MessageComposerProps) {
  const [value, setValue] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || disabled || sending) return;

    try {
      setSending(true);
      await onSend(trimmed);
      setValue("");
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit();
    }
  };

  const isDisabled = disabled || sending;

  return (
    <div className="border-t border-border/70 bg-background/95 px-3 py-2 space-y-1">
      {isDisabled && disabledHint && (
        <div className="text-[11px] text-muted-foreground px-1">
          {disabledHint}
        </div>
      )}
      <form
        onSubmit={handleSubmit}
        className="flex items-end gap-2"
      >
        <div className="flex-1 rounded-full bg-muted/60 px-3 py-1.5 border border-border/60 shadow-inner">
          <textarea
            value={value}
            onChange={(e) => {
              if (e.target.value.length <= maxLength) {
                setValue(e.target.value);
              }
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            disabled={isDisabled}
            rows={1}
            className="w-full resize-none border-none bg-transparent text-sm leading-relaxed outline-none max-h-24 overflow-y-auto"
          />
        </div>
        <Button
          type="submit"
          size="icon"
          className="rounded-full h-9 w-9"
          disabled={isDisabled || !value.trim()}
        >
          {sending ? (
            <span className="sr-only">Sending…</span>
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>
    </div>
  );
}


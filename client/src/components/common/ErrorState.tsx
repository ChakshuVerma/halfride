import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ErrorStateProps = {
  /** Icon or element shown above the title (e.g. AlertCircle in a circle) */
  icon?: ReactNode;
  /** Optional heading (e.g. "Profile not found") */
  title?: string;
  description: string;
  /** Primary action label and handler (e.g. "Try again", "Back to dashboard") */
  primaryAction?: { label: string; onClick: () => void };
  /** Optional secondary action (e.g. "Close") */
  secondaryAction?: { label: string; onClick: () => void };
  className?: string;
};

export function ErrorState({
  icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 px-6 text-center",
        className,
      )}
    >
      {icon && (
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-4">
          {icon}
        </span>
      )}
      {title && (
        <h2 className="text-xl font-semibold text-foreground">{title}</h2>
      )}
      <p className={cn("text-muted-foreground max-w-sm mx-auto", title && "mt-2")}>
        {description}
      </p>
      {(primaryAction || secondaryAction) && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {primaryAction && (
            <Button
              variant="outline"
              size="sm"
              onClick={primaryAction.onClick}
            >
              {primaryAction.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              variant="secondary"
              size="sm"
              onClick={secondaryAction.onClick}
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

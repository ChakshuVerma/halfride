import { useState } from "react";
import { Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

export type ConfirmDialogVariant = "default" | "destructive" | "secondary";

export type ConfirmDialogProps = {
  /** Controlled open state */
  open: boolean;
  /** Called when open state should change (e.g. close on cancel or after confirm) */
  onOpenChange: (open: boolean) => void;
  /** Dialog title */
  title: string;
  /** Dialog description / body text */
  description: string;
  /** Label for the confirm button */
  confirmLabel: string;
  /** Label for the cancel button. Default: "Cancel" */
  cancelLabel?: string;
  /** Style of the confirm button: default (primary), destructive (red), secondary (zinc) */
  variant?: ConfirmDialogVariant;
  /** Called when user confirms. May be async; button shows loading until it resolves. */
  onConfirm: () => void | Promise<void>;
  /** Optional: override loading state (e.g. when parent tracks loading). When set, confirm button shows spinner. */
  isLoading?: boolean;
};

const variantClasses: Record<ConfirmDialogVariant, string> = {
  default: "",
  destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
  secondary: "bg-zinc-600 hover:bg-zinc-700 text-white",
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  variant = "default",
  onConfirm,
  isLoading: controlledLoading,
}: ConfirmDialogProps) {
  const [internalLoading, setInternalLoading] = useState(false);
  const isLoading = controlledLoading ?? internalLoading;

  const handleConfirm = async () => {
    if (isLoading) return;
    const result = onConfirm();
    if (result instanceof Promise) {
      setInternalLoading(true);
      try {
        await result;
        onOpenChange(false);
      } finally {
        setInternalLoading(false);
      }
    } else {
      onOpenChange(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            className={cn(variant !== "default" && variantClasses[variant])}
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              confirmLabel
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

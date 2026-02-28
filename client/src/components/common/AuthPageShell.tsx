import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type AuthPageShellProps = {
  children: ReactNode;
  className?: string;
};

export function AuthPageShell({ children, className }: AuthPageShellProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center min-h-[80vh] w-full p-4",
        className,
      )}
    >
      {children}
    </div>
  );
}


import { cn } from "@/lib/utils";
import { Spinner, type SpinnerProps } from "@/components/ui/spinner";

export type LoadingStateProps = {
  message?: string;
  fullPage?: boolean;
  size?: SpinnerProps["size"];
  className?: string;
};

export const LoadingState = ({
  message = "Loading...",
  fullPage = false,
  size = "md",
  className,
}: LoadingStateProps) => {
  const containerClasses = fullPage
    ? "flex flex-col items-center justify-center min-h-screen bg-background"
    : "flex flex-col items-center justify-center py-10 px-4";

  return (
    <div className={cn(containerClasses, className)}>
      <div className="flex flex-col items-center gap-4">
        <Spinner size={size} />
        {message && (
          <p className="text-sm text-muted-foreground animate-pulse">
            {message}
          </p>
        )}
      </div>
    </div>
  );
};

type SectionLoaderProps = Omit<LoadingStateProps, "fullPage">;

export const SectionLoader = ({
  message = "Loading...",
  size = "md",
  className,
}: SectionLoaderProps) => (
  <LoadingState
    message={message}
    size={size}
    fullPage={false}
    className={className}
  />
);


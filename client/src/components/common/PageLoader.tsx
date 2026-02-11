import { Spinner } from "@/components/ui/spinner";

export const PageLoader = ({ message = "Loading..." }) => (
  <div className="flex flex-col items-center justify-center min-h-screen bg-background">
    <div className="flex flex-col items-center gap-4">
      <Spinner size="xl" className="text-primary" />
      <p className="text-sm text-muted-foreground animate-pulse">{message}</p>
    </div>
  </div>
);

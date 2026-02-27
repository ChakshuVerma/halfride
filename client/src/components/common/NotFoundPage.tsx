import { useLocation, useNavigate } from "react-router-dom";
import { FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";

const DEFAULT_TITLE = "Not found";
const DEFAULT_MESSAGE =
  "The page you're looking for doesn't exist or has been moved.";

type LocationState = { message?: string; title?: string } | null;

export function NotFoundPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LocationState;
  const message = state?.message ?? DEFAULT_MESSAGE;
  const title = state?.title ?? DEFAULT_TITLE;

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-16">
      <div className="flex max-w-md flex-col items-center text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground mb-6">
          <FileQuestion className="h-7 w-7" />
        </span>
        <h1 className="text-xl font-semibold text-foreground">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(-1)}
          >
            Go back
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => navigate(ROUTES.DASHBOARD, { replace: true })}
          >
            Go to dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}

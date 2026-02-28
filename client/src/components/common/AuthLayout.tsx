import { Outlet, Navigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { ROUTES } from "@/constants/routes";

export const AuthLayout = () => {
  const { user } = useAuth();

  // If user is already logged in, push them to dashboard
  if (user) {
    return <Navigate to={ROUTES.DASHBOARD} replace />;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen relative overflow-hidden sm:p-2 bg-background selection:bg-primary/20">
      {/* Decorative Background */}
      <div className="fixed inset-0 -z-10 h-full w-full bg-background bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,color-mix(in_oklch,var(--primary)_8%,transparent),transparent)]" />
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] rounded-full bg-muted/30 dark:bg-muted/20 blur-[120px] mix-blend-multiply dark:mix-blend-overlay animate-blob" />
        <div
          className="absolute top-[20%] -right-[10%] w-[60vw] h-[60vw] rounded-full bg-primary/10 dark:bg-primary/5 blur-[100px] mix-blend-multiply dark:mix-blend-overlay animate-blob"
          style={{ animationDelay: "2s" }}
        />
        <div
          className="absolute -bottom-[20%] left-[20%] w-[50vw] h-[50vw] rounded-full bg-muted/30 dark:bg-muted/20 blur-[120px] mix-blend-multiply dark:mix-blend-overlay animate-blob"
          style={{ animationDelay: "4s" }}
        />
      </div>

      <Outlet />
    </div>
  );
};

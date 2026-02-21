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
      <div className="fixed inset-0 -z-10 h-full w-full bg-background bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.1),rgba(255,255,255,0))]" />
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] rounded-full bg-zinc-300/30 dark:bg-zinc-800/20 blur-[120px] mix-blend-multiply dark:mix-blend-overlay animate-blob" />
        <div
          className="absolute top-[20%] -right-[10%] w-[60vw] h-[60vw] rounded-full bg-slate-300/30 dark:bg-slate-800/20 blur-[100px] mix-blend-multiply dark:mix-blend-overlay animate-blob"
          style={{ animationDelay: "2s" }}
        />
        <div
          className="absolute -bottom-[20%] left-[20%] w-[50vw] h-[50vw] rounded-full bg-stone-300/30 dark:bg-stone-800/20 blur-[120px] mix-blend-multiply dark:mix-blend-overlay animate-blob"
          style={{ animationDelay: "4s" }}
        />
      </div>

      <Outlet />
    </div>
  );
};

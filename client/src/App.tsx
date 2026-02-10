import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { Login } from "./components/login/login";
import { Signup } from "./components/login/signup";
import { ForgotPassword } from "./components/login/forgot-password";
import Dashboard from "./components/home/dashboard";
import AirportTravellers from "./components/traveller/airport-travellers";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { Spinner } from "@/components/ui/spinner";
import { LandingPage } from "./components/landing/landing-page";
import { Header } from "./components/common/Header";

const LoadingText = "Loading...";

// 1. Create a Layout for Auth pages (Login, Signup)
// This keeps the nice blobs and centering ONLY for these pages
const AuthLayout = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen relative overflow-hidden sm:p-2 bg-background selection:bg-primary/20">
      {/* Decorative ambient background for Auth pages */}
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
      {/* This renders the child route (Login/Signup) */}
      <Outlet />
    </div>
  );
};

// 2. Protected Layout for Authenticated Pages
const ProtectedLayout = () => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to={"/login"} replace />;
  }

  return (
    <div className="min-h-screen bg-background font-sans antialiased flex flex-col">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
};

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="xl" className="text-primary" />
          <p className="text-sm text-muted-foreground animate-pulse">
            {LoadingText}
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-background font-sans antialiased">
      <Routes>
        {/* PUBLIC ROUTES */}
        <Route path="/" element={<LandingPage />} />

        {/* AUTH ROUTES - Wrapped in AuthLayout for styling */}
        <Route element={<AuthLayout />}>
          <Route
            path="/login"
            element={user ? <Navigate to="/dashboard" replace /> : <Login />}
          />
          <Route
            path="/signup"
            element={user ? <Navigate to="/dashboard" replace /> : <Signup />}
          />
          <Route
            path="/forgot-password"
            element={
              user ? <Navigate to="/dashboard" replace /> : <ForgotPassword />
            }
          />
        </Route>

        {/* PROTECTED ROUTES - Wrapped in ProtectedLayout */}
        <Route element={<ProtectedLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/airport" element={<AirportTravellers />} />
        </Route>

        {/* FALLBACK */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster position="top-center" richColors />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;

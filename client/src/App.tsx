import { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { PageLoader } from "@/components/common/PageLoader";

// Layouts
import { AuthLayout } from "@/components/common/AuthLayout";
import { ProtectedLayout } from "@/components/common/ProtectedLayout";

// Components (Lazy Loaded for performance)
const LandingPage = lazy(() =>
  import("./components/landing/landing-page").then((module) => ({
    default: module.LandingPage,
  })),
);

const Login = lazy(() =>
  import("./components/login/login").then((module) => ({
    default: module.Login,
  })),
);
const Signup = lazy(() =>
  import("./components/login/signup").then((module) => ({
    default: module.Signup,
  })),
);
const ForgotPassword = lazy(() =>
  import("./components/login/forgot-password").then((module) => ({
    default: module.ForgotPassword,
  })),
);
const Dashboard = lazy(() => import("./components/home/dashboard"));
const AirportTravellers = lazy(
  () => import("./components/traveller/airport-travellers"),
);

function AppRoutes() {
  const { loading } = useAuth();

  if (loading) return <PageLoader />;

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* PUBLIC ROUTES */}
        <Route path="/" element={<LandingPage />} />

        {/* AUTH ROUTES (Includes redirects if logged in) */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
        </Route>

        {/* PROTECTED ROUTES (Includes redirects if logged out) */}
        <Route element={<ProtectedLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/airport" element={<AirportTravellers />} />
        </Route>

        {/* FALLBACK */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-background font-sans antialiased">
        <AppRoutes />
        <Toaster position="top-center" richColors />
      </div>
    </AuthProvider>
  );
}

export default App;

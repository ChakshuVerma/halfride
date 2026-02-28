import { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { PageLoader } from "@/components/common/PageLoader";
import { AuthLayout } from "@/components/common/AuthLayout";
import { ProtectedLayout } from "@/components/common/ProtectedLayout";
import { ROUTES } from "@/constants/routes";

// Components (Lazy Loaded for performance)
const LandingPage = lazy(() =>
  import("@/components/landing/landing-page").then((module) => ({
    default: module.LandingPage,
  })),
);

const Login = lazy(() =>
  import("@/components/login/login").then((module) => ({
    default: module.Login,
  })),
);
const Signup = lazy(() =>
  import("@/components/login/signup").then((module) => ({
    default: module.Signup,
  })),
);
const ForgotPassword = lazy(() =>
  import("@/components/login/forgot-password").then((module) => ({
    default: module.ForgotPassword,
  })),
);
const Dashboard = lazy(() => import("@/components/home/dashboard"));
const AirportTravellers = lazy(
  () => import("@/components/traveller/airport-travellers"),
);
const ProfilePage = lazy(() => import("@/components/profile/ProfilePage"));
const GroupChatPage = lazy(() =>
  import("@/components/chat/GroupChatPage").then((module) => ({
    default: module.GroupChatPage,
  })),
);
const NotFoundPage = lazy(() =>
  import("@/components/common/NotFoundPage").then((module) => ({
    default: module.NotFoundPage,
  })),
);

function AppRoutes() {
  const { loading } = useAuth();

  if (loading) return <PageLoader />;

  const authRoutes = [
    { path: ROUTES.LOGIN, element: <Login /> },
    { path: ROUTES.SIGNUP, element: <Signup /> },
    { path: ROUTES.FORGOT_PASSWORD, element: <ForgotPassword /> },
  ] as const;

  const protectedRoutes = [
    { path: ROUTES.DASHBOARD, element: <Dashboard /> },
    { path: ROUTES.AIRPORT, element: <AirportTravellers /> },
    { path: ROUTES.AIRPORT_BY_CODE, element: <AirportTravellers /> },
    { path: ROUTES.PROFILE, element: <ProfilePage /> },
    { path: ROUTES.GROUP_CHAT, element: <GroupChatPage /> },
    { path: ROUTES.NOT_FOUND, element: <NotFoundPage /> },
  ] as const;

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* PUBLIC ROUTES */}
        <Route path={ROUTES.HOME} element={<LandingPage />} />

        {/* AUTH ROUTES (Includes redirects if logged in) */}
        <Route element={<AuthLayout />}>
          {authRoutes.map(({ path, element }) => (
            <Route key={path} path={path} element={element} />
          ))}
        </Route>

        {/* PROTECTED ROUTES (Includes redirects if logged out) */}
        <Route element={<ProtectedLayout />}>
          {protectedRoutes.map(({ path, element }) => (
            <Route key={path} path={path} element={element} />
          ))}
        </Route>

        {/* FALLBACK */}
        <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} />
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

import { Outlet, Navigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { ROUTES } from "@/constants/routes";
import { Header } from "@/components/common/Header";
import { EntityModalProvider } from "@/contexts/EntityModalContext";

export const ProtectedLayout = () => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  return (
    <EntityModalProvider>
      <div className="min-h-screen bg-background font-sans antialiased flex flex-col">
        <Header />
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </EntityModalProvider>
  );
};

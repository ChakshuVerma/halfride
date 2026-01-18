import { Routes, Route, Navigate } from "react-router-dom"
import { Login } from "./components/login/login"
import Dashboard from "./components/home/dashboard"
import { Toaster } from "@/components/ui/sonner"
import { AuthProvider, useAuth } from "./contexts/AuthContext"
import { Spinner } from "@/components/ui/spinner"
import { Register } from "./components/login/register"

const LoadingText = "Loading..."

function AppContent() {
  const { user, loading, userProfile, profileChecked } = useAuth()

  // We want to know both: "is user logged in?" and "does this user have a profile doc?"
  // So we block routing until profileChecked is true (when user exists).
  if (loading || (user && !profileChecked)) {
    return (
      <div className="p-2 flex flex-col items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="xl" className="text-primary" />
          <p className="text-sm text-muted-foreground animate-pulse">{LoadingText}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-2 flex flex-col items-center justify-center min-h-screen bg-background">
      <Routes>
        <Route
          path="/"
          element={
            user
              ? userProfile
                ? <Navigate to="/dashboard" replace />
                : <Navigate to="/register" replace />
              : <Navigate to="/login" replace />
          }
        />
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
        <Route
          path="/register"
          element={
            user
              ? userProfile
                ? <Navigate to="/dashboard" replace />
                : <Register phoneNumber={user.phoneNumber ?? ""} />
              : <Navigate to="/login" replace />
          }
        />
        <Route
          path="/dashboard"
          element={
            user
              ? userProfile
                ? <Dashboard />
                : <Navigate to="/register" replace />
              : <Navigate to="/login" replace />
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster position="top-center" richColors />
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App

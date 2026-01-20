import { Routes, Route, Navigate } from "react-router-dom"
import { Login } from "./components/login/login"
import { Signup } from "./components/login/signup"
import { ForgotPassword } from "./components/login/forgot-password"
import Dashboard from "./components/home/dashboard"
import TerminalTravellers from "./components/home/terminal-travellers"
import { Toaster } from "@/components/ui/sonner"
import { AuthProvider, useAuth } from "./contexts/AuthContext"
import { Spinner } from "@/components/ui/spinner"

const LoadingText = "Loading..."

function AppContent() {
  const { user, loading } = useAuth()

  if (loading) {
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
        <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />} />
        <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
        <Route path="/signup" element={user ? <Navigate to="/dashboard" replace /> : <Signup />} />
        <Route path="/forgot-password" element={user ? <Navigate to="/dashboard" replace /> : <ForgotPassword />} />
        <Route path="/dashboard" element={user ? <Dashboard /> : <Navigate to="/login" replace />} />
        <Route path="/terminal" element={user ? <TerminalTravellers /> : <Navigate to="/login" replace />} />
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

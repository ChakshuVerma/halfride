import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Loader2, LogIn, Eye, EyeOff } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { Button } from "../ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { InfoMessages } from "./helper"
import { useAuthApi } from "../../hooks/useAuthApi"

const errorDuration = 2000

// Error messages
const LoginFailedError = "Login failed"

// Input messages
const UsernameLabel = "Username"
const PasswordLabel = "Password"

export function Login() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string>("")
  const [isPending, startTransition] = useTransition()
  const navigate = useNavigate()
  const { login } = useAuthApi()

  const showError = (message: string) => {
    setError(message)
    setTimeout(() => setError(""), errorDuration)
  }

  const doLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isPending) return

    startTransition(async () => {
      try {
        setError("")
        await login({ username, password })
        toast.success("Logged in")
        // AuthContext loads session on app load; simplest is to reload and route.
        navigate("/dashboard")
        window.location.reload()
      } catch {
        showError(LoginFailedError)
      }
    })
  }

  return (
    <div className="flex items-center justify-center min-h-[50vh] p-4 w-full">
      <Card className="w-full max-w-[420px] border-border/60 shadow-xl shadow-primary/5 rounded-3xl bg-card overflow-hidden ring-1 ring-border/60 animate-in fade-in slide-in-from-bottom-6 duration-700">
        <CardHeader className="space-y-3 text-center pt-8 pb-6 bg-linear-to-b from-primary/5 to-transparent">
          <div className="mx-auto bg-linear-to-tr from-primary/20 to-primary/10 w-16 h-16 rounded-2xl rotate-3 flex items-center justify-center mb-2 text-primary ring-4 ring-background shadow-lg">
            <LogIn className="w-8 h-8" />
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight text-foreground">
            {InfoMessages.welcomeMessage}
          </CardTitle>
          <CardDescription className="text-base text-muted-foreground/80 font-medium">
            Sign in to continue to your dashboard
          </CardDescription>
        </CardHeader>

        <CardContent className="px-6 sm:px-8 pb-8">
          <form onSubmit={doLogin} className="space-y-6">
            <div className="space-y-2">
              <Label
                htmlFor="username"
                className="text-xs font-semibold text-muted-foreground uppercase tracking-wide ml-1"
              >
                {UsernameLabel}
              </Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="your_username"
                className="h-12 bg-background rounded-xl border-border/60 focus:ring-4 focus:ring-primary/10 transition-all"
                required
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="password"
                className="text-xs font-semibold text-muted-foreground uppercase tracking-wide ml-1"
              >
                {PasswordLabel}
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 bg-background rounded-xl border-border/60 focus:ring-4 focus:ring-primary/10 transition-all pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
            {error && (
              <div className="px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium text-center animate-in fade-in duration-200">
                {error}
              </div>
            )}
            <Button
              type="submit"
              className="w-full h-12 text-base font-bold shadow-lg shadow-primary/25 bg-linear-to-r from-primary to-primary/90 rounded-xl active:scale-[0.98] transition-transform"
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logging you in...
                </>
              ) : (
                "Continue"
              )}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="justify-center flex-col gap-1 pb-8 bg-muted/20 border-t border-border/40">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs sm:text-sm text-muted-foreground hover:text-primary"
            onClick={() => navigate("/forgot-password")}
          >
            Forgot your password?
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs sm:text-sm text-muted-foreground hover:text-primary"
            onClick={() => navigate("/signup")}
          >
            New here? Create an account
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
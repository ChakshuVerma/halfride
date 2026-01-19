import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Loader2, LogIn } from "lucide-react"
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

const errorDuration = 2000

// Error messages
const LoginFailedError = "Login failed"

// Input messages
const UsernameLabel = "Username"
const PasswordLabel = "Password"

export function Login() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string>("")
  const [isPending, startTransition] = useTransition()
  const navigate = useNavigate()

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
        const resp = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ username, password }),
        })
        if (!resp.ok) throw new Error()
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
    <div className="flex items-center justify-center min-h-[50vh] p-4">
      <Card className="w-full max-w-md border-border shadow-none rounded-3xl bg-card overflow-hidden ring-1 ring-border">

        
        <CardHeader className="space-y-3 text-center pt-8 pb-6">
          <div className="mx-auto bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-2 text-primary">
            <LogIn className="w-6 h-6" />
          </div>
          <CardTitle className="text-3xl font-extrabold tracking-tight text-foreground">
            {InfoMessages.welcomeMessage}
          </CardTitle>
          <CardDescription className="text-base text-muted-foreground/80">
            Sign in with username and password
          </CardDescription>
        </CardHeader>

        <CardContent className="px-4 sm:px-8 pb-8 overflow-hidden">
          <form onSubmit={doLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="username">{UsernameLabel}</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="your_username"
                className="h-12 rounded-xl"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{PasswordLabel}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 rounded-xl"
                required
              />
            </div>
            {error && (
              <div className="px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium text-center animate-in fade-in duration-200">
                {error}
              </div>
            )}
            <Button 
              type="submit" 
              className="w-full h-12 text-base font-bold text-primary-foreground shadow-none bg-primary rounded-xl"
              disabled={isPending}
            >
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Login"}
            </Button>
          </form>
        </CardContent>
        
        <CardFooter className="justify-center flex-col gap-2 pb-8 bg-muted/20 border-t border-border/40">
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary" onClick={() => navigate("/signup")}>
            New user? Create an account
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-primary"
            onClick={() => navigate("/forgot-password")}
          >
            Forgot password?
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
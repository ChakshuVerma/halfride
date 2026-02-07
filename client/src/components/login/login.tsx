import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import {
  Loader2,
  LogIn,
  Eye,
  EyeOff,
  ArrowRight,
  Lock,
  User,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { InfoMessages } from "./helper";
import { useAuthApi } from "../../hooks/useAuthApi";
import { cn } from "@/lib/utils";

// Constants
const CONSTANTS = {
  ERROR_DURATION: 2000,
  ERRORS: {
    LOGIN_FAILED: "Incorrect username or password",
  },
  LABELS: {
    USERNAME: "Username",
    PASSWORD: "Password",
    SIGN_IN_DESC: "Welcome back! Please enter your details.",
    CONTINUE: "Log In",
    LOGGING_IN: "Authenticating...",
    FORGOT_PASSWORD: "Forgot password?",
    CREATE_ACCOUNT: "Don't have an account?",
    SIGN_UP: "Sign up",
  },
  PLACEHOLDERS: {
    USERNAME: "Enter your username",
    PASSWORD: "••••••••",
  },
  TOASTS: {
    LOGIN_SUCCESS: "Welcome back!",
  },
  TYPES: {
    TEXT: "text",
    PASSWORD: "password",
  },
};

export function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuthApi();
  const usernameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    usernameRef.current?.focus();
  }, []);

  const showError = (message: string) => {
    setError(message);
    setTimeout(() => setError(""), CONSTANTS.ERROR_DURATION);
  };

  const doLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    setIsLoading(true);
    setError("");
    try {
      await login({ username, password });
      toast.success(CONSTANTS.TOASTS.LOGIN_SUCCESS);
      navigate("/dashboard");
      window.location.reload();
    } catch {
      showError(CONSTANTS.ERRORS.LOGIN_FAILED);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[80vh] p-4 w-full">
      <Card className="w-full max-w-[400px] border-white/20 shadow-2xl shadow-zinc-900/10 rounded-[2rem] bg-white/80 backdrop-blur-xl overflow-hidden ring-1 ring-white/50 animate-in fade-in zoom-in-95 duration-500">
        <CardHeader className="space-y-4 text-center pt-10 pb-6">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-zinc-900 flex items-center justify-center mb-2 shadow-lg shadow-zinc-900/20 ring-4 ring-white">
            <LogIn className="w-8 h-8 text-white" strokeWidth={1.5} />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-2xl font-black tracking-tight text-zinc-900">
              {InfoMessages.welcomeMessage}
            </CardTitle>
            <CardDescription className="text-base font-medium text-zinc-500">
              {CONSTANTS.LABELS.SIGN_IN_DESC}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="px-8 pb-8">
          <form onSubmit={doLogin} className="space-y-5">
            <div className="space-y-1.5">
              <Label
                htmlFor="username"
                className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1"
              >
                {CONSTANTS.LABELS.USERNAME}
              </Label>
              <div className="relative group">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 group-focus-within:text-zinc-900 transition-colors" />
                <Input
                  id="username"
                  ref={usernameRef}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={CONSTANTS.PLACEHOLDERS.USERNAME}
                  className="h-12 bg-zinc-50/50 hover:bg-zinc-50 focus:bg-white rounded-xl border-zinc-200 focus:border-zinc-400 focus:ring-0 pl-10 transition-all font-medium"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between ml-1">
                <Label
                  htmlFor="password"
                  className="text-xs font-bold text-zinc-500 uppercase tracking-wider"
                >
                  {CONSTANTS.LABELS.PASSWORD}
                </Label>
                <button
                  type="button"
                  onClick={() => navigate("/forgot-password")}
                  className="text-xs font-semibold text-zinc-500 hover:text-zinc-900 transition-colors"
                  tabIndex={-1}
                >
                  {CONSTANTS.LABELS.FORGOT_PASSWORD}
                </button>
              </div>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 group-focus-within:text-zinc-900 transition-colors" />
                <Input
                  id="password"
                  type={
                    showPassword
                      ? CONSTANTS.TYPES.TEXT
                      : CONSTANTS.TYPES.PASSWORD
                  }
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 bg-zinc-50/50 hover:bg-zinc-50 focus:bg-white rounded-xl border-zinc-200 focus:border-zinc-400 focus:ring-0 pl-10 pr-10 transition-all font-medium"
                  placeholder={CONSTANTS.PLACEHOLDERS.PASSWORD}
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors p-1"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                {error}
              </div>
            )}

            <Button
              type="submit"
              className={cn(
                "w-full h-12 rounded-xl bg-zinc-900 hover:bg-black text-white font-bold text-sm uppercase tracking-widest shadow-lg shadow-zinc-900/20 transition-all hover:scale-[1.02] active:scale-[0.98]",
                isLoading && "opacity-80 scale-100",
              )}
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {CONSTANTS.LABELS.LOGGING_IN}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  {CONSTANTS.LABELS.CONTINUE} <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="justify-center py-6 bg-zinc-50/50 border-t border-zinc-100">
          <p className="text-sm font-medium text-zinc-500">
            {CONSTANTS.LABELS.CREATE_ACCOUNT}{" "}
            <button
              onClick={() => navigate("/signup")}
              className="text-zinc-900 font-bold hover:underline"
            >
              {CONSTANTS.LABELS.SIGN_UP}
            </button>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

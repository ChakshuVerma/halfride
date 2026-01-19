import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from "firebase/auth"
import { getCountryCallingCode, type Country } from "react-phone-number-input"
import { KeyRound, Eye, EyeOff } from "lucide-react"
import { auth } from "../../firebase/setup"
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
import { InputOTP, InputOTPGroup, InputOTPSlot } from "../ui/input-otp"
import { CountrySelect } from "./country-select"
import { calculatePasswordStrength, validatePassword } from "./utils"
import { cn } from "@/lib/utils"
import { useAuthApi } from "../../hooks/useAuthApi"

const OTPLength = 6

export function ForgotPassword() {
  const navigate = useNavigate()
  const [isSendingOtp, setIsSendingOtp] = useState(false)
  const [isResettingPassword, setIsResettingPassword] = useState(false)

  const [username, setUsername] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState<"weak" | "medium" | "strong" | null>(null)
  const [credentialsValidated, setCredentialsValidated] = useState(false)

  const [country, setCountry] = useState<Country>("IN")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null)
  const [otp, setOtp] = useState("")
  const [resetKey, setResetKey] = useState(0)
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null)
  const { completeForgotPassword } = useAuthApi()

  useEffect(() => {
    const init = async () => {
      if (recaptchaRef.current) return
      const el = document.getElementById(`recaptcha-container-${resetKey}`)
      if (!el) return
      const verifier = new RecaptchaVerifier(auth, `recaptcha-container-${resetKey}`, { size: "invisible" })
      await verifier.render()
      recaptchaRef.current = verifier
    }
    init()
    return () => {
      if (recaptchaRef.current) {
        recaptchaRef.current.clear()
        recaptchaRef.current = null
      }
    }
  }, [resetKey])

  const validateCredentials = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!username.trim()) {
      toast.error("Username is required")
      return
    }

    const pwdError = validatePassword(newPassword)
    if (pwdError) {
      toast.error(pwdError)
      return
    }

    setCredentialsValidated(true)
  }

  const sendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!recaptchaRef.current) return toast.error("reCAPTCHA not ready")
    if (isSendingOtp) return

    setIsSendingOtp(true)
    try {
      const verifier = recaptchaRef.current
      if (!verifier) {
        toast.error("reCAPTCHA not ready")
        return
      }
      const callingCode = getCountryCallingCode(country)
      const phoneWithCode = "+" + callingCode + phoneNumber
      const result = await signInWithPhoneNumber(auth, phoneWithCode, verifier)
      setConfirmation(result)
      verifier.clear()
      recaptchaRef.current = null
      setResetKey((x) => x + 1)
      toast.success("OTP sent")
    } catch (e) {
      console.error(e)
      toast.error("Failed to send OTP")
    } finally {
      setIsSendingOtp(false)
    }
  }

  const resetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!confirmation || isResettingPassword) return
    if (!username || !newPassword) return toast.error("Username and new password are required")

    const pwdError = validatePassword(newPassword)
    if (pwdError) {
      toast.error(pwdError)
      return
    }

    setIsResettingPassword(true)
    try {
      const cred = await confirmation.confirm(otp)
      const firebaseIdToken = await cred.user.getIdToken()

      await completeForgotPassword({
        firebaseIdToken,
        username,
        newPassword,
      })

      toast.success("Password updated. Please login.")
      navigate("/login")
      } catch (e) {
      console.error(e)
      toast.error(e?.message || "Reset failed")
    } finally {
      setIsResettingPassword(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[50vh] p-4 w-full">
      <Card className="w-full max-w-[420px] border-border/60 shadow-xl shadow-primary/5 rounded-3xl bg-card overflow-hidden ring-1 ring-border/60 animate-in fade-in slide-in-from-bottom-6 duration-700">
        <CardHeader className="space-y-3 text-center pt-8 pb-6 bg-linear-to-b from-primary/5 to-transparent">
          <div className="mx-auto bg-linear-to-tr from-primary/20 to-primary/10 w-16 h-16 rounded-2xl rotate-3 flex items-center justify-center mb-2 text-primary ring-4 ring-background shadow-lg">
            <KeyRound className="w-8 h-8" />
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight text-foreground">Reset password</CardTitle>
          <CardDescription className="text-base text-muted-foreground/80 font-medium">
            Verify your phone via OTP, then choose a new password.
          </CardDescription>
        </CardHeader>

        <CardContent className="px-6 sm:px-8 pb-8 overflow-hidden">
          <form onSubmit={confirmation ? resetPassword : credentialsValidated ? sendOtp : validateCredentials} className="space-y-6">
            <div className="space-y-2">
              <Label
                htmlFor="username"
                className="text-xs font-semibold text-muted-foreground uppercase tracking-wide ml-1"
              >
                Username
              </Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="h-12 bg-background rounded-xl border-border/60 focus:ring-4 focus:ring-primary/10 transition-all"
                required
                disabled={credentialsValidated || isSendingOtp || isResettingPassword}
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="newPassword"
                className="text-xs font-semibold text-muted-foreground uppercase tracking-wide ml-1"
              >
                New password
              </Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => {
                    const value = e.target.value
                    setNewPassword(value)
                    setPasswordStrength(calculatePasswordStrength(value))
                  }}
                  className="h-12 bg-background rounded-xl border-border/60 focus:ring-4 focus:ring-primary/10 transition-all pr-10"
                  required
                  disabled={credentialsValidated || isSendingOtp || isResettingPassword}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  disabled={credentialsValidated}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {newPassword && (
                <div className="space-y-1.5">
                  <div className="flex gap-1 h-1.5">
                    <div
                      className={cn(
                        "flex-1 rounded-full transition-colors",
                        passwordStrength === "weak" && "bg-red-500",
                        passwordStrength === "medium" && "bg-yellow-500",
                        passwordStrength === "strong" && "bg-green-500",
                        !passwordStrength && "bg-muted",
                      )}
                    />
                    <div
                      className={cn(
                        "flex-1 rounded-full transition-colors",
                        passwordStrength === "medium" && "bg-yellow-500",
                        passwordStrength === "strong" && "bg-green-500",
                        (!passwordStrength || passwordStrength === "weak") && "bg-muted",
                      )}
                    />
                    <div
                      className={cn(
                        "flex-1 rounded-full transition-colors",
                        passwordStrength === "strong" && "bg-green-500",
                        (!passwordStrength || passwordStrength !== "strong") && "bg-muted",
                      )}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {passwordStrength === "weak" && "Weak password"}
                    {passwordStrength === "medium" && "Medium strength"}
                    {passwordStrength === "strong" && "Strong password"}
                    {!passwordStrength &&
                      "Use 8+ characters with uppercase, lowercase, numbers, and special characters"}
                  </p>
                </div>
              )}
            </div>

            {credentialsValidated && !confirmation && (
              <div className="space-y-2">
                <Label
                  htmlFor="phone"
                  className="text-xs font-semibold text-muted-foreground uppercase tracking-wide ml-1"
                >
                  Phone
                </Label>
                <div className="flex w-full items-center rounded-xl border-2 border-border/50 bg-background/50 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary">
                  <CountrySelect country={country} setCountry={setCountry} />
                  <Input
                    id="phone"
                    placeholder="9876543210"
                    type="tel"
                    className="flex-1 h-12 border-none bg-transparent shadow-none focus-visible:ring-0 rounded-l-none rounded-r-xl"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    required
                    disabled={isSendingOtp || isResettingPassword}
                  />
                </div>
              </div>
            )}

            {confirmation && (
              <div className="space-y-3 flex flex-col items-center">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  OTP
                </Label>
                <InputOTP maxLength={OTPLength} value={otp} onChange={setOtp} disabled={isResettingPassword}>
                  <InputOTPGroup className="gap-2">
                    {[...Array(OTPLength)].map((_, i) => (
                      <InputOTPSlot
                        key={i}
                        index={i}
                        className="w-10 h-12 text-lg border-2 rounded-lg data-[active=true]:border-primary"
                      />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>
            )}

            <div
              key={resetKey}
              id={`recaptcha-container-${resetKey}`}
              className="flex justify-center my-2"
            ></div>

            <Button
              type="submit"
              className="w-full h-12 text-base font-bold shadow-lg shadow-primary/25 bg-linear-to-r from-primary to-primary/90 rounded-xl active:scale-[0.98] transition-transform"
              disabled={isSendingOtp || isResettingPassword}
            >
              {isResettingPassword
                ? "Resetting password..."
                : isSendingOtp
                  ? "Sending OTP..."
                  : confirmation
                    ? "Verify OTP & Update password"
                    : credentialsValidated
                      ? "Send OTP"
                      : "Continue"}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="justify-center flex-col gap-2 pb-8 bg-muted/20 border-t border-border/40">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-primary"
            disabled={isResettingPassword || isSendingOtp}
            onClick={() => navigate("/login")}
          >
            Back to login
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}


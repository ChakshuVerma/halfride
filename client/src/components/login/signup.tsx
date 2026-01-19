import { useEffect, useRef, useState, useTransition } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from "firebase/auth"
import { getCountryCallingCode, type Country } from "react-phone-number-input"
import { auth } from "../../firebase/setup"
import { Button } from "../ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "../ui/input-otp"
import { CountrySelect } from "./country-select"
import { UserPlus, Eye, EyeOff } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  calculatePasswordStrength,
  calculateAge,
  validatePassword,
  validateName,
  validateAge,
} from "./utils"
import { useAuthApi } from "../../hooks/useAuthApi"

const OTPLength = 6

export function Signup() {
  const navigate = useNavigate()
  const [isPending, startTransition] = useTransition()
  const [step, setStep] = useState<1 | 2>(1)
  const { completeSignup: completeSignupRequest } = useAuthApi()

  // account
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState<"weak" | "medium" | "strong" | null>(null)

  // profile
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [dob, setDob] = useState("") // YYYY-MM-DD (derived)
  const [dobDay, setDobDay] = useState("")
  const [dobMonth, setDobMonth] = useState("")
  const [dobYear, setDobYear] = useState("")
  const [isFemale, setIsFemale] = useState<boolean | null>(null)

  // phone + otp
  const [country, setCountry] = useState<Country>("IN")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null)
  const [otp, setOtp] = useState("")
  const [resetKey, setResetKey] = useState(0)
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null)

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

  // Keep single DOB string in sync with split fields
  useEffect(() => {
    if (!dobYear || !dobMonth || !dobDay) {
      setDob("")
      return
    }
    const y = dobYear.padStart(4, "0")
    const m = dobMonth.padStart(2, "0")
    const d = dobDay.padStart(2, "0")
    setDob(`${y}-${m}-${d}`)
  }, [dobYear, dobMonth, dobDay])

  const goToPhoneStep = (e: React.FormEvent) => {
    e.preventDefault()

    // Validate username
    if (!username.trim()) {
      toast.error("Username is required")
      return
    }

    // Validate password
    const passwordError = validatePassword(password)
    if (passwordError) {
      toast.error(passwordError)
      return
    }

    // Validate names
    const firstNameError = validateName(firstName, "First name")
    if (firstNameError) {
      toast.error(firstNameError)
      return
    }

    const lastNameError = validateName(lastName, "Last name")
    if (lastNameError) {
      toast.error(lastNameError)
      return
    }

    // Validate age and date correctness
    const ageError = validateAge(dobDay, dobMonth, dobYear)
    if (ageError) {
      toast.error(ageError)
      return
    }

    // Validate gender
    if (typeof isFemale !== "boolean") {
      toast.error("Please select a gender")
      return
    }

    setStep(2)
  }

  const sendOtp = async () => {
    if (!phoneNumber.trim()) return toast.error("Phone number is required")

    startTransition(async () => {
      try {
        let verifier = recaptchaRef.current

        // Lazy-init reCAPTCHA if it isn't ready yet
        if (!verifier) {
          const containerId = `recaptcha-container-${resetKey}`
          const el = document.getElementById(containerId)
          if (!el) {
            throw new Error("reCAPTCHA not ready")
          }
          verifier = new RecaptchaVerifier(auth, containerId, { size: "invisible" })
          await verifier.render()
          recaptchaRef.current = verifier
        }

        const callingCode = getCountryCallingCode(country)
        const phoneWithCode = "+" + callingCode + phoneNumber.trim()
        const result = await signInWithPhoneNumber(auth, phoneWithCode, verifier)
        setConfirmation(result)

        // reset verifier for next attempt
        verifier.clear()
        recaptchaRef.current = null
        setResetKey((x) => x + 1)
        toast.success("OTP sent")
      } catch (e) {
        console.error(e)
        const message = e instanceof Error ? e.message : "Failed to send OTP"
        toast.error(message)
      }
    })
  }

  const completeSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!confirmation) return
    if (!dob || !firstName || !lastName || typeof isFemale !== "boolean") {
      return toast.error("Fill all required fields")
    }

    startTransition(async () => {
      try {
        const cred = await confirmation.confirm(otp)
        const firebaseIdToken = await cred.user.getIdToken()

        await completeSignupRequest({
          firebaseIdToken,
          username,
          password,
          DOB: dob,
          FirstName: firstName,
          LastName: lastName,
          isFemale,
        })

        toast.success("Account created")
        navigate("/dashboard")
        window.location.reload()
      } catch (e) {
        console.error(e)
        const message = e instanceof Error ? e.message : "Signup failed"
        toast.error(message)
      }
    })
  }

  return (
    <div className="flex items-center justify-center min-h-[50vh] p-4 w-full">
      <Card className="w-full max-w-[420px] border-border/60 shadow-xl shadow-primary/5 rounded-3xl bg-card overflow-hidden ring-1 ring-border/60 animate-in fade-in slide-in-from-bottom-6 duration-700">
        <CardHeader className="space-y-3 text-center pt-8 pb-6 bg-linear-to-b from-primary/5 to-transparent">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/80">
            Step {step} of 2
          </div>
          <div className="mx-auto bg-linear-to-tr from-primary/20 to-primary/10 w-16 h-16 rounded-2xl rotate-3 flex items-center justify-center mb-2 text-primary ring-4 ring-background shadow-lg">
            <UserPlus className="w-8 h-8" />
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight text-foreground">
            {step === 1 ? "Create account" : "Verify your phone"}
          </CardTitle>
          <CardDescription className="text-base text-muted-foreground/80 font-medium">
            {step === 1
              ? "Enter your account details to get started."
              : "Enter your phone and OTP to finish signing up."}
          </CardDescription>
        </CardHeader>

        <CardContent className="px-6 sm:px-8 pb-8 overflow-hidden">
          {step === 1 ? (
            <form onSubmit={goToPhoneStep} className="space-y-6">
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
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      setPasswordStrength(calculatePasswordStrength(e.target.value))
                    }}
                    placeholder="••••••••"
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
                {password && (
                  <div className="space-y-1.5">
                    <div className="flex gap-1 h-1.5">
                      <div
                        className={cn(
                          "flex-1 rounded-full transition-colors",
                          passwordStrength === "weak" && "bg-red-500",
                          passwordStrength === "medium" && "bg-yellow-500",
                          passwordStrength === "strong" && "bg-green-500",
                          !passwordStrength && "bg-muted"
                        )}
                      />
                      <div
                        className={cn(
                          "flex-1 rounded-full transition-colors",
                          passwordStrength === "medium" && "bg-yellow-500",
                          passwordStrength === "strong" && "bg-green-500",
                          (!passwordStrength || passwordStrength === "weak") && "bg-muted"
                        )}
                      />
                      <div
                        className={cn(
                          "flex-1 rounded-full transition-colors",
                          passwordStrength === "strong" && "bg-green-500",
                          (!passwordStrength || passwordStrength !== "strong") && "bg-muted"
                        )}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {passwordStrength === "weak" && "Weak password"}
                      {passwordStrength === "medium" && "Medium strength"}
                      {passwordStrength === "strong" && "Strong password"}
                      {!passwordStrength && "Use 8+ characters with uppercase, lowercase, numbers, and symbols"}
                    </p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="firstName"
                    className="text-xs font-semibold text-muted-foreground uppercase tracking-wide ml-1"
                  >
                    First Name
                  </Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className={cn(
                      "h-12 bg-background rounded-xl border-border/60 focus:ring-4 focus:ring-primary/10 transition-all",
                      firstName && firstName.trim().length < 3 && "border-destructive/50"
                    )}
                    required
                  />
                  {firstName && firstName.trim().length > 0 && firstName.trim().length < 3 && (
                    <p className="text-xs text-destructive">Must be at least 3 characters</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="lastName"
                    className="text-xs font-semibold text-muted-foreground uppercase tracking-wide ml-1"
                  >
                    Last Name
                  </Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className={cn(
                      "h-12 bg-background rounded-xl border-border/60 focus:ring-4 focus:ring-primary/10 transition-all",
                      lastName && lastName.trim().length < 3 && "border-destructive/50"
                    )}
                    required
                  />
                  {lastName && lastName.trim().length > 0 && lastName.trim().length < 3 && (
                    <p className="text-xs text-destructive">Must be at least 3 characters</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="dob-day"
                  className="text-xs font-semibold text-muted-foreground uppercase tracking-wide ml-1"
                >
                  Date of Birth (DD - MM - YYYY)
                </Label>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="dob-day" className="text-[11px] text-muted-foreground/80 ml-1">
                      Day
                    </Label>
                    <Input
                      id="dob-day"
                      type="text"
                      inputMode="numeric"
                      maxLength={2}
                      value={dobDay}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^\d]/g, "")
                        if (raw.length > 2) return
                        const num = raw === "" ? NaN : parseInt(raw, 10)
                        if (raw === "" || (num >= 1 && num <= 31)) {
                          setDobDay(raw)
                        }
                      }}
                      placeholder="DD"
                      className="h-12 bg-background rounded-xl border-border/60 focus:ring-4 focus:ring-primary/10 transition-all text-center font-mono"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="dob-month" className="text-[11px] text-muted-foreground/80 ml-1">
                      Month
                    </Label>
                    <Input
                      id="dob-month"
                      type="text"
                      inputMode="numeric"
                      maxLength={2}
                      value={dobMonth}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^\d]/g, "")
                        if (raw.length > 2) return
                        const num = raw === "" ? NaN : parseInt(raw, 10)
                        if (raw === "" || (num >= 1 && num <= 12)) {
                          setDobMonth(raw)
                        }
                      }}
                      placeholder="MM"
                      className="h-12 bg-background rounded-xl border-border/60 focus:ring-4 focus:ring-primary/10 transition-all text-center font-mono"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="dob-year" className="text-[11px] text-muted-foreground/80 ml-1">
                      Year
                    </Label>
                    <Input
                      id="dob-year"
                      type="text"
                      inputMode="numeric"
                      maxLength={4}
                      value={dobYear}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^\d]/g, "")
                        if (raw.length > 4) return
                        setDobYear(raw)
                      }}
                      placeholder="YYYY"
                      className="h-12 bg-background rounded-xl border-border/60 focus:ring-4 focus:ring-primary/10 transition-all text-center font-mono"
                      required
                    />
                  </div>
                </div>
                {dob && (() => {
                  const age = calculateAge(dob)
                  if (age === null) return null
                  if (age < 15) return <p className="text-xs text-destructive">You must be at least 15 years old</p>
                  if (age > 100) return <p className="text-xs text-destructive">Age must be 100 or less</p>
                  return <p className="text-xs text-muted-foreground">Age: {age} years</p>
                })()}
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide ml-1">
                  Gender
                </Label>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant={isFemale === false ? "default" : "outline"}
                    className="flex-1 h-10 rounded-xl"
                    onClick={() => setIsFemale(false)}
                  >
                    Male
                  </Button>
                  <Button
                    type="button"
                    variant={isFemale === true ? "default" : "outline"}
                    className="flex-1 h-10 rounded-xl"
                    onClick={() => setIsFemale(true)}
                  >
                    Female
                  </Button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-base font-bold shadow-lg shadow-primary/25 bg-linear-to-r from-primary to-primary/90 rounded-xl active:scale-[0.98] transition-transform"
                disabled={isPending}
              >
                {isPending ? "Checking details..." : "Continue"}
              </Button>
            </form>
          ) : (
            <form onSubmit={completeSignup} className="space-y-6">
              <div className="space-y-2">
                <Label
                  htmlFor="phone"
                  className="text-xs font-semibold text-muted-foreground uppercase tracking-wide ml-1"
                >
                  Phone Number
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
                  />
                </div>
              </div>

              {confirmation ? (
                <div className="space-y-3 flex flex-col items-center">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    OTP
                  </Label>
                  <InputOTP maxLength={OTPLength} value={otp} onChange={setOtp}>
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
              ) : (
                <Button
                  type="button"
                  className="w-full h-10 text-sm font-semibold shadow-md shadow-primary/25 bg-linear-to-r from-primary to-primary/90 rounded-xl active:scale-[0.985] transition-transform"
                  disabled={isPending}
                  onClick={sendOtp}
                >
                  {isPending ? "Sending OTP..." : "Send OTP"}
                </Button>
              )}

              <div key={resetKey} id={`recaptcha-container-${resetKey}`} className="flex justify-center my-2" />

              {confirmation ? (
                <Button
                  type="submit"
                  className="w-full h-12 text-base font-bold shadow-lg shadow-primary/25 bg-linear-to-r from-primary to-primary/90 rounded-xl active:scale-[0.98] transition-transform"
                  disabled={isPending || otp.length !== OTPLength}
                >
                  {isPending ? "Verifying..." : "Verify OTP & Create account"}
                </Button>
              ) : null}
            </form>
          )}
        </CardContent>

        <CardFooter className="justify-center flex-col gap-2 pb-8 bg-muted/20 border-t border-border/40">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-primary"
            onClick={() => navigate("/login")}
          >
            Already have an account? Login
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}


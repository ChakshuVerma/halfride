import { useEffect, useRef, useState, useTransition } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth"
import { getCountryCallingCode, type Country } from "react-phone-number-input"
import { auth } from "../../firebase/setup"
import { Button } from "../ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "../ui/input-otp"
import { CountrySelect } from "./country-select"

const OTPLength = 6

export function Signup() {
  const navigate = useNavigate()
  const [isPending, startTransition] = useTransition()

  // account
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")

  // profile
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [dob, setDob] = useState("") // YYYY-MM-DD
  const [isFemale, setIsFemale] = useState<boolean | null>(null)

  // phone + otp
  const [country, setCountry] = useState<Country>("IN")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [confirmation, setConfirmation] = useState<any>(null)
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

  const sendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!recaptchaRef.current) return toast.error("reCAPTCHA not ready")

    startTransition(async () => {
      try {
        const callingCode = getCountryCallingCode(country)
        const phoneWithCode = "+" + callingCode + phoneNumber
        const result = await signInWithPhoneNumber(auth, phoneWithCode, recaptchaRef.current!)
        setConfirmation(result)
        // reset verifier
        recaptchaRef.current.clear()
        recaptchaRef.current = null
        setResetKey((x) => x + 1)
        toast.success("OTP sent")
      } catch (e) {
        console.error(e)
        toast.error("Failed to send OTP")
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

        const resp = await fetch("/api/auth/signup/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            firebaseIdToken,
            username,
            password,
            DOB: dob,
            FirstName: firstName,
            LastName: lastName,
            isFemale,
          }),
        })
        if (!resp.ok) {
          const err = await resp.json().catch(() => ({}))
          throw new Error(err.message || "Signup failed")
        }

        toast.success("Account created")
        navigate("/dashboard")
        window.location.reload()
      } catch (e: any) {
        console.error(e)
        toast.error(e?.message || "Signup failed")
      }
    })
  }

  return (
    <div className="flex items-center justify-center min-h-[50vh] p-4">
      <Card className="w-full max-w-md border-border shadow-none rounded-3xl bg-card overflow-hidden ring-1 ring-border">
        <CardHeader className="space-y-2 text-center pt-8 pb-6">
          <CardTitle className="text-3xl font-extrabold tracking-tight text-foreground">Create account</CardTitle>
          <CardDescription className="text-base text-muted-foreground/80">
            Signup with username/password. Phone OTP is required once.
          </CardDescription>
        </CardHeader>

        <CardContent className="px-4 sm:px-8 pb-8 overflow-hidden">
          <form onSubmit={confirmation ? completeSignup : sendOtp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="firstName">First name</Label>
                <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last name</Label>
                <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dob">DOB (YYYY-MM-DD)</Label>
              <Input id="dob" value={dob} onChange={(e) => setDob(e.target.value)} placeholder="2002-09-23" required />
            </div>

            <div className="space-y-2">
              <Label>Gender</Label>
              <div className="flex gap-2">
                <Button type="button" variant={isFemale === false ? "default" : "outline"} onClick={() => setIsFemale(false)}>
                  Male
                </Button>
                <Button type="button" variant={isFemale === true ? "default" : "outline"} onClick={() => setIsFemale(true)}>
                  Female
                </Button>
              </div>
            </div>

            {!confirmation ? (
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
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
            ) : (
              <div className="space-y-3 flex flex-col items-center">
                <Label>OTP</Label>
                <InputOTP maxLength={OTPLength} value={otp} onChange={setOtp}>
                  <InputOTPGroup className="gap-2">
                    {[...Array(OTPLength)].map((_, i) => (
                      <InputOTPSlot key={i} index={i} className="w-10 h-12 text-lg border-2 rounded-lg data-[active=true]:border-primary" />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>
            )}

            <div key={resetKey} id={`recaptcha-container-${resetKey}`} className="flex justify-center my-2"></div>

            <Button type="submit" className="w-full" disabled={isPending}>
              {confirmation ? "Verify OTP & Create account" : "Send OTP"}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="justify-center flex-col gap-2 pb-8 bg-muted/20 border-t border-border/40">
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary" onClick={() => navigate("/login")}>
            Already have an account? Login
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}


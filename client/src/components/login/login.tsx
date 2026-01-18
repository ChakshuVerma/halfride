import { useState, useEffect, useTransition, useRef } from "react"
import { toast } from "sonner"
import { getCountryCallingCode, type Country } from "react-phone-number-input"
import { Phone, Loader2 } from "lucide-react"
import { Button } from "../ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "../ui/input-otp"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { CountrySelect } from "./country-select"
import { RecaptchaVerifier, signInWithPhoneNumber, getAdditionalUserInfo } from "firebase/auth"
import { auth } from "../../firebase/setup"
import { InfoMessages } from "./helper"
import { Register } from "./register"

const isNumber = (value: string) => /^\d*$/.test(value)
const OTPLength = 6
// const PhoneNumberLength = 10
const errorDuration = 2000
const ResendOtpTimer = 30

// Toast messages
const ToastMessageOTPVerificationSuccesss = "OTP verified successfully"
const ToastMessageOTPSentSuccesss = "OTP sent successfully"

// Error messages
// const LengthError = `Phone number must be ${PhoneNumberLength} digits`
const NotNumberError = "Only numbers are supported"
const SendingOTPError = "Failed to send OTP"
const RecaptchaError = "Failed to load reCAPTCHA"
const OTPVerificationError = "Please enter the correct OTP"

// Input messages
const PhoneNumberInputMessage = "Please enter your phone number"
const OTPInputMessage = "Please enter your OTP"

// Button text
const SendOTPButtonText = "Send OTP"
const VerifyOTPButtonText = "Verify OTP"
const WrongNumberButtonText = "Wrong number ?"
const ResendOTPButtonText = "Resend OTP"

// Label
const PhoneNumberLabel = "Phone Number"

export function Login() {
  const [loginResult, setLoginResult] = useState<any>(null)
  const [phoneNumber, setPhoneNumber] = useState<string>("")
  const [country, setCountry] = useState<Country>("IN")
  const [error, setError] = useState<string>("")
  const [isPending, startTransition] = useTransition()
  const [resendCountdown, setResendCountdown] = useState<number>(0)
  const [otp, setOtp] = useState<string>("")
  const [resetKey, setResetKey] = useState(0);
  const [showRegister, setShowRegister] = useState(false);

  const recaptchaRef = useRef<RecaptchaVerifier | null>(null)

  const showError = (message: string) => {
    setError(message)
    setTimeout(() => setError(""), errorDuration)
  }


  // 1. Timer logic
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendCountdown])

  // 2. Stable reCAPTCHA initialization
  useEffect(() => {
      const initRecaptcha = async () => {
        if (recaptchaRef.current) return;

        // Use the dynamic ID
        const container = document.getElementById(`recaptcha-container-${resetKey}`);
        if (!container) return;

        try {
          const verifier = new RecaptchaVerifier(auth, `recaptcha-container-${resetKey}`, {
            size: "invisible",
          });

          await verifier.render();
          recaptchaRef.current = verifier;
        } catch (err) {
          console.error("reCAPTCHA init error:", err);
          showError(RecaptchaError);
        }
      };

      initRecaptcha();

      return () => {
        if (recaptchaRef.current) {
          recaptchaRef.current.clear();
          recaptchaRef.current = null;
        }
      };
    }, [resetKey]); // Listen to resetKey

  const handlePhonenumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (!isNumber(value)) {
      showError(NotNumberError)
      return
    }
    setPhoneNumber(value)
    if (error) setError("")
  }
  const handleOtpChange = (value: string) => {
    setOtp(value)
  }

  const sendOTP = async () => {
    if (isPending) return;
    
    if (!recaptchaRef.current) {
      showError(RecaptchaError);
      return;
    }

    startTransition(async () => {
      setError("");
      try {
        const callingCode = getCountryCallingCode(country)
        const phoneWithCode = "+" + callingCode + phoneNumber;
        const confirmationResult = await signInWithPhoneNumber(auth, phoneWithCode, recaptchaRef.current!);
        
        setLoginResult(confirmationResult);

        if (recaptchaRef.current) {
          recaptchaRef.current.clear();
          recaptchaRef.current = null;
          setResetKey(prev => prev + 1); // Triggers useEffect to make a fresh one
        }

        setResendCountdown(ResendOtpTimer);
        toast.success(ToastMessageOTPSentSuccesss);
      } catch (err: any) {
        console.error("Firebase Error:", err);
        showError(SendingOTPError);
        setLoginResult(null); 
      }
    });
  };

  const verifyOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      try {
        const result = await loginResult.confirm(otp)
        const details = getAdditionalUserInfo(result)
        if (details) {
          // If new user, show registration form
          // If existing user, Firebase auth state will update automatically via onAuthStateChanged
          setShowRegister(details.isNewUser)
          toast.success(ToastMessageOTPVerificationSuccesss)
          setError("")
          
          // TODO: For existing users, fetch user profile from backend here if needed
          // The Firebase user is automatically tracked by AuthContext
        }
        else {
          showError(OTPVerificationError)
        }
      } catch (err) {
        console.error(err)
        showError(OTPVerificationError)
      } finally {
        setOtp("")
        if (recaptchaRef.current) {
          recaptchaRef.current.clear();
          recaptchaRef.current = null;
        }
        setResetKey(prev => prev + 1);
      }
    })
  }

  const requestOTP = (e: React.FormEvent) => {
    e.preventDefault();
    sendOTP();
  };

  const resendOTP = () => {
    if (resendCountdown > 0) return;
    sendOTP();
  };

  const changePhoneNumber = () => {
    setLoginResult(null)
    setOtp("")
    if (recaptchaRef.current) {
      recaptchaRef.current.clear();
      recaptchaRef.current = null;
    }
  }

  const enableButton = () => {
    if (loginResult) {
      return otp.length === OTPLength && !isPending
    }
    return !isPending && resendCountdown === 0
  }

  const getButtonText = () => {
    if (loginResult) {
      return VerifyOTPButtonText
    }
    return resendCountdown > 0 ? `Resend OTP in ${resendCountdown}s` : SendOTPButtonText
  }

  if (showRegister) {
      return <Register phoneNumber={`+${getCountryCallingCode(country)} ${phoneNumber}`} />
  }

  return (
    <div className="flex items-center justify-center min-h-[50vh] p-4">
      <Card className="w-full max-w-md border-border shadow-none rounded-3xl bg-card overflow-hidden ring-1 ring-border">

        
        <CardHeader className="space-y-3 text-center pt-8 pb-6">
          <div className="mx-auto bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-2 text-primary">
            <Phone className="w-6 h-6" />
          </div>
          <CardTitle className="text-3xl font-extrabold tracking-tight text-foreground">
            {InfoMessages.welcomeMessage}
          </CardTitle>
          <CardDescription className="text-base text-muted-foreground/80">
            {loginResult ? OTPInputMessage : PhoneNumberInputMessage}
          </CardDescription>
        </CardHeader>

        <CardContent className="px-4 sm:px-8 pb-8 overflow-hidden">
          <form onSubmit={loginResult ? verifyOTP : requestOTP} className="space-y-6">
            {!loginResult ? (
              <div className="space-y-2">
                <Label htmlFor="phone" className="sr-only">{PhoneNumberLabel}</Label>
                <div className="flex w-full items-center rounded-xl border-2 border-border/50 bg-background/50 transition-all duration-300 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary">
                    <CountrySelect country={country} setCountry={setCountry} />
                  <Input
                    id="phone"
                    placeholder="9876543210"
                    type="tel"
                    className="flex-1 h-12 border-none bg-transparent shadow-none focus-visible:ring-0 text-lg tracking-wide rounded-l-none rounded-r-xl"
                    value={phoneNumber}
                    onChange={handlePhonenumberChange}
                    required
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4 flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                <InputOTP
                  maxLength={OTPLength}
                  value={otp}
                  onChange={handleOtpChange}
                >
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
                className="flex justify-center my-4"
            ></div>
            {error && (
              <div className="px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium text-center animate-in fade-in duration-200">
                {error}
              </div>
            )}
            <Button 
              type="submit" 
              className="w-full h-12 text-base font-bold text-primary-foreground shadow-none bg-primary rounded-xl"
              disabled={!enableButton()}
            >
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : getButtonText()}
            </Button>
          </form>
        </CardContent>
        
        <CardFooter className="justify-center flex-col gap-2 pb-8 bg-muted/20 border-t border-border/40">
          {loginResult ? (
            <div className="flex flex-col items-center gap-1 w-full">
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-muted-foreground hover:text-primary" 
                onClick={resendOTP}
                disabled={resendCountdown > 0 || isPending}
              >
                {resendCountdown > 0 ? `Resend OTP in ${resendCountdown}s` : ResendOTPButtonText}
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-muted-foreground hover:text-primary" 
                onClick={changePhoneNumber}
              >
                {WrongNumberButtonText}
              </Button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground/60 text-center max-w-[280px]">
              {InfoMessages.termsAndConditionsInfo}
            </p>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}
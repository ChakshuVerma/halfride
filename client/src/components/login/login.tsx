
import { useState, useEffect, useTransition } from "react"
import { Phone } from "lucide-react"
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
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth"
import { auth } from "../../firebase/setup"
import { InfoMessages } from "./helper"

const isNumber = (value: string) => /^\d*$/.test(value)
const OTPLength = 6
const PhoneNumberLength = 10
const errorDuration = 2000

// Error messages
const LengthError = `Phone number must be ${PhoneNumberLength} digits`
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
const VerifyingOTPButtonText = "Verifying OTP..."
const SendingOTPButtonText = "Sending OTP..."
const WrongNumberButtonText = "Wrong number ?"
const ResendOTPButtonText = "Resend OTP"

// Label
const PhoneNumberLabel = "Phone Number"

export function Login() {
    const [loginResult, setLoginResult] = useState<any>(null)
    const [phoneNumber, setPhoneNumber] = useState<string>("")
    const [error, setError] = useState<string>("")
    const [recaptcha, setRecaptcha] = useState<RecaptchaVerifier | null>(null)
    const [isPending, startTransition] = useTransition()
    const [otp, setOtp] = useState<string>("")

    const enableSendOTPButton = () => {
        return phoneNumber.length === PhoneNumberLength && !isPending
    }

    const handlePhonenumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    
    if (!isNumber(value)) { 
        setError(NotNumberError)
        setTimeout(() => setError(""), errorDuration)
        return
    }
    if (value.length > PhoneNumberLength){
        setError(LengthError)
        setTimeout(() => setError(""), errorDuration)
        return
    }

    setPhoneNumber(value)
    if (error) setError("")
    }

    const getButtonText = () => {
      if (loginResult) {
        return isPending ? VerifyingOTPButtonText : VerifyOTPButtonText
      }
      return isPending ? SendingOTPButtonText : SendOTPButtonText
    }

    const enableVerifyOTPButton = () => {
        return otp.length === OTPLength && !isPending
    }
  
    const handleOtpChange = (value: string) => {
        setOtp(value)
    }

    const enableButton = () => {
      return loginResult ? enableVerifyOTPButton() : enableSendOTPButton()
    }

    const changePhoneNumber = () => {
        setLoginResult(null)
        setOtp("")
        if (recaptcha) {
            recaptcha.clear();
            setRecaptcha(null);
        }
    }

    useEffect(() => {
      // If recaptcha is null and we are NOT in the OTP stage (meaning container is visible)
      if (!recaptcha && !loginResult) {
        const container = document.getElementById("recaptcha-container");
    
        if (container) {
          const verifier = new RecaptchaVerifier(auth, "recaptcha-container", {
            size: "invisible",
          });

          verifier.render().then(() => {
              setRecaptcha(verifier);
          }).catch(console.error);
        }
      }
    }, [recaptcha, loginResult]);

    const requestOTP = async (e: React.FormEvent) => {
      e?.preventDefault()

      if (!recaptcha) {
        setError(RecaptchaError)
        return
      }

      const verifier = recaptcha

      startTransition(async () => {
        setError("")
        try {
          const phoneWithCode = "+91" + phoneNumber
          const confirmationResult = await signInWithPhoneNumber(auth, phoneWithCode, verifier)
          setLoginResult(confirmationResult)
        } 
        catch (err: any) {
          console.error(err)
          setError(SendingOTPError)
          if (verifier) {
            verifier.clear()
            setRecaptcha(null)
          }
          setTimeout(() => setError(""), errorDuration)
        }
      })
    }

    const verifyOTP = async (e: React.FormEvent) => {
      e?.preventDefault()
      startTransition(async () => {
        if (!loginResult) {
          console.log("No login result")
        }
        try {
          await loginResult.confirm(otp)
        } catch (err) {
          console.error(err)
          setError(OTPVerificationError)
          setTimeout(() => setError(""), errorDuration)
        }
      })
    }

    return (
      <div className="flex items-center justify-center min-h-[50vh] p-4">
        <Card className="w-full max-w-md border-none shadow-2xl rounded-3xl bg-white/95 backdrop-blur-xl dark:bg-zinc-900/95 overflow-hidden ring-1 ring-black/5">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-amber-500" />
          
          <CardHeader className="space-y-3 text-center pt-8 pb-6">
            <div className="mx-auto bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-2 text-primary">
              <Phone className="w-6 h-6" />
            </div>
            <CardTitle className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-zinc-900 to-zinc-600 dark:from-white dark:to-zinc-400">
              {InfoMessages.welcomeMessage}
            </CardTitle>
            <CardDescription className="text-base text-muted-foreground/80">
              {loginResult ? OTPInputMessage : PhoneNumberInputMessage}
            </CardDescription>
          </CardHeader>

          <CardContent className="px-8 pb-8">
            <form onSubmit={loginResult ? verifyOTP : requestOTP} className="space-y-6">
              {!loginResult ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="sr-only">{PhoneNumberLabel}</Label>
                    <div className="relative group transition-all duration-300 focus-within:ring-2 focus-within:ring-primary/20 rounded-xl">
                      <div className="absolute left-0 top-0 bottom-0 w-20 flex items-center justify-center bg-muted/30 border-r border-border/50 rounded-l-xl transition-colors group-focus-within:bg-primary/5 group-focus-within:border-primary/20">
                        <span className="text-base font-semibold text-muted-foreground group-focus-within:text-foreground">+91</span>
                      </div>
                      <Input
                        id="phone"
                        placeholder="9876543210"
                        type="tel"
                        className="pl-24 h-12 text-lg tracking-wide border-2 border-border/50 bg-background/50 hover:border-primary/30 focus-visible:ring-0 focus-visible:border-primary rounded-xl transition-all duration-300"
                        value={phoneNumber}
                        onChange={handlePhonenumberChange}
                        required
                      />
                    </div>
                  </div>
                  <div id="recaptcha-container" className="flex justify-center my-2"></div>
                </>
              ) : (
                <div className="space-y-4 flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <InputOTP
                    maxLength={OTPLength}
                    value={otp}
                    onChange={(value) => handleOtpChange(value)}
                  >
                    <InputOTPGroup className="gap-2">
                      {[...Array(6)].map((_, i) => (
                        <InputOTPSlot 
                          key={i} 
                          index={i} 
                          className="w-10 h-12 text-lg border-2 rounded-lg data-[active=true]:border-primary data-[active=true]:ring-2 data-[active=true]:ring-primary/20 transition-all duration-200"
                        />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </div>
              )}

              {error && (
                <div className="px-3 py-1 rounded-lg bg-red-50 text-red-500 text-sm font-medium text-center animate-in fade-in zoom-in-95 duration-200 flex items-center justify-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  {error}
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full h-12 text-base font-bold text-white shadow-lg shadow-primary/25 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 active:scale-[0.98] transition-all duration-200 rounded-xl"
                disabled={!enableButton()}
              >
                {getButtonText()}
              </Button>
            </form>
          </CardContent>
          
          <CardFooter className="justify-center pb-8 bg-muted/20 border-t border-border/40">
            {loginResult ? (
              <>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-muted-foreground hover:text-primary transition-colors" 
                onClick={changePhoneNumber}
              >
                {ResendOTPButtonText}
              </Button>
               <Button 
                variant="ghost" 
                size="sm" 
                className="text-muted-foreground hover:text-primary transition-colors" 
                onClick={changePhoneNumber}
              >
                {WrongNumberButtonText}
              </Button>
              </>
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

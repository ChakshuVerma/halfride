
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
import { InfoMessages, Labels, ButtonText, ErrorMessages, InputMessages } from "./helper"

const errorDuration = 2000
const isNumber = (value: string) => /^\d*$/.test(value)
const OTPLength = 6
const PhoneNumberLength = 10

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
        setError(ErrorMessages.DataTypeError)
        setTimeout(() => setError(""), errorDuration)
        return
    }
    if (value.length > PhoneNumberLength){
        setError(ErrorMessages.LengthError)
        setTimeout(() => setError(""), errorDuration)
        return
    }

    setPhoneNumber(value)
    if (error) setError("")
    }

    const getButtonText = () => {
      if (loginResult) {
        return isPending ? ButtonText.verifyingOTP : ButtonText.verifyOTP
      }
      return isPending ? ButtonText.sendingOTP : ButtonText.sendOTP
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
            setRecaptcha(null); // Clear the state so useEffect can trigger again
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
    }, [recaptcha, loginResult]); // Re-runs whenever recaptcha is cleared

    const requestOTP = async (e: React.FormEvent) => {
      e?.preventDefault()

      startTransition(async () => {
        setError("")
        if (!recaptcha) {
          setError(ErrorMessages.RecaptchaError)
          setTimeout(() => setError(""), errorDuration)
          return
        }
        try {
          const phoneWithCode = "+91" + phoneNumber
          const confirmationResult = await signInWithPhoneNumber(auth, phoneWithCode, recaptcha)
          setLoginResult(confirmationResult)
        } 
        catch (err: any) {
          console.error(err)
          setError(ErrorMessages.SendingOTPError)
          if (recaptcha) {
            recaptcha.clear()
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
          setError(ErrorMessages.OTPVerificationError)
          setTimeout(() => setError(""), errorDuration)
        }
      })
    }

    return (
      <Card className="w-full max-w-sm border-2 shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold tracking-tight">
            {InfoMessages.welcomeMessage}
          </CardTitle>
          <CardDescription>
            {loginResult ? InputMessages.otp : InputMessages.phoneNumber}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={loginResult ? verifyOTP : requestOTP} className="space-y-4">
            {
              !loginResult ? 
              <><div className="space-y-2">
              <Label htmlFor="phone">{Labels.phoneNumber}</Label>
              <div className="relative">
                <div className="absolute left-3 top-2.5 flex items-center gap-2 border-r pr-2 h-5">
                   <Phone className="h-4 w-4 text-muted-foreground" />
                   <span className="text-sm font-medium text-muted-foreground">+91</span>
                </div>
                <Input
                  id="phone"
                  placeholder="9876543210"
                  type="tel"
                  className="pl-20 transition-all focus-visible:ring-2 focus-visible:ring-primary/50"
                  value={phoneNumber}
                  onChange={handlePhonenumberChange}
                  required
                />
              </div>
            </div>
            <div id="recaptcha-container" className="flex justify-center my-4"></div></>
            :
            <div className="space-y-2 flex flex-col items-center">
                <InputOTP
                    maxLength={OTPLength}
                    value={otp}
                    onChange={(value) => handleOtpChange(value)}
                >
                    <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                    </InputOTPGroup>
                </InputOTP>
            </div>
            }
            {error && <p className="text-sm text-red-500 font-medium">{error}</p>}
            <Button 
              type="submit" 
              className="w-full bg-primary font-semibold hover:bg-primary/90 cursor-pointer"
              disabled={!enableButton()}
            >
              {getButtonText()}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center">
          {loginResult ? <Button variant="link" size="sm" className="text-muted-foreground cursor-pointer" onClick={changePhoneNumber}>
            {ButtonText.wrongNumber}
        </Button> : <p className="text-xs text-muted-foreground text-center">
            {InfoMessages.termsAndConditionsInfo}
          </p>}
        </CardFooter>
      </Card>
    )
}

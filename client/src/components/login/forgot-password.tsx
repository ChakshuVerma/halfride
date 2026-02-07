import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult,
} from "firebase/auth";
import { getCountryCallingCode, type Country } from "react-phone-number-input";
import {
  KeyRound,
  Eye,
  EyeOff,
  ArrowLeft,
  ArrowRight,
  Loader2,
  ShieldCheck,
  Smartphone,
  Sparkles,
} from "lucide-react";
import { auth } from "../../firebase/setup";
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
import { InputOTP, InputOTPGroup, InputOTPSlot } from "../ui/input-otp";
import { CountrySelect } from "./country-select";
import { calculatePasswordStrength, validatePassword } from "./utils";
import { cn } from "@/lib/utils";
import { useAuthApi } from "../../hooks/useAuthApi";

// Constants
const CONSTANTS = {
  OTP_LENGTH: 6,
  ERRORS: {
    USERNAME_REQUIRED: "Username is required",
    USERNAME_PASSWORD_REQUIRED: "Username and new password are required",
    RECAPTCHA_NOT_READY: "Security check not ready. Please try again.",
    SEND_OTP_FAILED: "Failed to send verification code",
    RESET_FAILED: "Password reset failed. Please try again.",
  },
  TOASTS: {
    OTP_SENT: "Verification code sent!",
    PASSWORD_UPDATED: "Password updated successfully!",
  },
  LABELS: {
    HEADER_TITLE: "Reset Password",
    HEADER_DESC: "Enter your details to verify your identity.",
    USERNAME: "Username",
    NEW_PASSWORD: "New Password",
    PHONE: "Phone Number",
    OTP: "Verification Code",
    BACK_TO_LOGIN: "Back to Login",
  },
  BUTTONS: {
    RESETTING: "Updating Password...",
    SENDING_OTP: "Sending Code...",
    VERIFY_UPDATE: "Verify & Update",
    SEND_OTP: "Send Verification Code",
    CONTINUE: "Continue",
  },
  PASSWORD_STRENGTH: {
    WEAK: "Weak",
    MEDIUM: "Medium",
    STRONG: "Strong",
    HINT: "8+ chars, upper, lower, numbers & symbols",
  },
  PLACEHOLDERS: {
    USERNAME: "Enter your username",
    PHONE: "98765 43210",
    PASSWORD: "New secure password",
  },
};

export function ForgotPassword() {
  const navigate = useNavigate();
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const [username, setUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<
    "weak" | "medium" | "strong" | null
  >(null);
  const [credentialsValidated, setCredentialsValidated] = useState(false);

  const [country, setCountry] = useState<Country>("IN");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(
    null,
  );
  const [otp, setOtp] = useState("");
  const [resetKey, setResetKey] = useState(0);
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);
  const { completeForgotPassword } = useAuthApi();
  const usernameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    usernameRef.current?.focus();
  }, []);

  // FIX: Added credentialsValidated to dependencies
  useEffect(() => {
    const initRecaptcha = async () => {
      // Only init if we are on the phone step (credentials validated)
      // and NOT already confirmed (OTP screen doesn't need re-init)
      if (!credentialsValidated || confirmation) return;

      const containerId = `recaptcha-container-${resetKey}`;
      const el = document.getElementById(containerId);

      if (!el) {
        // If element isn't there yet, wait a tick for React render
        setTimeout(initRecaptcha, 100);
        return;
      }

      try {
        if (recaptchaRef.current) {
          recaptchaRef.current.clear();
        }

        const verifier = new RecaptchaVerifier(auth, containerId, {
          size: "invisible",
          callback: () => {
            // reCAPTCHA solved, allow signInWithPhoneNumber.
          },
        });

        await verifier.render();
        recaptchaRef.current = verifier;
      } catch (error) {
        console.error("Recaptcha Error:", error);
      }
    };

    initRecaptcha();

    return () => {
      if (recaptchaRef.current) {
        try {
          recaptchaRef.current.clear();
        } catch (e) {
          console.error(e);
        }
        recaptchaRef.current = null;
      }
    };
  }, [resetKey, credentialsValidated, confirmation]); // Dependencies updated

  const validateCredentials = (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim()) {
      toast.error(CONSTANTS.ERRORS.USERNAME_REQUIRED);
      return;
    }

    const pwdError = validatePassword(newPassword);
    if (pwdError) {
      toast.error(pwdError);
      return;
    }

    setCredentialsValidated(true);
  };

  const sendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSendingOtp) return;

    setIsSendingOtp(true);
    try {
      if (!recaptchaRef.current) {
        throw new Error(CONSTANTS.ERRORS.RECAPTCHA_NOT_READY);
      }

      const callingCode = getCountryCallingCode(country);
      const phoneWithCode = "+" + callingCode + phoneNumber;

      const result = await signInWithPhoneNumber(
        auth,
        phoneWithCode,
        recaptchaRef.current,
      );
      setConfirmation(result);

      // Clear recaptcha after success
      recaptchaRef.current.clear();
      recaptchaRef.current = null;
      setResetKey((x) => x + 1);

      toast.success(CONSTANTS.TOASTS.OTP_SENT);
    } catch (e) {
      console.error(e);
      toast.error(CONSTANTS.ERRORS.SEND_OTP_FAILED);
      // Force re-render of recaptcha on fail
      setResetKey((x) => x + 1);
    } finally {
      setIsSendingOtp(false);
    }
  };

  const resetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmation || isResettingPassword) return;
    if (!username || !newPassword)
      return toast.error(CONSTANTS.ERRORS.USERNAME_PASSWORD_REQUIRED);

    const pwdError = validatePassword(newPassword);
    if (pwdError) {
      toast.error(pwdError);
      return;
    }

    setIsResettingPassword(true);
    try {
      const cred = await confirmation.confirm(otp);
      const firebaseIdToken = await cred.user.getIdToken();

      await completeForgotPassword({
        firebaseIdToken,
        username,
        newPassword,
      });

      toast.success(CONSTANTS.TOASTS.PASSWORD_UPDATED);
      navigate("/login");
    } catch (e) {
      console.error(e);
      // @ts-ignore
      toast.error(e?.message || CONSTANTS.ERRORS.RESET_FAILED);
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleBack = () => {
    if (confirmation) {
      setConfirmation(null);
      setOtp("");
      // Important: force re-render of recaptcha when going back
      setResetKey((x) => x + 1);
      return;
    }
    if (credentialsValidated) {
      setCredentialsValidated(false);
      return;
    }
    navigate("/login");
  };

  return (
    <div className="flex items-center justify-center min-h-[80vh] p-4 w-full">
      <Card className="w-full max-w-[420px] border-white/20 shadow-2xl shadow-zinc-900/10 rounded-[2rem] bg-white/80 backdrop-blur-xl overflow-hidden ring-1 ring-white/50 transition-all duration-500">
        {/* Progress Line */}
        <div className="h-1 w-full bg-zinc-100">
          <div
            className="h-full bg-zinc-900 transition-all duration-500 ease-out"
            style={{
              width: confirmation
                ? "100%"
                : credentialsValidated
                  ? "66%"
                  : "33%",
            }}
          />
        </div>

        <CardHeader className="space-y-4 text-center pt-8 pb-4 relative">
          {/* Back Button */}
          <button
            onClick={handleBack}
            className="absolute left-6 top-8 p-2 rounded-full hover:bg-zinc-100 text-zinc-400 hover:text-zinc-900 transition-colors"
            type="button"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="mx-auto w-16 h-16 rounded-2xl bg-zinc-50 border border-zinc-100 flex items-center justify-center mb-2 shadow-inner">
            {confirmation ? (
              <Smartphone className="w-8 h-8 text-zinc-900" strokeWidth={1.5} />
            ) : (
              <KeyRound className="w-8 h-8 text-zinc-900" strokeWidth={1.5} />
            )}
          </div>

          <div className="space-y-2">
            <CardTitle className="text-2xl font-black tracking-tight text-zinc-900">
              {confirmation
                ? "Verify Code"
                : credentialsValidated
                  ? "Verify Phone"
                  : "Reset Password"}
            </CardTitle>
            <CardDescription className="text-base font-medium text-zinc-500 px-4">
              {confirmation
                ? "Enter the code sent to your phone."
                : credentialsValidated
                  ? "Enter phone number linked to your account."
                  : "Enter your username and set a new password."}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="px-8 pb-8 pt-2">
          <form
            onSubmit={
              confirmation
                ? resetPassword
                : credentialsValidated
                  ? sendOtp
                  : validateCredentials
            }
            className="space-y-6"
          >
            {/* STEP 1: Username & New Password */}
            {!credentialsValidated && !confirmation && (
              <div className="space-y-5 animate-in slide-in-from-left-4 fade-in duration-500">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="username"
                    className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1"
                  >
                    {CONSTANTS.LABELS.USERNAME}
                  </Label>
                  <Input
                    id="username"
                    ref={usernameRef}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="h-12 bg-zinc-50/50 hover:bg-zinc-50 focus:bg-white rounded-xl border-zinc-200 focus:border-zinc-400 focus:ring-0 transition-all font-medium"
                    placeholder={CONSTANTS.PLACEHOLDERS.USERNAME}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="newPassword"
                    className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1"
                  >
                    {CONSTANTS.LABELS.NEW_PASSWORD}
                  </Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => {
                        const value = e.target.value;
                        setNewPassword(value);
                        setPasswordStrength(calculatePasswordStrength(value));
                      }}
                      className="h-12 bg-zinc-50/50 hover:bg-zinc-50 focus:bg-white rounded-xl border-zinc-200 focus:border-zinc-400 focus:ring-0 pr-10 transition-all font-medium"
                      placeholder={CONSTANTS.PLACEHOLDERS.PASSWORD}
                      required
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

                  {/* Password Strength Meter */}
                  {newPassword && (
                    <div className="flex items-center gap-2 pt-1">
                      <div className="flex-1 flex gap-1 h-1">
                        <div
                          className={cn(
                            "flex-1 rounded-full transition-colors duration-300",
                            passwordStrength ? "bg-red-400" : "bg-zinc-100",
                          )}
                        />
                        <div
                          className={cn(
                            "flex-1 rounded-full transition-colors duration-300",
                            passwordStrength === "medium" ||
                              passwordStrength === "strong"
                              ? "bg-amber-400"
                              : "bg-zinc-100",
                          )}
                        />
                        <div
                          className={cn(
                            "flex-1 rounded-full transition-colors duration-300",
                            passwordStrength === "strong"
                              ? "bg-emerald-400"
                              : "bg-zinc-100",
                          )}
                        />
                      </div>
                      <span className="text-[10px] font-bold uppercase text-zinc-400 w-12 text-right">
                        {passwordStrength || "Weak"}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* STEP 2: Phone Number */}
            {credentialsValidated && !confirmation && (
              <div className="space-y-5 animate-in slide-in-from-right-4 fade-in duration-500">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="phone"
                    className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1"
                  >
                    {CONSTANTS.LABELS.PHONE}
                  </Label>
                  <div className="flex items-center h-12 rounded-xl border border-zinc-200 bg-zinc-50/50 px-2 transition-all focus-within:border-zinc-400 focus-within:bg-white focus-within:ring-0">
                    <div className="shrink-0">
                      <CountrySelect
                        country={country}
                        setCountry={setCountry}
                      />
                    </div>
                    <div className="w-px h-6 bg-zinc-200 mx-2" />
                    <Input
                      id="phone"
                      placeholder={CONSTANTS.PLACEHOLDERS.PHONE}
                      type="tel"
                      className="flex-1 h-full border-none bg-transparent shadow-none focus-visible:ring-0 px-0 font-medium"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      required
                      disabled={isSendingOtp}
                    />
                  </div>
                </div>

                {/* RECAPTCHA CONTAINER: ONLY RENDERED IN THIS STEP */}
                <div
                  key={resetKey}
                  id={`recaptcha-container-${resetKey}`}
                  className="flex justify-center"
                />
              </div>
            )}

            {/* STEP 3: OTP Verification */}
            {confirmation && (
              <div className="space-y-6 flex flex-col items-center animate-in zoom-in-95 fade-in duration-500">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 text-[10px] font-bold uppercase tracking-wide">
                  <Sparkles className="w-3 h-3" /> {CONSTANTS.TOASTS.OTP_SENT}
                </div>
                <InputOTP
                  maxLength={CONSTANTS.OTP_LENGTH}
                  value={otp}
                  onChange={setOtp}
                  disabled={isResettingPassword}
                >
                  <InputOTPGroup className="gap-3">
                    {[...Array(CONSTANTS.OTP_LENGTH)].map((_, i) => (
                      <InputOTPSlot
                        key={i}
                        index={i}
                        className="w-11 h-14 text-xl font-bold border-2 border-zinc-100 rounded-xl bg-white shadow-sm transition-all data-[active=true]:border-zinc-900 data-[active=true]:scale-110"
                      />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>
            )}

            {/* Action Button */}
            <Button
              type="submit"
              className="w-full h-12 rounded-xl bg-zinc-900 hover:bg-black text-white font-bold text-sm uppercase tracking-widest shadow-lg shadow-zinc-900/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
              disabled={isSendingOtp || isResettingPassword}
            >
              {isResettingPassword ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />{" "}
                  {CONSTANTS.BUTTONS.RESETTING}
                </span>
              ) : isSendingOtp ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />{" "}
                  {CONSTANTS.BUTTONS.SENDING_OTP}
                </span>
              ) : confirmation ? (
                <span className="flex items-center gap-2">
                  {CONSTANTS.BUTTONS.VERIFY_UPDATE}{" "}
                  <ShieldCheck className="w-4 h-4" />
                </span>
              ) : credentialsValidated ? (
                <span className="flex items-center gap-2">
                  {CONSTANTS.BUTTONS.SEND_OTP}{" "}
                  <ArrowRight className="w-4 h-4" />
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  {CONSTANTS.BUTTONS.CONTINUE}{" "}
                  <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="justify-center py-6 bg-zinc-50/50 border-t border-zinc-100">
          <button
            type="button"
            className="text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors"
            onClick={() => navigate("/login")}
          >
            {CONSTANTS.LABELS.BACK_TO_LOGIN}
          </button>
        </CardFooter>
      </Card>
    </div>
  );
}

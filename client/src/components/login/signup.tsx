import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult,
} from "firebase/auth";
import { getCountryCallingCode, type Country } from "react-phone-number-input";
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
import {
  UserPlus,
  Eye,
  EyeOff,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Sparkles,
  Smartphone,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  calculatePasswordStrength,
  validatePassword,
  validateName,
  validateAge,
} from "./utils";
import { useAuthApi } from "../../hooks/useAuthApi";
import { ROUTES } from "@/constants/routes";
import { AuthPageShell } from "@/components/common/AuthPageShell";

const CONSTANTS = {
  OTP_LENGTH: 6,
  ERRORS: {
    USERNAME_REQUIRED: "Username is required",
    PHONE_REQUIRED: "Phone number is required",
    GENDER_REQUIRED: "Please select a gender",
    FILL_REQUIRED_FIELDS: "Fill all required fields",
    RECAPTCHA_NOT_READY: "reCAPTCHA not ready",
    SEND_OTP_FAILED: "Failed to send OTP",
    SIGNUP_FAILED: "Signup failed",
    MIN_AGE: "You must be at least 15 years old",
    MAX_AGE: "Age must be 100 or less",
    MIN_CHARS: "Must be at least 3 characters",
  },
  TOASTS: {
    OTP_SENT: "Verification code sent!",
    ACCOUNT_CREATED: "Welcome aboard! Account created.",
  },
  // ... (Other constants kept same for brevity)
  PASSWORD_STRENGTH: {
    WEAK: "Weak",
    MEDIUM: "Medium",
    STRONG: "Strong",
    HINT: "8+ chars, upper, lower, numbers & symbols",
  },
};

export function Signup() {
  const navigate = useNavigate();
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const { completeSignup: completeSignupRequest, completeSignupLoading } =
    useAuthApi();

  // account
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<
    "weak" | "medium" | "strong" | null
  >(null);

  // profile
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dob, setDob] = useState("");
  const [dobDay, setDobDay] = useState("");
  const [dobMonth, setDobMonth] = useState("");
  const [dobYear, setDobYear] = useState("");
  const [isFemale, setIsFemale] = useState<boolean | null>(null);

  // phone + otp
  const [country, setCountry] = useState<Country>("IN");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(
    null,
  );
  const [otp, setOtp] = useState("");
  const [resetKey, setResetKey] = useState(0);
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);
  const usernameRef = useRef<HTMLInputElement>(null);

  // ... (Effect hooks remain the same as your code) ...
  useEffect(() => {
    usernameRef.current?.focus();
  }, []);

  useEffect(() => {
    const init = async () => {
      if (recaptchaRef.current) return;
      const el = document.getElementById(`recaptcha-container-${resetKey}`);
      if (!el) return;
      const verifier = new RecaptchaVerifier(
        auth,
        `recaptcha-container-${resetKey}`,
        { size: "invisible" },
      );
      await verifier.render();
      recaptchaRef.current = verifier;
    };
    init();
    return () => {
      if (recaptchaRef.current) {
        recaptchaRef.current.clear();
        recaptchaRef.current = null;
      }
    };
  }, [resetKey]);

  useEffect(() => {
    if (!dobYear || !dobMonth || !dobDay) {
      setDob("");
      return;
    }
    const y = dobYear.padStart(4, "0");
    const m = dobMonth.padStart(2, "0");
    const d = dobDay.padStart(2, "0");
    setDob(`${y}-${m}-${d}`);
  }, [dobYear, dobMonth, dobDay]);

  const goToPhoneStep = (e: React.FormEvent) => {
    e.preventDefault();
    // Validation logic (kept same as your code)
    if (!username.trim())
      return toast.error(CONSTANTS.ERRORS.USERNAME_REQUIRED);
    const passwordError = validatePassword(password);
    if (passwordError) return toast.error(passwordError);
    const firstNameError = validateName(firstName, "First name");
    if (firstNameError) return toast.error(firstNameError);
    const lastNameError = validateName(lastName, "Last name");
    if (lastNameError) return toast.error(lastNameError);
    const ageError = validateAge(dobDay, dobMonth, dobYear);
    if (ageError) return toast.error(ageError);
    if (typeof isFemale !== "boolean")
      return toast.error(CONSTANTS.ERRORS.GENDER_REQUIRED);

    setStep(2);
  };

  const sendOtp = async () => {
    if (!phoneNumber.trim())
      return toast.error(CONSTANTS.ERRORS.PHONE_REQUIRED);
    if (isSendingOtp) return;

    setIsSendingOtp(true);
    try {
      let verifier = recaptchaRef.current;
      if (!verifier) {
        const containerId = `recaptcha-container-${resetKey}`;
        const el = document.getElementById(containerId);
        if (!el) throw new Error(CONSTANTS.ERRORS.RECAPTCHA_NOT_READY);
        verifier = new RecaptchaVerifier(auth, containerId, {
          size: "invisible",
        });
        await verifier.render();
        recaptchaRef.current = verifier;
      }
      const callingCode = getCountryCallingCode(country);
      const phoneWithCode = "+" + callingCode + phoneNumber.trim();
      const result = await signInWithPhoneNumber(auth, phoneWithCode, verifier);
      setConfirmation(result);
      verifier.clear();
      recaptchaRef.current = null;
      setResetKey((x) => x + 1);
      toast.success(CONSTANTS.TOASTS.OTP_SENT);
    } catch (e) {
      console.error(e);
      const message =
        e instanceof Error ? e.message : CONSTANTS.ERRORS.SEND_OTP_FAILED;
      toast.error(message);
    } finally {
      setIsSendingOtp(false);
    }
  };

  const completeSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmation) return;
    if (!dob || !firstName || !lastName || typeof isFemale !== "boolean") {
      return toast.error(CONSTANTS.ERRORS.FILL_REQUIRED_FIELDS);
    }
    if (completeSignupLoading) return;

    try {
      const cred = await confirmation.confirm(otp);
      const firebaseIdToken = await cred.user.getIdToken();
      await completeSignupRequest({
        firebaseIdToken,
        username,
        password,
        DOB: dob,
        FirstName: firstName,
        LastName: lastName,
        isFemale,
      });
      toast.success(CONSTANTS.TOASTS.ACCOUNT_CREATED);
      navigate(ROUTES.DASHBOARD);
      window.location.reload();
    } catch (e) {
      console.error(e);
      const message =
        e instanceof Error ? e.message : CONSTANTS.ERRORS.SIGNUP_FAILED;
      toast.error(message);
    }
  };

  return (
    <AuthPageShell>
      <Card className="w-full max-w-[460px] border-white/20 shadow-2xl shadow-zinc-900/10 rounded-[2rem] bg-white/80 backdrop-blur-xl overflow-hidden transition-all duration-500">
        {/* Progress Bar */}
        <div className="h-1.5 w-full bg-zinc-100">
          <div
            className="h-full bg-zinc-900 transition-all duration-500 ease-out"
            style={{ width: step === 1 ? "50%" : "100%" }}
          />
        </div>

        <CardHeader className="space-y-4 text-center pt-8 pb-2">
          {step === 2 && (
            <button
              onClick={() => setStep(1)}
              className="absolute left-6 top-8 p-2 rounded-full hover:bg-zinc-100 text-zinc-400 hover:text-zinc-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          <div className="mx-auto w-16 h-16 rounded-2xl bg-zinc-50 border border-zinc-100 flex items-center justify-center mb-2 shadow-inner">
            {step === 1 ? (
              <UserPlus className="w-8 h-8 text-zinc-900" strokeWidth={1.5} />
            ) : (
              <Smartphone className="w-8 h-8 text-zinc-900" strokeWidth={1.5} />
            )}
          </div>

          <div className="space-y-2">
            <CardTitle className="text-2xl font-black tracking-tight text-zinc-900">
              {step === 1 ? "Create Account" : "Verify Phone"}
            </CardTitle>
            <CardDescription className="text-base font-medium text-zinc-500">
              {step === 1
                ? "Enter your details to join the community."
                : "We'll text you a code to verify your number."}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="px-6 sm:px-8 pb-8 pt-4">
          <div className="relative">
            {step === 1 ? (
              <form
                onSubmit={goToPhoneStep}
                className="space-y-5 animate-in slide-in-from-left-4 fade-in duration-500"
              >
                {/* Name Row */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="firstName"
                      className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1"
                    >
                      First Name
                    </Label>
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="h-11 rounded-xl border-zinc-200 focus:border-zinc-400 focus:ring-0 bg-zinc-50/50"
                      placeholder="John"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="lastName"
                      className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1"
                    >
                      Last Name
                    </Label>
                    <Input
                      id="lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="h-11 rounded-xl border-zinc-200 focus:border-zinc-400 focus:ring-0 bg-zinc-50/50"
                      placeholder="Doe"
                      required
                    />
                  </div>
                </div>

                {/* Username */}
                <div className="space-y-1.5">
                  <Label
                    htmlFor="username"
                    className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1"
                  >
                    Username
                  </Label>
                  <Input
                    id="username"
                    ref={usernameRef}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="h-11 rounded-xl border-zinc-200 focus:border-zinc-400 focus:ring-0 bg-zinc-50/50"
                    placeholder="johndoe123"
                    required
                  />
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <Label
                    htmlFor="password"
                    className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1"
                  >
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setPasswordStrength(
                          calculatePasswordStrength(e.target.value),
                        );
                      }}
                      className="h-11 rounded-xl border-zinc-200 focus:border-zinc-400 focus:ring-0 bg-zinc-50/50 pr-10"
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>

                  {/* Password Strength Meter */}
                  {password && (
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

                {/* DOB & Gender */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">
                      Birth Date
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        value={dobDay}
                        onChange={(e) =>
                          e.target.value.length <= 2 &&
                          setDobDay(e.target.value)
                        }
                        placeholder="DD"
                        className="h-11 px-0 text-center rounded-xl border-zinc-200 focus:border-zinc-400 focus:ring-0 bg-zinc-50/50"
                      />
                      <Input
                        value={dobMonth}
                        onChange={(e) =>
                          e.target.value.length <= 2 &&
                          setDobMonth(e.target.value)
                        }
                        placeholder="MM"
                        className="h-11 px-0 text-center rounded-xl border-zinc-200 focus:border-zinc-400 focus:ring-0 bg-zinc-50/50"
                      />
                      <Input
                        value={dobYear}
                        onChange={(e) =>
                          e.target.value.length <= 4 &&
                          setDobYear(e.target.value)
                        }
                        placeholder="YYYY"
                        className="h-11 px-0 text-center w-[140%] rounded-xl border-zinc-200 focus:border-zinc-400 focus:ring-0 bg-zinc-50/50"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">
                      Gender
                    </Label>
                    <div className="flex gap-2 h-11">
                      <button
                        type="button"
                        onClick={() => setIsFemale(false)}
                        className={cn(
                          "flex-1 rounded-xl text-xs font-bold transition-all border",
                          isFemale === false
                            ? "bg-zinc-900 text-white border-zinc-900 shadow-md"
                            : "bg-white text-zinc-500 border-zinc-200 hover:bg-zinc-50",
                        )}
                      >
                        Male
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsFemale(true)}
                        className={cn(
                          "flex-1 rounded-xl text-xs font-bold transition-all border",
                          isFemale === true
                            ? "bg-zinc-900 text-white border-zinc-900 shadow-md"
                            : "bg-white text-zinc-500 border-zinc-200 hover:bg-zinc-50",
                        )}
                      >
                        Female
                      </button>
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 rounded-xl bg-zinc-900 hover:bg-black text-white font-bold text-sm uppercase tracking-widest shadow-lg shadow-zinc-900/20 mt-2"
                >
                  Continue <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </form>
            ) : (
              <form
                onSubmit={completeSignup}
                className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-500"
              >
                {/* Phone Input Pill */}
                <div className="space-y-2">
                  <Label
                    htmlFor="phone"
                    className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1"
                  >
                    Phone Number
                  </Label>
                  <div
                    className={cn(
                      "flex items-center h-14 rounded-2xl border-2 border-zinc-100 bg-zinc-50/50 px-2 transition-all focus-within:border-zinc-900 focus-within:bg-white focus-within:shadow-lg focus-within:shadow-zinc-900/5",
                      (confirmation || isSendingOtp) &&
                        "opacity-50 pointer-events-none",
                    )}
                  >
                    <div className="shrink-0 pl-1">
                      <CountrySelect
                        country={country}
                        setCountry={setCountry}
                        disabled={
                          !!confirmation || isSendingOtp || completeSignupLoading
                        }
                      />
                    </div>
                    <div className="w-px h-6 bg-zinc-200 mx-2" />
                    <Input
                      id="phone"
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="flex-1 h-full border-none bg-transparent shadow-none focus-visible:ring-0 px-0 text-lg font-medium placeholder:text-zinc-300"
                      placeholder="98765 43210"
                      required
                      disabled={
                        !!confirmation || isSendingOtp || completeSignupLoading
                      }
                    />
                  </div>
                </div>

                {confirmation ? (
                  <div className="space-y-4 pt-2">
                    <div className="flex flex-col items-center space-y-3">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 text-[10px] font-bold uppercase tracking-wide">
                        <Sparkles className="w-3 h-3" /> OTP Sent
                      </div>
                      <InputOTP
                        maxLength={CONSTANTS.OTP_LENGTH}
                        value={otp}
                        onChange={setOtp}
                        disabled={completeSignupLoading}
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

                    <Button
                      type="submit"
                      disabled={
                        completeSignupLoading ||
                        otp.length !== CONSTANTS.OTP_LENGTH
                      }
                      className="w-full h-12 rounded-xl bg-zinc-900 hover:bg-black text-white font-bold text-sm uppercase tracking-widest shadow-lg shadow-zinc-900/20"
                    >
                      {completeSignupLoading ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" /> Verifying
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          Verify & Create <ShieldCheck className="w-4 h-4" />
                        </span>
                      )}
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    onClick={sendOtp}
                    disabled={isSendingOtp}
                    className="w-full h-12 rounded-xl bg-zinc-900 hover:bg-black text-white font-bold text-sm uppercase tracking-widest shadow-lg shadow-zinc-900/20"
                  >
                    {isSendingOtp ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Sending
                        Code...
                      </span>
                    ) : (
                      "Send Verification Code"
                    )}
                  </Button>
                )}

                <div
                  key={resetKey}
                  id={`recaptcha-container-${resetKey}`}
                  className="flex justify-center"
                />
              </form>
            )}
          </div>
        </CardContent>

        <CardFooter className="justify-center border-t border-zinc-100 bg-zinc-50/50 py-6">
          <p className="text-sm text-zinc-500 font-medium">
            Already have an account?{" "}
            <button
              onClick={() => navigate(ROUTES.LOGIN)}
              className="text-zinc-900 font-bold hover:underline"
            >
              Log in
            </button>
          </p>
        </CardFooter>
      </Card>
    </AuthPageShell>
  );
}

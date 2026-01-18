import { useState } from "react"
import { toast } from "sonner"
import { Button } from "../ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { InfoMessages } from "./helper"
import { Phone, Check, Lock, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "../../contexts/AuthContext"
import { authenticatedRequest } from "../../lib/api"
import { useNavigate } from "react-router-dom"

const nameRegex = (value: string) => /^[a-zA-Z]{3,}$/.test(value)

const FirstNameLabel = "First Name"
const LastNameLabel = "Last Name"
const DOBLabel = "Date of Birth"
const GenderLabel = "Gender"
const VerifiedNumberLabel = "Verified Number"
const SubmitButtonText = "Complete Registration"
const ProfileSetupDescription = "Set up your profile to get started"
const FirstNamePlaceholder = "John"
const LastNamePlaceholder = "Doe"

const NameFormatError = "Names must contain at least 3 letters and only alphabets"
const GenderRequiredError = "Please select a gender"
const DOBRequiredError = "Date of Birth is required"
const DOBInvalidError = "Please enter a valid date"
const AgeRestrictionError = "You must be at least 18 years old to register"
const RegistrationFailedError = "Failed to complete registration. Please try again."
const MinimumAge = 18
const ErrorDuration = 4000

interface RegisterProps {
    phoneNumber: string
}

export function Register({ phoneNumber }: RegisterProps) {
    const { setUserProfile, getIdToken } = useAuth()
    const navigate = useNavigate()
    const [firstName, setFirstName] = useState("")
    const [lastName, setLastName] = useState("")
    const [dobYear, setDobYear] = useState("")
    const [dobMonth, setDobMonth] = useState("")
    const [dobDay, setDobDay] = useState("")
    const [gender, setGender] = useState<"male" | "female" | "">("")
    const [error, setError] = useState("")

    const showError = (msg: string) => {
        setError(msg)
        setTimeout(() => setError(""), ErrorDuration)
    }

    const parseDateFromFields = (): Date | null => {
        if (!dobYear || !dobMonth || !dobDay) {
            return null
        }
        
        const year = parseInt(dobYear, 10)
        const month = parseInt(dobMonth, 10)
        const day = parseInt(dobDay, 10)
        
        // Basic validation
        if (isNaN(year) || isNaN(month) || isNaN(day)) {
            return null
        }
        
        // Validate ranges
        if (year < 1900 || year > new Date().getFullYear()) {
            return null
        }
        if (month < 1 || month > 12) {
            return null
        }
        if (day < 1 || day > 31) {
            return null
        }
        
        // Create date and validate it's a real date
        const date = new Date(year, month - 1, day)
        if (
            date.getFullYear() !== year ||
            date.getMonth() + 1 !== month ||
            date.getDate() !== day
        ) {
            return null
        }
        
        return date
    }

    const calculateAge = (birthDate: Date): number => {
        const today = new Date()
        let age = today.getFullYear() - birthDate.getFullYear()
        const monthDiff = today.getMonth() - birthDate.getMonth()
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--
        }
        return age
    }

    const registerUser = async (e: React.FormEvent) => {
        e.preventDefault()
        
        if (!nameRegex(firstName) || !nameRegex(lastName)) {
            return showError(NameFormatError)
        }
        if (!dobYear || !dobMonth || !dobDay) {
            return showError(DOBRequiredError)
        }
        const birthDate = parseDateFromFields()
        if (!birthDate) {
            return showError(DOBInvalidError)
        }
        if (calculateAge(birthDate) < MinimumAge) {
            return showError(AgeRestrictionError)
        }
        if (!gender) {
            return showError(GenderRequiredError)
        }

        try {
            const dobYyyyMmDd = birthDate.toISOString().slice(0, 10)
            const phone = phoneNumber.replace(/\s/g, "")

            await authenticatedRequest(
                "/user/me",
                getIdToken,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        DOB: dobYyyyMmDd,
                        FirstName: firstName,
                        LastName: lastName,
                        isFemale: gender === "female",
                        Phone: phone || undefined,
                    }),
                }
            )
            
            // Save user profile to context
            setUserProfile({
                firstName,
                lastName,
                dob: birthDate.toISOString(),
                gender,
                phone: phoneNumber
            })
            
            toast.success("Registration completed successfully!")
            
            navigate("/dashboard")
        } catch (err) {
            console.error("Registration error:", err)
            showError(RegistrationFailedError)
        }
    }

    return (
        <div className="flex items-center justify-center min-h-[50vh] p-4 w-full">
            <Card className="w-full max-w-[420px] border-border/60 shadow-xl shadow-primary/5 rounded-3xl bg-card overflow-hidden ring-1 ring-border/60 animate-in fade-in slide-in-from-bottom-6 duration-700">
                <CardHeader className="space-y-3 text-center pt-8 pb-6 bg-linear-to-b from-primary/5 to-transparent">
                    <div className="mx-auto bg-linear-to-tr from-primary/20 to-primary/10 w-16 h-16 rounded-2xl rotate-3 flex items-center justify-center mb-2 text-primary ring-4 ring-background shadow-lg">
                        <Sparkles className="w-8 h-8" strokeWidth={1.5} />
                    </div>
                    <div className="space-y-1">
                        <CardTitle className="text-3xl font-bold tracking-tight text-foreground">
                            {InfoMessages.registerInfo}
                        </CardTitle>
                        <CardDescription className="text-base text-muted-foreground/80 font-medium">
                            {ProfileSetupDescription}
                        </CardDescription>
                    </div>
                </CardHeader>

                <CardContent className="px-6 sm:px-8 pb-8">
                    <form onSubmit={registerUser} className="space-y-6">
                        {/* Verified Phone Section */}
                        <div className="p-3 rounded-xl bg-muted/40 border border-border/50 flex items-center gap-3">
                            <div className="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 p-2 rounded-lg">
                                <Phone className="w-4 h-4" />
                            </div>
                            <div className="flex-1">
                                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{VerifiedNumberLabel}</p>
                                <p className="text-sm font-semibold text-foreground slashed-zero">{phoneNumber}</p>
                            </div>
                            <Lock className="w-4 h-4 text-muted-foreground/50" />
                        </div>

                        {/* Name Fields */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="firstName" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide ml-1">
                                    {FirstNameLabel}
                                </Label>
                                <Input 
                                    id="firstName"
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value.trim())}
                                    placeholder={FirstNamePlaceholder}
                                    className="h-12 bg-background rounded-xl border-border/60 focus:ring-4 focus:ring-primary/10 transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="lastName" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide ml-1">
                                    {LastNameLabel}
                                </Label>
                                <Input 
                                    id="lastName"
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value.trim())}
                                    placeholder={LastNamePlaceholder}
                                    className="h-12 bg-background rounded-xl border-border/60 focus:ring-4 focus:ring-primary/10 transition-all"
                                />
                            </div>
                        </div>

                        {/* DOB Field */}
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide ml-1">
                                {DOBLabel}
                            </Label>
                            <div className="grid grid-cols-3 gap-3">
                                <div className="space-y-1">
                                    <Label htmlFor="dobYear" className="text-xs text-muted-foreground/80 ml-1">
                                        Year
                                    </Label>
                                    <Input 
                                        id="dobYear"
                                        type="text"
                                        inputMode="numeric"
                                        value={dobYear}
                                        onChange={(e) => {
                                            const value = e.target.value.replace(/[^\d]/g, '')
                                            if (value.length <= 4) {
                                                setDobYear(value)
                                            }
                                        }}
                                        placeholder="YYYY"
                                        maxLength={4}
                                        className="h-12 bg-background rounded-xl border-border/60 focus:ring-4 focus:ring-primary/10 transition-all font-mono text-center"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="dobMonth" className="text-xs text-muted-foreground/80 ml-1">
                                        Month
                                    </Label>
                                    <Input 
                                        id="dobMonth"
                                        type="text"
                                        inputMode="numeric"
                                        value={dobMonth}
                                        onChange={(e) => {
                                            const value = e.target.value.replace(/[^\d]/g, '')
                                            if (value.length <= 2) {
                                                const num = parseInt(value, 10)
                                                if (value === "" || (num >= 1 && num <= 12)) {
                                                    setDobMonth(value)
                                                }
                                            }
                                        }}
                                        placeholder="MM"
                                        maxLength={2}
                                        className="h-12 bg-background rounded-xl border-border/60 focus:ring-4 focus:ring-primary/10 transition-all font-mono text-center"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="dobDay" className="text-xs text-muted-foreground/80 ml-1">
                                        Day
                                    </Label>
                                    <Input 
                                        id="dobDay"
                                        type="text"
                                        inputMode="numeric"
                                        value={dobDay}
                                        onChange={(e) => {
                                            const value = e.target.value.replace(/[^\d]/g, '')
                                            if (value.length <= 2) {
                                                const num = parseInt(value, 10)
                                                if (value === "" || (num >= 1 && num <= 31)) {
                                                    setDobDay(value)
                                                }
                                            }
                                        }}
                                        placeholder="DD"
                                        maxLength={2}
                                        className="h-12 bg-background rounded-xl border-border/60 focus:ring-4 focus:ring-primary/10 transition-all font-mono text-center"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Gender Selection */}
                        <div className="space-y-3">
                            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide ml-1">
                                {GenderLabel}
                            </Label>
                            <div className="grid grid-cols-2 gap-4">
                                {['male', 'female'].map((g) => (
                                    <div
                                        key={g}
                                        onClick={() => setGender(g as "male" | "female")}
                                        className={cn(
                                            "cursor-pointer relative flex items-center justify-center gap-2 h-14 rounded-xl border-2 transition-all duration-200",
                                            gender === g 
                                                ? 'border-primary bg-primary/5 text-primary shadow-sm' 
                                                : 'border-border/40 bg-card hover:border-primary/50 text-muted-foreground'
                                        )}
                                    >
                                        <span className="capitalize font-semibold text-sm">{g}</span>
                                        {gender === g && (
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-primary animate-in zoom-in duration-300">
                                                <Check className="w-4 h-4" strokeWidth={3} />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                        
                        {error && (
                            <div className="px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium text-center animate-in fade-in duration-200">
                                {error}
                            </div>
                        )}

                        <Button 
                            type="submit" 
                            className="w-full h-14 text-base font-bold shadow-lg shadow-primary/25 bg-linear-to-r from-primary to-primary/90 rounded-xl active:scale-[0.98] transition-transform"
                        >
                            {SubmitButtonText}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
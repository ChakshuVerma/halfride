const AppName = "HalfRide"
const MaxPhoneNumberLength = 10
const OTPLength = 6

// Messages
const InfoMessages = {
    welcomeMessage: `Welcome to ${AppName}`,
    registerInfo: "Enter your information",
    termsAndConditionsInfo: "By continuing, you agree to our Terms and Conditions",
}

const InputMessages = {
    phoneNumber: "Please enter your phone number",
    otp: `Enter your ${OTPLength} digit OTP`,
    reenterOtp: "Please enter the correct OTP",
}

const ErrorMessages = {
    LengthError: `Phone number must be ${MaxPhoneNumberLength} digits`,
    DataTypeError: "Only numbers are supported",
    SendingOTPError: "Failed to send OTP",
    RecaptchaError: "Failed to load reCAPTCHA",
    OTPVerificationError: "Please enter the correct OTP",
}

// Labels 
const Labels = {
    phoneNumber: "Phone Number",
    otp: "OTP",
    name: "Name",
    email: "Email",
    password: "Password",
}

const ButtonText = {
    sendOTP: "Send OTP",
    sendingOTP: "Sending OTP...",
    verifyingOTP: "Verifying OTP...",
    verifyOTP: "Verify OTP",
    register: "Register",
    wrongNumber: "Wrong number",
}

export {InfoMessages, Labels, ButtonText, ErrorMessages, MaxPhoneNumberLength, InputMessages, OTPLength}

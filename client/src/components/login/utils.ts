const MIN_PASSWORD_LENGTH = 8
const MIN_NAME_LENGTH = 3
const MAX_PASSWORD_LENGTH = 128
const MIN_AGE = 15
const MAX_AGE = 100

// Password validation messages
const ERROR_PASSWORD_REQUIRED = "Password is required"
const ERROR_PASSWORD_MIN_LENGTH = (min: number) =>
  `Password must be at least ${min} characters long`
const ERROR_PASSWORD_MAX_LENGTH = (max: number) =>
  `Password must be less than ${max} characters`
const ERROR_PASSWORD_COMPLEXITY =
  "Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character"

// Name validation messages
const ERROR_NAME_REQUIRED = (fieldName: string) => `${fieldName} is required`
const ERROR_NAME_MIN_LENGTH = (fieldName: string, min: number) =>
  `${fieldName} must be at least ${min} characters long`
const ERROR_NAME_INVALID_CHARS = (fieldName: string) =>
  `${fieldName} can only contain letters`

// Age / DOB validation messages
const ERROR_DOB_REQUIRED = "Date of Birth is required"
const ERROR_INVALID_DATE = "Please enter a valid date"
const ERROR_INVALID_DAY_FOR_MONTH = "Day is invalid for the selected month"
const ERROR_AGE_MIN = (min: number) => `You must be at least ${min} years old`
const ERROR_AGE_MAX = (max: number) => `Age must be ${max} or less`

export const calculatePasswordStrength = (pwd: string): "weak" | "medium" | "strong" | null => {
  if (!pwd) return null
  if (pwd.length < MIN_PASSWORD_LENGTH) return "weak"
  
  const secondPasswordLength = 12

  let strength = 0
  if (pwd.length >= MIN_PASSWORD_LENGTH) strength++
  if (pwd.length >= secondPasswordLength) strength++
  if (/[a-z]/.test(pwd)) strength++
  if (/[A-Z]/.test(pwd)) strength++
  if (/[0-9]/.test(pwd)) strength++
  if (/[^a-zA-Z0-9]/.test(pwd)) strength++
  
  if (strength <= 2) return "weak"
  if (strength <= 4) return "medium"
  return "strong"
}

export const calculateAge = (dobString: string): number | null => {
  if (!dobString) return null
  const dob = new Date(dobString)
  if (isNaN(dob.getTime())) return null
  
  const today = new Date()
  let age = today.getFullYear() - dob.getFullYear()
  const monthDiff = today.getMonth() - dob.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--
  }
  return age
}

export const validatePassword = (pwd: string): string | null => {
  if (!pwd.trim()) return ERROR_PASSWORD_REQUIRED
  if (pwd.length < MIN_PASSWORD_LENGTH) return ERROR_PASSWORD_MIN_LENGTH(MIN_PASSWORD_LENGTH)
  if (pwd.length > MAX_PASSWORD_LENGTH) return ERROR_PASSWORD_MAX_LENGTH(MAX_PASSWORD_LENGTH)
  if (
    !/[a-z]/.test(pwd) ||
    !/[A-Z]/.test(pwd) ||
    !/[0-9]/.test(pwd) ||
    !/[^a-zA-Z0-9]/.test(pwd)
  ) {
    return ERROR_PASSWORD_COMPLEXITY
  }
  return null
}

export const validateName = (name: string, fieldName: string): string | null => {
  if (!name.trim()) return ERROR_NAME_REQUIRED(fieldName)
  if (name.trim().length < MIN_NAME_LENGTH)
    return ERROR_NAME_MIN_LENGTH(fieldName, MIN_NAME_LENGTH)
  if (!/^[a-zA-Z]+$/.test(name.trim())) return ERROR_NAME_INVALID_CHARS(fieldName)
  return null
}

export const validateAge = (dobDay: string, dobMonth: string, dobYear: string): string | null => {
  if (!dobDay.trim() || !dobMonth.trim() || !dobYear.trim()) {
    return ERROR_DOB_REQUIRED
  }

  const dayNum = Number(dobDay)
  const monthNum = Number(dobMonth)
  const yearNum = Number(dobYear)

  if (
    !Number.isInteger(dayNum) ||
    !Number.isInteger(monthNum) ||
    !Number.isInteger(yearNum) ||
    yearNum < 1900 ||
    monthNum < 1 ||
    monthNum > 12 ||
    dayNum < 1
  ) {
    return ERROR_INVALID_DATE
  }

  // Validate number of days in the given month/year
  const maxDay = new Date(yearNum, monthNum, 0).getDate() // day 0 of next month
  if (dayNum > maxDay) {
    return ERROR_INVALID_DAY_FOR_MONTH
  }

  const dobString = `${String(yearNum).padStart(4, "0")}-${String(monthNum).padStart(2, "0")}-${String(
    dayNum
  ).padStart(2, "0")}`
  const age = calculateAge(dobString)
  if (age === null) return ERROR_INVALID_DATE
  if (age < MIN_AGE) return ERROR_AGE_MIN(MIN_AGE)
  if (age > MAX_AGE) return ERROR_AGE_MAX(MAX_AGE)
  return null
}

const MIN_PASSWORD_LENGTH = 8
const MIN_NAME_LENGTH = 3
const MAX_PASSWORD_LENGTH = 128
const MIN_AGE = 15
const MAX_AGE = 100

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
  if (!pwd.trim()) return "Password is required"
  if (pwd.length < MIN_PASSWORD_LENGTH) return `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`
  if (pwd.length > MAX_PASSWORD_LENGTH) return `Password must be less than ${MAX_PASSWORD_LENGTH} characters`
  if (!/[a-z]/.test(pwd) || !/[A-Z]/.test(pwd) || !/[0-9]/.test(pwd) || !/[^a-zA-Z0-9]/.test(pwd)) return "Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character"
  return null
}

export const validateName = (name: string, fieldName: string): string | null => {
  if (!name.trim()) return `${fieldName} is required`
  if (name.trim().length < MIN_NAME_LENGTH) return `${fieldName} must be at least ${MIN_NAME_LENGTH} characters long`
  if (!/^[a-zA-Z]+$/.test(name.trim())) return `${fieldName} can only contain letters`
  return null
}

export const validateAge = (dobDay: string, dobMonth: string, dobYear: string): string | null => {
  if (!dobDay.trim() || !dobMonth.trim() || !dobYear.trim()) {
    return "Date of Birth is required"
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
    return "Please enter a valid date"
  }

  // Validate number of days in the given month/year
  const maxDay = new Date(yearNum, monthNum, 0).getDate() // day 0 of next month
  if (dayNum > maxDay) {
    return "Day is invalid for the selected month"
  }

  const dobString = `${String(yearNum).padStart(4, "0")}-${String(monthNum).padStart(2, "0")}-${String(
    dayNum
  ).padStart(2, "0")}`
  const age = calculateAge(dobString)
  if (age === null) return "Please enter a valid date"
  if (age < MIN_AGE) return `You must be at least ${MIN_AGE} years old`
  if (age > MAX_AGE) return `Age must be ${MAX_AGE} or less`
  return null
}

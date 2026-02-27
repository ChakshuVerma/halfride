import { useCallback, useState } from "react"
import { useApi } from "./useApi"
import { API_ROUTES } from "@/lib/apiRoutes"

type LoginPayload = {
  username: string
  password: string
}

type SignupCompletePayload = {
  firebaseIdToken: string
  username: string
  password: string
  DOB: string
  FirstName: string
  LastName: string
  isFemale: boolean
}

type ForgotPasswordCompletePayload = {
  firebaseIdToken: string
  username: string
  newPassword: string
}

export function useAuthApi() {
  const { publicRequest, sessionRequest } = useApi()
  const [loginLoading, setLoginLoading] = useState(false)
  const [completeSignupLoading, setCompleteSignupLoading] = useState(false)
  const [completeForgotPasswordLoading, setCompleteForgotPasswordLoading] = useState(false)

  const login = useCallback(
    async ({ username, password }: LoginPayload) => {
      setLoginLoading(true)
      try {
        await publicRequest(API_ROUTES.AUTH_LOGIN, {
          method: "POST",
          body: JSON.stringify({ username, password }),
        })
      } finally {
        setLoginLoading(false)
      }
    },
    [publicRequest]
  )

  const completeSignup = useCallback(
    async (payload: SignupCompletePayload) => {
      setCompleteSignupLoading(true)
      try {
        await publicRequest(API_ROUTES.AUTH_SIGNUP_COMPLETE, {
          method: "POST",
          body: JSON.stringify(payload),
        })
      } finally {
        setCompleteSignupLoading(false)
      }
    },
    [publicRequest]
  )

  const completeForgotPassword = useCallback(
    async (payload: ForgotPasswordCompletePayload) => {
      setCompleteForgotPasswordLoading(true)
      try {
        await publicRequest(API_ROUTES.AUTH_FORGOT_PASSWORD_COMPLETE, {
          method: "POST",
          body: JSON.stringify(payload),
        })
      } finally {
        setCompleteForgotPasswordLoading(false)
      }
    },
    [publicRequest]
  )

  const logout = useCallback(async () => {
    await sessionRequest(API_ROUTES.AUTH_LOGOUT, {
      method: "POST",
    })
  }, [sessionRequest])

  const getFirebaseCustomToken = useCallback(async () => {
    return sessionRequest<{ ok: boolean; token?: string }>(
      API_ROUTES.AUTH_FIREBASE_CUSTOM_TOKEN,
      { method: "POST" },
    )
  }, [sessionRequest])

  return {
    login,
    completeSignup,
    completeForgotPassword,
    logout,
    getFirebaseCustomToken,
    loginLoading,
    completeSignupLoading,
    completeForgotPasswordLoading,
  }
}


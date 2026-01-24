import { useCallback } from "react"
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
  const { loading, publicRequest, sessionRequest } = useApi()

  const login = useCallback(
    async ({ username, password }: LoginPayload) => {
      await publicRequest(API_ROUTES.AUTH_LOGIN, {
        method: "POST",
        body: JSON.stringify({ username, password }),
      })
    },
    [publicRequest]
  )

  const completeSignup = useCallback(
    async (payload: SignupCompletePayload) => {
      await publicRequest(API_ROUTES.AUTH_SIGNUP_COMPLETE, {
        method: "POST",
        body: JSON.stringify(payload),
      })
    },
    [publicRequest]
  )

  const completeForgotPassword = useCallback(
    async (payload: ForgotPasswordCompletePayload) => {
      await publicRequest(API_ROUTES.AUTH_FORGOT_PASSWORD_COMPLETE, {
        method: "POST",
        body: JSON.stringify(payload),
      })
    },
    [publicRequest]
  )

  const logout = useCallback(async () => {
    await sessionRequest(API_ROUTES.AUTH_LOGOUT, {
      method: "POST",
    })
  }, [sessionRequest])

  return {
    login,
    completeSignup,
    completeForgotPassword,
    logout,
    loading,
  }
}


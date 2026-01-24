import { useCallback } from "react"
import { useApi } from "./useApi"
import { API_ROUTES } from "@/lib/apiRoutes"

type AuthMeResponse = {
  ok: true
  uid: string
  username: string
}

export function useAuthMeApi() {
  const { loading, sessionRequest } = useApi()

  const fetchMe = useCallback(async () => {
    return sessionRequest<AuthMeResponse>(API_ROUTES.AUTH_ME)
  }, [sessionRequest])

  return {
    fetchMe,
    loading,
  }
}

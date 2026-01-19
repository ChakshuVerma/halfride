import { useCallback } from "react"
import { useApi } from "./useApi"
import { API_ROUTES } from "@/lib/apiRoutes"

export type ProfileUser = {
  FirstName?: string
  LastName?: string
  DOB?: string
  isFemale?: boolean
  Phone?: string
}

export type ProfileData = {
  ok?: boolean
  user?: ProfileUser | null
}

export function useUserProfileApi() {
  const { loading, error, sessionRequest } = useApi()

  const fetchProfile = useCallback(async () => {
    return sessionRequest<ProfileData>(API_ROUTES.USER_PROFILE)
  }, [sessionRequest])

  return {
    fetchProfile,
    loading,
    error,
  }
}


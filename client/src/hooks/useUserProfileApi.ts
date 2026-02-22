import { useCallback } from "react"
import { useApi } from "./useApi"
import { API_ROUTES } from "@/lib/apiRoutes"

export type ProfileUser = {
  FirstName?: string
  LastName?: string
  DOB?: string
  isFemale?: boolean
  Phone?: string
  photoURL?: string | null
}

export type ProfileData = {
  ok?: boolean
  user?: ProfileUser | null
}

export function useUserProfileApi() {
  const { sessionRequest } = useApi()

  const fetchProfile = useCallback(async () => {
    return sessionRequest<ProfileData>(API_ROUTES.USER_PROFILE)
  }, [sessionRequest])

  const uploadProfilePhoto = useCallback(
    async (file: File): Promise<{ ok: boolean; photoURL?: string; error?: string }> => {
      const formData = new FormData()
      formData.append("photo", file)
      const res = await sessionRequest<{ ok: boolean; photoURL?: string; error?: string }>(
        API_ROUTES.USER_PROFILE_PHOTO,
        {
          method: "POST",
          body: formData,
        },
      )
      return res
    },
    [sessionRequest],
  )

  return {
    fetchProfile,
    uploadProfilePhoto,
  }
}


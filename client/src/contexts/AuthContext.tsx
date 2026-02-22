import { createContext, useContext, useEffect, useState } from "react"
import type { ReactNode } from "react"
import { useAuthApi } from "../hooks/useAuthApi"
import { useAuthMeApi } from "../hooks/useAuthMeApi"
import { useUserProfileApi, type ProfileData } from "../hooks/useUserProfileApi"

// Extended user data interface (from registration)
export interface UserProfile {
  firstName?: string
  lastName?: string
  dob?: string
  gender?: "male" | "female"
  phone?: string
  photoURL?: string | null
}

interface AuthContextType {
  user: { uid: string; username: string } | null
  userProfile: UserProfile | null
  loading: boolean
  setUserProfile: (profile: UserProfile | null) => void
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const ERROR_USE_AUTH_OUTSIDE_PROVIDER = "useAuth must be used within an AuthProvider"

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<{ uid: string; username: string } | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const { logout: backendLogout } = useAuthApi()
  const { fetchMe } = useAuthMeApi()
  const { fetchProfile } = useUserProfileApi()

  useEffect(() => {
    const load = async () => {
      try {
        const me = await fetchMe()
        setUser({ uid: me.uid, username: me.username })

        const profile: ProfileData = await fetchProfile()
        const u = profile.user
        if (u) {
          setUserProfile({
            firstName: u.FirstName ?? undefined,
            lastName: u.LastName ?? undefined,
            dob: u.DOB ?? undefined,
            gender: typeof u.isFemale === "boolean" ? (u.isFemale ? "female" : "male") : undefined,
            phone: u.Phone ?? undefined,
            photoURL: u.photoURL ?? undefined,
          })
        } else {
          setUserProfile(null)
        }
      } catch {
        setUser(null)
        setUserProfile(null)
      } finally {
        setLoading(false)
      }
    }

    load()
    // fetchMe and fetchProfile are stable (wrapped in useCallback with stable deps)
    // so this effect will only run once on mount, matching original behavior
  }, [fetchMe, fetchProfile])

  const logout = async () => {
    try {
      await backendLogout()
      setUserProfile(null)
      setUser(null)
    } catch (error) {
      console.error("Error signing out:", error)
      throw error
    }
  }

  const value: AuthContextType = {
    user,
    userProfile,
    loading,
    setUserProfile,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error(ERROR_USE_AUTH_OUTSIDE_PROVIDER)
  }
  return context
}

import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react"
import type { ReactNode } from "react"
import { useAuthApi } from "../hooks/useAuthApi"
import { useAuthMeApi } from "../hooks/useAuthMeApi"
import { useUserProfileApi, type ProfileData } from "../hooks/useUserProfileApi"
import { auth } from "../firebase/setup"
import { signInWithCustomToken, signOut } from "firebase/auth"

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
  const { logout: backendLogout, getFirebaseCustomToken } = useAuthApi()
  const { fetchMe } = useAuthMeApi()
  const { fetchProfile } = useUserProfileApi()

  const ensureFirebaseSession = useCallback(
    async (uid: string) => {
      try {
        // If already signed into Firebase with the same uid, do nothing
        if (auth.currentUser && auth.currentUser.uid === uid) {
          return
        }

        const result = await getFirebaseCustomToken()
        if (!result.ok || !result.token) {
          return
        }

        await signInWithCustomToken(auth, result.token)
      } catch (error) {
        console.error("Failed to sync Firebase Auth session", error)
      }
    },
    [getFirebaseCustomToken],
  )

  const loadStartedRef = useRef(false)

  useEffect(() => {
    if (loadStartedRef.current) return
    loadStartedRef.current = true

    const load = async () => {
      try {
        const me = await fetchMe()
        setUser({ uid: me.uid, username: me.username })
        await ensureFirebaseSession(me.uid)

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
  }, [fetchMe, fetchProfile, ensureFirebaseSession])

  const logout = async () => {
    try {
      await backendLogout()
      try {
        await signOut(auth)
      } catch (e) {
        console.error("Error signing out of Firebase Auth:", e)
      }
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

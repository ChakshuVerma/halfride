import { createContext, useContext, useEffect, useState } from "react"
import type { ReactNode } from "react"
import { onAuthStateChanged, signOut } from "firebase/auth"
import type { User } from "firebase/auth"
import { auth } from "../firebase/setup"
import { authenticatedRequest } from "../lib/api"

// Extended user data interface (from registration)
export interface UserProfile {
  firstName?: string
  lastName?: string
  dob?: string
  gender?: "male" | "female"
  phone?: string
}

interface AuthContextType {
  user: User | null
  userProfile: UserProfile | null
  loading: boolean
  profileChecked: boolean
  setUserProfile: (profile: UserProfile | null) => void
  logout: () => Promise<void>
  getIdToken: () => Promise<string | null>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const ERROR_USE_AUTH_OUTSIDE_PROVIDER = "useAuth must be used within an AuthProvider"

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [profileChecked, setProfileChecked] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser)
      setLoading(false)
      
      // If user logs out, clear profile data
      if (!firebaseUser) {
        setUserProfile(null)
        setProfileChecked(true)
        return
      }

      // User is logged in: check if they have a profile in Firestore
      setProfileChecked(false)
      authenticatedRequest<{ ok: boolean; exists: boolean; user: any | null }>(
        "/user/me/exists",
        async () => firebaseUser.getIdToken()
      )
        .then((resp) => {
          if (resp.exists && resp.user) {
            const u = resp.user
            setUserProfile({
              firstName: u.FirstName ?? undefined,
              lastName: u.LastName ?? undefined,
              dob: u.DOB ?? undefined,
              gender:
                typeof u.isFemale === "boolean"
                  ? (u.isFemale ? "female" : "male")
                  : undefined,
              phone: u.Phone ?? undefined,
            })
          } else {
            setUserProfile(null)
          }
        })
        .catch(() => {
          // If the check fails (network/server), don't block the app forever.
          // We'll treat it as "not checked" -> "checked with no profile" to allow UI to proceed.
          setUserProfile(null)
        })
        .finally(() => {
          setProfileChecked(true)
        })
    })

    return () => unsubscribe()
  }, [])

  const logout = async () => {
    try {
      await signOut(auth)
      setUserProfile(null)
      setUser(null)
      setProfileChecked(true)
    } catch (error) {
      console.error("Error signing out:", error)
      throw error
    }
  }

  const getIdToken = async (): Promise<string | null> => {
    if (!user) return null
    try {
      const token = await user.getIdToken()
      return token
    } catch (error) {
      console.error("Error getting ID token:", error)
      return null
    }
  }

  const value: AuthContextType = {
    user,
    userProfile,
    loading,
    profileChecked,
    setUserProfile,
    logout,
    getIdToken,
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

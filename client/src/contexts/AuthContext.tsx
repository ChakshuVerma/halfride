import { createContext, useContext, useEffect, useState } from "react"
import type { ReactNode } from "react"
import { onAuthStateChanged, signOut } from "firebase/auth"
import type { User } from "firebase/auth"
import { auth } from "../firebase/setup"

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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser)
      setLoading(false)
      
      // If user logs out, clear profile data
      if (!firebaseUser) {
        setUserProfile(null)
      }
    })

    return () => unsubscribe()
  }, [])

  const logout = async () => {
    try {
      await signOut(auth)
      setUserProfile(null)
      setUser(null)
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

import { useState, useCallback, useTransition } from "react"
import { useNavigate } from "react-router-dom"
import { LogOut, RefreshCw } from "lucide-react"
import { Button } from "../ui/button"
import { useAuth } from "../../contexts/AuthContext"
import { toast } from "sonner"
import { useHealthCheck } from "../../hooks/useHealthCheck"
import { useUserProfileApi } from "../../hooks/useUserProfileApi"

// Constants
// Error messages
const ERROR_PUBLIC_API_FAILED = "Public API call failed"
const ERROR_AUTHENTICATED_API_FAILED = "Authenticated API call failed"
const ERROR_LOGOUT_FAILED = "Failed to log out"

// Success messages
const TOAST_PUBLIC_API_SUCCESS = "Public API call successful"
const TOAST_AUTHENTICATED_API_SUCCESS = "Authenticated API call successful"
const TOAST_LOGOUT_SUCCESS = "Logged out successfully"

type ProfileUser = {
  FirstName?: string
  LastName?: string
  DOB?: string
  isFemale?: boolean
  Phone?: string
}

type ProfileData = {
  ok?: boolean
  user?: ProfileUser | null
}

const Dashboard = () => {
  const { logout, userProfile, user } = useAuth()
  const [profileData, setProfileData] = useState<ProfileData | null>(null)
  const [isHealthPending, startHealthTransition] = useTransition()
  const [isProfilePending, startProfileTransition] = useTransition()
  const navigate = useNavigate()
  const { checkHealth } = useHealthCheck()
  const { fetchProfile } = useUserProfileApi()

  const testPublicEndpoint = useCallback(() => {
    startHealthTransition(async () => {
      try {
        await checkHealth()
        toast.success(TOAST_PUBLIC_API_SUCCESS)
      } catch {
        toast.error(ERROR_PUBLIC_API_FAILED)
      }
    })
  }, [checkHealth])

  const testAuthenticatedEndpoint = useCallback(() => {
    startProfileTransition(async () => {
      try {
        const data = await fetchProfile()
        setProfileData(data)
        toast.success(TOAST_AUTHENTICATED_API_SUCCESS)
      } catch {
        toast.error(ERROR_AUTHENTICATED_API_FAILED)
      }
    })
  }, [fetchProfile])

  const handleLogout = async () => {
    try {
      await logout()
      toast.success(TOAST_LOGOUT_SUCCESS)
    } catch {
      toast.error(ERROR_LOGOUT_FAILED)
    } finally {
      navigate("/login")
    }
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          {userProfile?.firstName && (
            <p className="text-muted-foreground mt-1">
              Welcome back, {userProfile.firstName}!
            </p>
          )}
        </div>
        <Button
          variant="outline"
          onClick={handleLogout}
          className="gap-2"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>
      <div className="border rounded-lg p-6 bg-card space-y-4">
        <div>
          <h2 className="text-xl font-semibold mb-2">API Test Section</h2>
          <div className="flex gap-2 mb-4">
            <Button
              variant="outline"
              onClick={testPublicEndpoint}
              size="sm"
              disabled={isHealthPending}
            >
              Test Public API
            </Button>
            <Button
              variant="outline"
              onClick={testAuthenticatedEndpoint}
              size="sm"
              disabled={isProfilePending}
            >
              {isProfilePending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                "Test Authenticated API"
              )}
            </Button>
          </div>
          <Button
            size="sm"
            onClick={() => navigate("/terminal")}
          >
            View terminal travellers &amp; groups
          </Button>
        </div>

        {profileData && (
          <div className="border-t pt-4">
            <h3 className="font-semibold mb-2">Profile Data from API:</h3>
            <pre className="bg-muted p-3 rounded text-xs overflow-auto">
              {JSON.stringify(profileData, null, 2)}
            </pre>
          </div>
        )}

        <div className="border-t pt-4">
          <h3 className="font-semibold mb-2">Current Auth State:</h3>
          <div className="text-sm space-y-1">
            <p><strong>User ID:</strong> {user?.uid || 'Not available'}</p>
            <p><strong>Username:</strong> {user?.username || 'Not available'}</p>
            <p><strong>Profile Name:</strong> {userProfile?.firstName || 'Not set'}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
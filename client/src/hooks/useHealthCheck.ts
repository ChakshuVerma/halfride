import { useCallback } from "react"
import { useApi } from "./useApi"
import { API_ROUTES } from "@/lib/apiRoutes"

export function useHealthCheck() {
  const { loading, error, publicRequest } = useApi()

  const checkHealth = useCallback(async () => {
    await publicRequest(API_ROUTES.HEALTH)
  }, [publicRequest])

  return {
    checkHealth,
    loading,
    error,
  }
}


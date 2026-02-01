import { useCallback } from "react"
import { useApi } from "./useApi"
import { API_ROUTES } from "@/lib/apiRoutes"

export type Airport = {
  airportName: string
  airportCode: string
}

export function useGetAirportsApi() {
  const { loading, sessionRequest } = useApi()
  
  const fetchAirports = useCallback(async (): Promise<Airport[]> => {
    try {
        const response = await sessionRequest<{ ok: boolean; data: Airport[] }>(API_ROUTES.AIRPORTS)
        return response.data
    } catch (error) {
        console.error("Failed to fetch airports", error)
        return []
    }
  }, [sessionRequest])

  return {
    fetchAirports,
    loading,
  }
}

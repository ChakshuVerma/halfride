import { useCallback } from "react"
import { useApi } from "./useApi"
import { API_ROUTES } from "@/lib/apiRoutes"

export type Airport = {
  airportName: string
  airportCode: string
  /** City name for search (e.g. "Agra"). */
  city?: string
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

  const fetchTerminals = useCallback(async (code: string): Promise<{ id: string; name: string }[]> => {
    try {
        const response = await sessionRequest<{ ok: boolean; data: { id: string; name: string }[] }>(API_ROUTES.GET_TERMINALS, {
            method: "POST",
            body: JSON.stringify({ airportCode: code }),
        })
        return response.data
    } catch (error) {
        console.error("Failed to fetch terminals", error)
        return []
    }
  }, [sessionRequest])

  return {
    fetchAirports,
    fetchTerminals,
    loading,
  }
}

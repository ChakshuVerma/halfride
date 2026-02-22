import { useCallback, useState } from "react"
import { useApi } from "./useApi"
import { API_ROUTES } from "@/lib/apiRoutes"

export type Airport = {
  airportName: string
  airportCode: string
  /** City name for search (e.g. "Agra"). */
  city?: string
}

export function useGetAirportsApi() {
  const { sessionRequest } = useApi()
  const [fetchAirportsLoading, setFetchAirportsLoading] = useState(false)
  const [fetchTerminalsLoading, setFetchTerminalsLoading] = useState(false)

  const fetchAirports = useCallback(async (): Promise<Airport[]> => {
    setFetchAirportsLoading(true)
    try {
      const response = await sessionRequest<{ ok: boolean; data: Airport[] }>(API_ROUTES.AIRPORTS)
      return response.data ?? []
    } catch (error) {
      console.error("Failed to fetch airports", error)
      return []
    } finally {
      setFetchAirportsLoading(false)
    }
  }, [sessionRequest])

  const fetchTerminals = useCallback(async (code: string): Promise<{ id: string; name: string }[]> => {
    setFetchTerminalsLoading(true)
    try {
      const response = await sessionRequest<{ ok: boolean; data: { id: string; name: string }[] }>(API_ROUTES.GET_TERMINALS, {
        method: "POST",
        body: JSON.stringify({ airportCode: code }),
      })
      return response.data ?? []
    } catch (error) {
      console.error("Failed to fetch terminals", error)
      return []
    } finally {
      setFetchTerminalsLoading(false)
    }
  }, [sessionRequest])

  return {
    fetchAirports,
    fetchTerminals,
    fetchAirportsLoading,
    fetchTerminalsLoading,
  }
}

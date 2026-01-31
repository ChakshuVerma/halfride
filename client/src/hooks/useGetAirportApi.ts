import { useCallback, useState } from "react"

export type Airport = {
  airportName: string
  airportCode: string
}

// Dummy data – this will eventually come from the backend
const dummyAirports: Airport[] = [
  { airportName: "Indira Gandhi International Airport", airportCode: "DEL" },
  { airportName: "Kempegowda International Airport", airportCode: "BLR" },
  { airportName: "Rajiv Gandhi International Airport", airportCode: "HYD" },
]

export function useGetAirportsApi() {
  const [loading, setLoading] = useState(false)
  const fetchAirports = useCallback(async (): Promise<Airport[]> => {
    setLoading(true)
    // TODO: Replace with actual API call
    // return sessionRequest<Airport[]>(API_ROUTES.AIRPORT_TERMINALS)
    await new Promise((resolve) => setTimeout(resolve, 500)) // Fake delay
    setLoading(false)
    return dummyAirports
  }, [])

  return {
    fetchAirports,
    loading,
  }
}

import { useCallback } from "react"

export type AirportTerminalCombo = {
  airportName: string
  terminal: string
}

// Dummy data – this will eventually come from the backend
const dummyAirportTerminalCombos: AirportTerminalCombo[] = [
  { airportName: "Indira Gandhi International Airport", terminal: "T1" },
  { airportName: "Indira Gandhi International Airport", terminal: "T3" },
  { airportName: "Kempegowda International Airport", terminal: "T2" },
]

export function useGetAirportTerminalApi() {
  const fetchAirportTerminalCombos = useCallback(async (): Promise<AirportTerminalCombo[]> => {
    // TODO: Replace with actual API call
    // return sessionRequest<AirportTerminalCombo[]>(API_ROUTES.AIRPORT_TERMINALS)
    await new Promise((resolve) => setTimeout(resolve, 500)) // Fake delay
    return dummyAirportTerminalCombos
  }, [])

  return {
    fetchAirportTerminalCombos,
  }
}

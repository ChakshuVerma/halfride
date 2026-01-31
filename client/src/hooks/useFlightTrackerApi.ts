import { useCallback } from "react"
import { useApi } from "./useApi"
import { API_ROUTES } from "@/lib/apiRoutes"

export type FlightArrivalInfo = {
  arrivalTimeLocal: string
  arrivalDateObj?: Date
  lastUpdatedAt: number
  etaLocal: string
  statusShort?: string
  statusDetail?: string
  isLanded: boolean
  timingLabel?: string
  timingCategory?: "early" | "on_time" | "late"
  timingDeltaMinutes?: number
  terminal?: string | null
  gate?: string | null
  baggage?: string | null
  airlineName?: string | null
  originCode?: string | null
  destCode?: string | null
}

type FlightTrackerResponse = {
  ok?: boolean
  valid?: boolean
  data?: {
    airlineName?: string | null
    departure?: {
      airportCode: string | null
      terminal: string | null
      gate: string | null
      scheduledTime: string | null
    }
    arrival?: {
      airportCode: string | null
      terminal: string | null
      gate: string | null
      baggage: string | null
      scheduledTime: string | null
      estimatedActualTime: string | null
    }
    schedule?: {
      scheduledArrival?: string | null
      estimatedActualArrival?: string | null
    }
    status?: {
      status?: string | null
      statusDescription?: string | null
      statusCode?: string | null
      delayMinutes?: number
    }
    flightNote?: {
      phase?: string | null
      message?: string | null
      landed?: boolean
    }
    isLanded?: boolean
  }
}

type FlightParams = {
  carrier: string
  flightNum: string
  year: number
  month: number
  day: number
}

function parseFlightNumber(flightNumber: string): { carrier: string; flightNum: string } {
  const flightParts = flightNumber.trim().split(/\s+/)
  const carrier = flightParts[0] || ""
  const flightNum = flightParts.slice(1).join("") || flightParts[0] || ""
  return { carrier, flightNum }
}

function parseFlightArrivalInfo(json: FlightTrackerResponse): FlightArrivalInfo {
  const inner = json?.data
  const schedule = inner?.schedule
  const statusInfo = inner?.status
  const flightNote = inner?.flightNote

  const scheduledIso = schedule?.scheduledArrival
  const estimatedIso = schedule?.estimatedActualArrival
  const isoArrival = estimatedIso || scheduledIso

  if (!isoArrival) {
    throw new Error("Arrival time not available")
  }

  const arrivalDate = new Date(isoArrival)
  const arrivalTimeLocal = arrivalDate.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  })

  // Basic Status Flags
  const statusCode = statusInfo?.statusCode || ""
  const isLanded = inner?.isLanded || flightNote?.landed || statusCode === "L" || statusCode === "A"
  const isCancelled = statusCode === "C"

  let timingCategory: "early" | "on_time" | "late" | undefined
  let timingLabel = "Scheduled"
  let timingDeltaMinutes: number | undefined

  /**
   * 6-STAGE STATUS LOGIC
   */
  if (isCancelled) {
    // 1. CANCELLED
    timingLabel = "Cancelled"
    timingCategory = "late" // Highlighted as a negative status
  } else if (isLanded) {
    // 2. LANDED
    timingLabel = "Landed"
    timingCategory = "on_time"
  } else if (statusCode === "S" || statusCode === "" ) {
     // 3. NOT YET STARTED (Scheduled but not active)
     // Use this if flight hasn't departed yet
     timingLabel = "Not yet started"
  } else if (scheduledIso && estimatedIso) {
    const sched = new Date(scheduledIso)
    const est = new Date(estimatedIso)
    const diff = Math.round((est.getTime() - sched.getTime()) / 60000)
    timingDeltaMinutes = diff
    const abs = Math.abs(diff)

    if (diff > 5) {
      // 4. DELAYED
      timingCategory = "late"
      timingLabel = `Delayed by ${abs} min`
    } else if (diff < -5) {
      // 5. EARLY
      timingCategory = "early"
      timingLabel = `Arriving ${abs} min early`
    } else {
      // 6. ON TIME
      timingCategory = "on_time"
      timingLabel = "On time"
    }
  }

  return {
    arrivalTimeLocal,
    arrivalDateObj: isoArrival ? new Date(isoArrival) : undefined,
    lastUpdatedAt: Date.now(),
    etaLocal: arrivalTimeLocal,
    statusShort: timingLabel,
    statusDetail: statusInfo?.statusDescription || undefined,
    isLanded,
    timingCategory,
    timingLabel,
    timingDeltaMinutes,
  }
}

export function useFlightTrackerApi() {
  const { loading, sessionRequest } = useApi()

  const fetchFlightTracker = useCallback(
    async (params: FlightParams): Promise<FlightArrivalInfo> => {
      const { carrier, flightNum, year, month, day } = params
      const url = API_ROUTES.FLIGHT_TRACKER
      const json = await sessionRequest<FlightTrackerResponse>(url, {
        method: "PUT",
        body: JSON.stringify({
          carrier,
          flightNumber: flightNum,
          year,
          month,
          day,
        }),
      })
      return parseFlightArrivalInfo(json)
    },
    [sessionRequest]
  )

  const fetchFlightTrackerByFlightNumber = useCallback(
    async (flightNumber: string, flightDate: Date | string): Promise<FlightArrivalInfo> => {
      const dateObj = new Date(flightDate)
      const { carrier, flightNum } = parseFlightNumber(flightNumber)
      const year = dateObj.getFullYear()
      const month = dateObj.getMonth() + 1
      const day = dateObj.getDate()
      return fetchFlightTracker({ carrier, flightNum, year, month, day })
    },
    [fetchFlightTracker]
  )

  return {
    fetchFlightTrackerByFlightNumber,
    loading
  }
}

import { useCallback } from "react"
import { useApi } from "./useApi"
import { API_ROUTES } from "@/lib/apiRoutes"

export type FlightArrivalInfo = {
  arrivalTimeLocal: string
  lastUpdatedAt: number
  etaLocal: string
  statusShort?: string
  statusDetail?: string
  isLanded: boolean
  timingLabel?: string
  timingCategory?: "early" | "on_time" | "late"
  timingDeltaMinutes?: number
}

type FlightTrackerResponse = {
  ok?: boolean
  valid?: boolean
  data?: {
    schedule?: {
      scheduledArrival?: string
      estimatedActualArrival?: string
    }
    status?: {
      status?: string
      statusDescription?: string
      statusCode?: string
    }
    flightNote?: {
      phase?: string
      message?: string
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

  const scheduledIso: string | undefined = schedule?.scheduledArrival
  const estimatedIso: string | undefined = schedule?.estimatedActualArrival

  // Try to read an ISO arrival time from the API response; fall back to scheduled arrival
  const isoArrival: string | undefined = estimatedIso || scheduledIso

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
  })

  const etaLocal = arrivalTimeLocal
  const statusShort: string | undefined =
    statusInfo?.status || flightNote?.phase || flightNote?.message
  const statusDetail: string | undefined = statusInfo?.statusDescription || undefined

  const isLanded = Boolean(
    inner?.isLanded || flightNote?.landed || statusInfo?.statusCode === "L",
  )

  let timingCategory: "early" | "on_time" | "late" | undefined
  let timingLabel: string | undefined
  let timingDeltaMinutes: number | undefined

  if (!isLanded && scheduledIso && estimatedIso) {
    const sched = new Date(scheduledIso)
    const est = new Date(estimatedIso)
    const diffMinutes = Math.round((est.getTime() - sched.getTime()) / 60000)
    timingDeltaMinutes = diffMinutes

    const abs = Math.abs(diffMinutes)
    if (abs <= 5) {
      timingCategory = "on_time"
      timingLabel = "On time"
    } else if (diffMinutes > 5) {
      timingCategory = "late"
      timingLabel = `Delayed by ${abs} min`
    } else if (diffMinutes < -5) {
      timingCategory = "early"
      timingLabel = `Arriving ${abs} min early`
    }
  }

  return {
    arrivalTimeLocal,
    lastUpdatedAt: Date.now(),
    etaLocal,
    statusShort,
    statusDetail,
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
      const url = `${API_ROUTES.FLIGHT_TRACKER}/${encodeURIComponent(carrier)}/${encodeURIComponent(flightNum)}/${year}/${month}/${day}`

      const json = await sessionRequest<FlightTrackerResponse>(url)
      return parseFlightArrivalInfo(json)
    },
    [sessionRequest]
  )

  const fetchFlightTrackerByFlightNumber = useCallback(
    async (flightNumber: string, flightDate: Date): Promise<FlightArrivalInfo> => {
      const { carrier, flightNum } = parseFlightNumber(flightNumber)
      const year = flightDate.getFullYear()
      const month = flightDate.getMonth() + 1
      const day = flightDate.getDate()
      // Add a fake delay of 500ms
      await new Promise((resolve) => setTimeout(resolve, 500))
      return fetchFlightTracker({ carrier, flightNum, year, month, day })
    },
    [fetchFlightTracker]
  )

  return {
    fetchFlightTrackerByFlightNumber,
    loading
  }
}

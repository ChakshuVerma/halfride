import { useEffect, useState } from "react"
import { DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog"
import { Users, Plane, User, Clock, MapPin, Navigation, Info } from "lucide-react"
import type { Traveller } from "./types"
import { useFlightTrackerApi, type FlightArrivalInfo } from "@/hooks/useFlightTrackerApi"
import { formatWaitTime, formatFlightDateTime } from "./utils"

type TravellerModalProps = {
  traveller: Traveller
}

const TEXTS = {
  LABELS: {
    DESTINATION: "Destination",
    FLIGHT_TIME_DATE: "Flight time & date",
    TERMINAL: "Terminal",
    FLIGHT_NUMBER: "Flight",
    DISTANCE: "Distance from dest",
    WAIT_TIME: "Wait time",
    LAST_UPDATED: "Updated",
    ETA: "ETA",
    FETCHING: "Checking status...",
    REFRESHING: "Refreshing...",
    REFRESH: "Refresh",
    MIN_AGO: "m ago",
    FLIGHT_PREFIX: "Flight",
    SEPARATOR_DOT: " • ",
    SEPARATOR_DASH: " – ",
  },
  UNITS: {
    KM: "km",
  }
}

export function TravellerModal({
  traveller,
}: TravellerModalProps) {
  const { fetchFlightTrackerByFlightNumber } = useFlightTrackerApi()
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [flightInfo, setFlightInfo] = useState<FlightArrivalInfo | undefined>(undefined)
  const [flightError, setFlightError] = useState<string | null>(null)

  const fetchArrivalInfo = async () => {
    try {
      setFlightError(null)
      if (!traveller?.flightDateTime || !traveller?.flightNumber) {
        throw new Error("Traveller or flight info not found")
      }

      const info = await fetchFlightTrackerByFlightNumber(
        traveller.flightNumber,
        traveller.flightDateTime,
      )
      setFlightInfo(info)
    } catch {
      setFlightError("Could not refresh flight arrival time.")
    }
  }

  useEffect(() => {
    void fetchArrivalInfo()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [traveller.id])

  const lastUpdatedMinutesAgo = flightInfo
    ? Math.floor((Date.now() - flightInfo.lastUpdatedAt) / 60000)
    : null

  return (
    <div className="p-3 sm:p-6 space-y-3 sm:space-y-5">
      {/* Header Section */}
      <DialogHeader className="space-y-0 pb-3 sm:pb-4 border-b border-border/10">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="relative shrink-0">
            <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shadow-lg ring-4 ring-white dark:ring-zinc-900 ${
                traveller.gender === "Male"
                  ? "bg-linear-to-br from-blue-500 to-indigo-600 shadow-blue-500/25 border border-blue-600/10"
                  : "bg-linear-to-br from-pink-500 to-rose-600 shadow-pink-500/25 border border-pink-600/10"
              }`}>
              <User className="w-6 h-6 sm:w-8 sm:h-8 text-white" strokeWidth={2.5} />
            </div>
          </div>
          
          <div className="flex-1 min-w-0 space-y-0.5 sm:space-y-1">
            <div className="flex flex-col gap-0.5">
              <DialogTitle className="text-lg sm:text-2xl font-bold tracking-tight text-foreground/90 truncate">
                {traveller.name}
              </DialogTitle>
              <span className="text-xs sm:text-sm font-semibold text-muted-foreground/80">
                {traveller.username}
              </span>
            </div>
            
            <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 pt-0.5 sm:pt-1">
                {traveller.tags?.map((tag, i) => (
                    <span key={i} className="text-[9px] sm:text-[10px] font-semibold text-muted-foreground/70 px-1.5 sm:px-2 py-0.5 rounded-md bg-muted/20 border border-border/20">
                        #{tag}
                    </span>
                ))}
            </div>

            <DialogDescription className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground/80 font-medium pt-1">
              <span className="inline-flex items-center gap-1 bg-muted/30 px-2 py-0.5 rounded-md border border-border/40">
                <Plane className="w-3 h-3" />
                {traveller.flightNumber}
              </span>
              <span className="text-muted-foreground/40">•</span>
              <span className="truncate">{traveller.destination}</span>
              <span className="text-muted-foreground/40">•</span>
              <span>Term {traveller.terminal}</span>
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <div className="space-y-3 sm:space-y-4">
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <div className="flex flex-col gap-0.5 sm:gap-1 p-2.5 sm:p-3 rounded-xl bg-muted/10 border border-border/10 hover:bg-muted/20 transition-colors">
            <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider">
              <MapPin className="w-3 h-3" />
              {TEXTS.LABELS.DISTANCE}
            </div>
            <span className="text-base sm:text-lg font-bold text-foreground">
              {traveller.distanceFromUserKm} <span className="text-[10px] sm:text-xs font-medium text-muted-foreground">{TEXTS.UNITS.KM}</span>
            </span>
          </div>

          <div className="flex flex-col gap-0.5 sm:gap-1 p-2.5 sm:p-3 rounded-xl bg-muted/10 border border-border/10 hover:bg-muted/20 transition-colors">
            <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider">
              <Clock className="w-3 h-3" />
              {TEXTS.LABELS.WAIT_TIME}
            </div>
            <span className="text-base sm:text-lg font-bold text-foreground">
              {formatWaitTime(traveller.flightDateTime)}
            </span>
          </div>
        </div>

        {/* Details List */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 sm:gap-y-4 px-1">
          <div className="space-y-0.5 sm:space-y-1">
            <span className="text-[9px] sm:text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-widest pl-0.5">
              {TEXTS.LABELS.DESTINATION}
            </span>
            <div className="flex items-center gap-2 text-sm font-medium text-foreground/90">
              <Navigation className="w-3.5 h-3.5 text-primary/70" />
              {traveller.destination}
            </div>
          </div>

          <div className="space-y-0.5 sm:space-y-1">
            <span className="text-[9px] sm:text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-widest pl-0.5">
              {TEXTS.LABELS.FLIGHT_TIME_DATE}
            </span>
            <div className="flex items-center gap-2 text-sm font-medium text-foreground/90">
              <Plane className="w-3.5 h-3.5 text-primary/70" />
              {formatFlightDateTime(traveller.flightDateTime)}
            </div>
          </div>
        </div>

        {/* Live Status Card */}
        <div className="relative overflow-hidden rounded-xl bg-linear-to-br from-background via-muted/10 to-muted/30 border border-border/20 p-3 sm:p-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 relative z-10">
            <div className="space-y-1.5 sm:space-y-2 w-full">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-primary/80">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/40 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary"></span>
                  </span>
                  Flight Status
                </div>
                {flightInfo && (
                  <div className="text-[9px] sm:text-[10px] font-medium px-2 py-0.5 rounded-full bg-background/50 border border-border/20 text-muted-foreground/60">
                    {TEXTS.LABELS.LAST_UPDATED} {lastUpdatedMinutesAgo}{TEXTS.LABELS.MIN_AGO}
                  </div>
                )}
              </div>

              {flightInfo ? (
                <div className="space-y-1 sm:space-y-1.5">
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg sm:text-xl font-bold tabular-nums tracking-tight">
                      {flightInfo.arrivalTimeLocal}
                    </span>
                    {(flightInfo.statusShort || flightInfo.statusDetail) && (
                      <span className="text-[10px] sm:text-xs font-medium text-muted-foreground/80 px-1.5 py-0.5 rounded-md bg-muted/30 border border-border/20">
                        {flightInfo.statusShort}
                        {flightInfo.statusDetail && <span className="opacity-60"> - {flightInfo.statusDetail}</span>}
                      </span>
                    )}
                  </div>
                  
                  {!flightInfo.isLanded && flightInfo.etaLocal && (
                     <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-muted-foreground">
                        <span className="font-medium">{TEXTS.LABELS.ETA}</span>
                        <span>{flightInfo.etaLocal}</span>
                        {flightInfo.timingCategory && flightInfo.timingLabel && (
                          <span className={`ml-1 text-[9px] px-1 py-0.5 rounded-md font-semibold uppercase tracking-wide border ${
                             flightInfo.timingCategory === "early"
                               ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                               : flightInfo.timingCategory === "late"
                                 ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                 : "bg-primary/10 text-primary border-primary/20"
                          }`}>
                            {flightInfo.timingLabel}
                          </span>
                        )}
                     </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-muted-foreground/70 py-1">
                   <Info className="w-3.5 h-3.5" />
                   {TEXTS.LABELS.FETCHING}
                </div>
              )}
               {flightError && (
                  <div className="text-[10px] text-destructive/80 font-medium bg-destructive/5 p-1.5 rounded-md border border-destructive/10">
                    {flightError}
                  </div>
                )}
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-0 sm:pt-1">
          <button
            className="w-full group relative overflow-hidden rounded-xl bg-primary px-4 py-2.5 transition-all hover:shadow-lg hover:shadow-primary/25 active:scale-[0.99] active:shadow-sm"
            onClick={() => {
              console.log("Connect clicked for", traveller.name)
            }}
          >
            <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
            <span className="relative flex items-center justify-center gap-2 text-primary-foreground font-bold text-sm tracking-wide">
              Connect with {traveller.name.split(' ')[0]}
              <Navigation className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}

import { DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog"
import { Users, Plane, User } from "lucide-react"
import type { Traveller } from "./types"
import type { FlightArrivalInfo } from "@/hooks/useFlightTrackerApi"

type TravellerModalProps = {
  traveller: Traveller
  flightInfo?: FlightArrivalInfo
  flightError: string | null
  isRefreshingFlight: boolean
  onRefresh: () => void
  formatFlightDateTime: (date: Date) => string
  formatWaitTime: (date: Date) => string
}

const TEXTS = {
  LABELS: {
    DESTINATION: "Destination",
    FLIGHT_TIME_DATE: "Flight time & date",
    TERMINAL: "Terminal",
    FLIGHT_NUMBER: "Flight number",
    DISTANCE: "Distance from your dest",
    WAIT_TIME: "Wait time",
    LAST_UPDATED: "Last updated arrival time: ",
    ETA: "ETA: ",
    FETCHING: "Fetching latest arrival time…",
    REFRESHING: "Refreshing...",
    REFRESH: "Refresh",
    MIN_AGO: "min ago",
    FLIGHT_PREFIX: "Flight",
    SEPARATOR_DOT: " • ",
    SEPARATOR_DASH: " – ",
  },
  UNITS: {
      KM_DUMMY: "km (dummy)",
  }
}


export function TravellerModal({
  traveller,
  flightInfo,
  flightError,
  isRefreshingFlight,
  onRefresh,
  formatFlightDateTime,
  formatWaitTime,
}: TravellerModalProps) {
  const lastUpdatedMinutesAgo = flightInfo
    ? Math.floor((Date.now() - flightInfo.lastUpdatedAt) / 60000)
    : null
  const isStale = lastUpdatedMinutesAgo === null || lastUpdatedMinutesAgo > 10

  return (
    <div className="p-8 space-y-7 pr-16">
      <DialogHeader className="space-y-4 pb-5 border-b border-border/20">
        <div className="flex items-start gap-5">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-primary bg-primary/8 border border-primary/15 shadow-lg shadow-primary/5">
            <Users className="w-7 h-7" />
          </div>
          <div className="flex-1 space-y-2.5">
            <div className="flex items-center gap-3 flex-wrap">
              <DialogTitle className="text-2xl font-bold tracking-tight">
                {traveller.name}
              </DialogTitle>
              <span
                className={`text-xs px-3 py-1.5 rounded-xl font-semibold inline-flex items-center gap-1.5 shadow-sm ${
                  traveller.gender === "Male"
                    ? "bg-blue-50 text-blue-700 border border-blue-200/50"
                    : "bg-pink-100 text-pink-800 border border-pink-300/50"
                }`}
              >
                <User className="w-3.5 h-3.5" />
                {traveller.gender}
              </span>
            </div>
            <DialogDescription className="text-sm text-muted-foreground/80 inline-flex items-center gap-2 font-medium">
              <Plane className="w-4 h-4" />
              {TEXTS.LABELS.FLIGHT_PREFIX} {traveller.flightNumber} {TEXTS.LABELS.SEPARATOR_DOT} {traveller.destination} {TEXTS.LABELS.SEPARATOR_DOT} {traveller.terminal}
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-widest">
              {TEXTS.LABELS.DESTINATION}
            </span>
            <span className="text-foreground font-semibold text-base">{traveller.destination}</span>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-widest">
              {TEXTS.LABELS.FLIGHT_TIME_DATE}
            </span>
            <span className="text-foreground font-semibold text-base">
              {formatFlightDateTime(traveller.flightDateTime)}
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-widest">
              {TEXTS.LABELS.TERMINAL}
            </span>
            <span className="text-foreground font-semibold text-base">{traveller.terminal}</span>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-widest">
              {TEXTS.LABELS.FLIGHT_NUMBER}
            </span>
            <span className="text-foreground font-semibold text-base">{traveller.flightNumber}</span>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-widest">
              {TEXTS.LABELS.DISTANCE}
            </span>
            <span className="text-foreground font-semibold text-base">
              {traveller.distanceFromUserKm} {TEXTS.UNITS.KM_DUMMY}
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-widest">
              {TEXTS.LABELS.WAIT_TIME}
            </span>
            <span className="text-foreground font-semibold text-base">
              {formatWaitTime(traveller.flightDateTime)}
            </span>
          </div>
        </div>

        <div className="rounded-2xl bg-muted/20 border border-border/20 px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 backdrop-blur-sm shadow-sm">
          <div className="text-xs text-muted-foreground/80 space-y-2">
            {flightInfo ? (
              <>
                <div>
                  <span className="text-muted-foreground/70">{TEXTS.LABELS.LAST_UPDATED}</span>
                  <span className="font-semibold text-foreground">{flightInfo.arrivalTimeLocal}</span>
                  <span className="ml-2 text-[11px] text-muted-foreground/60">
                    ({lastUpdatedMinutesAgo} {TEXTS.LABELS.MIN_AGO})
                  </span>
                </div>
                {(flightInfo.etaLocal || flightInfo.statusShort || flightInfo.statusDetail) && (
                  <div className="text-xs flex flex-col gap-1.5">
                    {!flightInfo.isLanded && flightInfo.etaLocal && (
                      <div>
                        <span className="text-muted-foreground/70">{TEXTS.LABELS.ETA}</span>
                        <span className="font-semibold text-foreground">{flightInfo.etaLocal}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2.5 flex-wrap">
                      {(flightInfo.statusShort || flightInfo.statusDetail) && (
                        <span className="font-medium text-foreground">
                          {flightInfo.statusShort}
                          {flightInfo.statusDetail ? `${TEXTS.LABELS.SEPARATOR_DASH}${flightInfo.statusDetail}` : ""}
                        </span>
                      )}
                      {!flightInfo.isLanded && flightInfo.timingCategory && flightInfo.timingLabel && (
                        <span
                          className={`px-2.5 py-1 rounded-xl text-[10px] font-semibold uppercase tracking-wider shadow-sm ${
                            flightInfo.timingCategory === "early"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200/50"
                              : flightInfo.timingCategory === "late"
                                ? "bg-amber-50 text-amber-800 border border-amber-200/50"
                                : "bg-emerald-50/80 text-emerald-700 border border-emerald-200/30"
                          }`}
                        >
                          {flightInfo.timingLabel}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <span className="text-muted-foreground/70 font-medium">
                {TEXTS.LABELS.FETCHING}
              </span>
            )}
            {flightError && (
              <div className="mt-1.5 text-xs text-destructive font-medium">{flightError}</div>
            )}
          </div>
          {isStale && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshingFlight}
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-60 disabled:cursor-not-allowed hover:bg-primary/90 transition-all duration-200 shadow-md hover:shadow-lg"
            >
              {isRefreshingFlight ? TEXTS.LABELS.REFRESHING : TEXTS.LABELS.REFRESH}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

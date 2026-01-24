import { Plane, User } from "lucide-react"
import type { Traveller } from "./types"

type TravellerCardProps = {
  traveller: Traveller
  onClick: () => void
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
    SEPARATOR_DOT: " • ",
  },
  UNITS: {
    KM_DUMMY: "km (dummy)",
  }
}


export function TravellerCard({
  traveller,
  onClick,
  formatFlightDateTime,
  formatWaitTime,
}: TravellerCardProps) {
  return (
    <div
      className="border rounded-2xl p-6 shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer group backdrop-blur-sm bg-card/40 border-border/40 hover:border-primary/20 hover:bg-card/80"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-3 flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-bold text-foreground text-lg group-hover:text-primary transition-colors duration-200">
              {traveller.name}
            </span>
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
          <div className="inline-flex items-center gap-3 text-xs text-muted-foreground/80">
            <span className="px-3.5 py-1.5 rounded-xl bg-primary/8 text-primary font-semibold border border-primary/15 inline-flex items-center gap-1.5 shadow-sm">
              <Plane className="w-3.5 h-3.5" />
              {traveller.flightNumber}
            </span>
            <span className="text-muted-foreground/70 font-medium">
              {traveller.destination} {TEXTS.LABELS.SEPARATOR_DOT} {traveller.terminal}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-5 pt-5 border-t border-border/20 grid sm:grid-cols-2 gap-x-8 gap-y-3 text-xs">
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground/70 font-medium">{TEXTS.LABELS.DESTINATION}</span>
          <span className="text-right text-foreground font-semibold">{traveller.destination}</span>
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground/70 font-medium">{TEXTS.LABELS.FLIGHT_TIME_DATE}</span>
          <span className="text-right text-foreground font-semibold">
            {formatFlightDateTime(traveller.flightDateTime)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground/70 font-medium">{TEXTS.LABELS.TERMINAL}</span>
          <span className="text-right text-foreground font-semibold">{traveller.terminal}</span>
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground/70 font-medium">{TEXTS.LABELS.FLIGHT_NUMBER}</span>
          <span className="text-right text-foreground font-semibold">{traveller.flightNumber}</span>
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground/70 font-medium">{TEXTS.LABELS.DISTANCE}</span>
          <span className="text-right text-foreground font-semibold">
            {traveller.distanceFromUserKm} {TEXTS.UNITS.KM_DUMMY}
          </span>
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground/70 font-medium">{TEXTS.LABELS.WAIT_TIME}</span>
          <span className="text-right text-foreground font-semibold">
            {formatWaitTime(traveller.flightDateTime)}
          </span>
        </div>
      </div>
    </div>
  )
}

import { Plane } from "lucide-react"
import type { Group } from "./types"
import { formatWaitTime } from "./utils"

type GroupCardProps = {
  group: Group
  onClick: () => void
}

const TEXTS = {
  LABELS: {
    SEATS: "seats",
    CAPACITY: "Capacity",
    MIN_DISTANCE: "Min distance from destinations",
    WAIT_TIME: "Wait time",
    GENDER_DIST: "Gender distribution",
    SEPARATOR_DOT: " • ",
  },
  UNITS: {
    KM_DUMMY_MIN: "km (dummy min)",
  }
}

export function GroupCard({ group, onClick }: GroupCardProps) {
  return (
    <div
      className="border rounded-2xl p-6 shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer group backdrop-blur-sm bg-card/40 border-border/40 hover:border-primary/20 hover:bg-card/80"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-3 flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-bold text-foreground text-lg group-hover:text-primary transition-colors duration-200">
              {group.name}
            </span>
          </div>
          <div className="inline-flex items-center gap-3 text-xs text-muted-foreground/80">
            <span className="px-3.5 py-1.5 rounded-xl bg-primary/8 text-primary font-semibold border border-primary/15 shadow-sm">
              {group.groupSize}/{group.maxUsers} {TEXTS.LABELS.SEATS}
            </span>
            <span className="text-muted-foreground/70 font-medium inline-flex items-center gap-1.5">
              <Plane className="w-3.5 h-3.5" />
              {group.flightNumber} {TEXTS.LABELS.SEPARATOR_DOT} {group.terminal}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-5 pt-5 border-t border-border/20 space-y-4 text-xs">
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-muted-foreground/70 font-medium">{TEXTS.LABELS.CAPACITY}</span>
            <span className="text-foreground font-semibold">
              {Math.round((group.groupSize / group.maxUsers) * 100)}%
            </span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-muted/40 overflow-hidden shadow-inner">
            <div
              className="h-full rounded-full bg-linear-to-r from-primary via-primary/90 to-primary/80 shadow-sm transition-all duration-500"
              style={{
                width: `${Math.min(100, Math.round((group.groupSize / group.maxUsers) * 100))}%`,
              }}
            />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-x-8 gap-y-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground/70 font-medium">{TEXTS.LABELS.MIN_DISTANCE}</span>
            <span className="text-right text-foreground font-semibold">
              {group.distanceFromUserKm} {TEXTS.UNITS.KM_DUMMY_MIN}
            </span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground/70 font-medium">{TEXTS.LABELS.WAIT_TIME}</span>
            <span className="text-right text-foreground font-semibold">
              {formatWaitTime(group.flightDateTime)}
            </span>
          </div>

          <div className="flex items-center justify-between gap-3 sm:col-span-2">
            <span className="text-muted-foreground/70 font-medium">{TEXTS.LABELS.GENDER_DIST}</span>
            <span className="text-right">
              <span className="inline-flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-500 shadow-sm" />
                <span className="text-foreground font-semibold">{group.genderBreakdown.male}M</span>
              </span>
              <span className="inline-flex items-center gap-2 ml-4">
                <span className="w-3 h-3 rounded-full bg-pink-500 shadow-sm" />
                <span className="text-foreground font-semibold">{group.genderBreakdown.female}F</span>
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

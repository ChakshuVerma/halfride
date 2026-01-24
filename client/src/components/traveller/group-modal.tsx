import { DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog"
import { UsersRound, Plane, User } from "lucide-react"
import type { Group } from "./types"
import { formatWaitTime } from "./utils"

type GroupModalProps = {
  group: Group
}

const TEXTS = {
  LABELS: {
    CAPACITY: "Capacity",
    MIN_DISTANCE: "Min distance from destinations",
    WAIT_TIME: "Wait time",
    GENDER_DIST: "Gender distribution",
    GROUP_OF: "Group of",
    FLIGHT_PREFIX: "Flight",
    SEPARATOR_DOT: " • ",
  },
  UNITS: {
    KM_DUMMY_MIN: "km (dummy min)",
  }
}


export function GroupModal({ group }: GroupModalProps) {
  return (
    <div className="p-8 space-y-7 pr-16">
      <DialogHeader className="space-y-4 pb-5 border-b border-border/20">
        <div className="flex items-start gap-5">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-primary bg-primary/8 border border-primary/15 shadow-lg shadow-primary/5">
            <UsersRound className="w-7 h-7" />
          </div>
          <div className="flex-1 space-y-2.5">
            <div className="flex items-center gap-3 flex-wrap">
              <DialogTitle className="text-2xl font-bold tracking-tight">{group.name}</DialogTitle>
              <span
                className={`text-xs px-3 py-1.5 rounded-xl font-semibold inline-flex items-center gap-1.5 shadow-sm ${
                  group.gender === "Male"
                    ? "bg-blue-50 text-blue-700 border border-blue-200/50"
                    : "bg-pink-100 text-pink-800 border border-pink-300/50"
                }`}
              >
                <User className="w-3.5 h-3.5" />
                {group.gender}
              </span>
            </div>
            <DialogDescription className="text-sm text-muted-foreground/80 inline-flex items-center gap-2 font-medium">
              <Plane className="w-4 h-4" />
              {TEXTS.LABELS.GROUP_OF} {group.groupSize} {TEXTS.LABELS.SEPARATOR_DOT} {TEXTS.LABELS.FLIGHT_PREFIX} {group.flightNumber} {TEXTS.LABELS.SEPARATOR_DOT} {group.terminal}
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <div className="space-y-6">
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-widest">
              {TEXTS.LABELS.CAPACITY}
            </span>
            <span className="text-sm font-semibold text-foreground">
              {group.groupSize}/{group.maxUsers} (
              {Math.round((group.groupSize / group.maxUsers) * 100)}%)
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

        <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-widest">
              {TEXTS.LABELS.MIN_DISTANCE}
            </span>
            <span className="text-foreground font-semibold text-base">
              {group.distanceFromUserKm} {TEXTS.UNITS.KM_DUMMY_MIN}
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-widest">
              {TEXTS.LABELS.WAIT_TIME}
            </span>
            <span className="text-foreground font-semibold text-base">
              {formatWaitTime(group.flightDateTime)}
            </span>
          </div>

          <div className="flex flex-col gap-1.5 col-span-2">
            <span className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-widest mb-2">
              {TEXTS.LABELS.GENDER_DIST}
            </span>
            <div className="flex items-center gap-5">
              <span className="inline-flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-500 shadow-sm" />
                <span className="text-foreground font-semibold text-base">
                  {group.genderBreakdown.male}M
                </span>
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-pink-500 shadow-sm" />
                <span className="text-foreground font-semibold text-base">
                  {group.genderBreakdown.female}F
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

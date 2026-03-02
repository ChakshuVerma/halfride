import { Users, MapPin, ArrowRight } from "lucide-react";
import { formatShortDate } from "@/lib/date";
import { Spinner } from "@/components/ui/spinner";
import type { Group } from "./types";

const CONSTANTS = {
  LABELS: {
    SEATS: "seats",
    CAPACITY: "Capacity",
    DESTINATIONS: "Destinations",
    CREATED: "Created",
    AVG_DISTANCE: "Avg. distance from your destination",
  },
  UNITS: {
    PERCENT: "%",
  },
  SUFFIX: {
    USERS: "Users",
    FULL: "Full",
  },
  BUTTONS: {
    VIEW_MORE: "View More",
  },
  GENDER: {
    MALE: "Male",
    FEMALE: "Female",
  },
};

type GroupCardProps = {
  group: Group;
  onClick: () => void;
  /** When true, shows "Your group" badge and highlight styling. */
  isYourGroup?: boolean;
  /** When true, shows a loading overlay (e.g. while fetching fresh data before opening modal). */
  isOpening?: boolean;
};

export function GroupCard({ group, onClick, isYourGroup = false, isOpening = false }: GroupCardProps) {
  const percentFull = Math.round((group.groupSize / group.maxUsers) * 100);

  const avatarGradient =
    "bg-gradient-to-br from-muted to-muted/80 dark:from-muted dark:to-muted/80 border border-border";
  const accentColor = "text-primary";

  return (
    <div
      className={`group relative flex flex-col overflow-hidden rounded-[2rem] border shadow-sm transition-all duration-500 hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:-translate-y-1 dark:border-white/5 ${
        isYourGroup
          ? "border-primary ring-2 ring-ring bg-primary/10"
          : "border-border hover:border-border/80 dark:border-white/5"
      } ${isOpening ? "pointer-events-none opacity-70" : ""}`}
    >
      {isOpening && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-[2rem] bg-card/80">
          <Spinner size="lg" className="text-primary" />
        </div>
      )}
      {/* Top Section */}
      <div className="relative p-4 sm:p-5 bg-muted/70 dark:bg-muted border-b border-border transition-colors duration-300">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div
              className={`relative w-16 h-16 rounded-2xl ${avatarGradient} flex items-center justify-center shadow-lg ring-4 ring-background dark:ring-background group-hover:scale-105 transition-transform duration-500`}
            >
              <Users className={`w-8 h-8 ${accentColor}`} strokeWidth={2.5} />
            </div>

            <div className="flex flex-col pt-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-bold text-foreground leading-tight group-hover:text-primary transition-colors line-clamp-1">
                  {group.name}
                </h3>
                {isYourGroup && (
                  <span className="px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold shadow-sm">
                    Your group
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                {/* Capacity Pill */}
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-card text-primary border border-border text-[10px] font-bold shadow-sm">
                  <span>
                    {group.groupSize}/{group.maxUsers} {CONSTANTS.SUFFIX.USERS}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Capacity Bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {CONSTANTS.LABELS.CAPACITY}
            </span>
            <span className="text-[10px] font-bold text-foreground">
              {percentFull}
              {CONSTANTS.UNITS.PERCENT} {CONSTANTS.SUFFIX.FULL}
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-card border border-border overflow-hidden shadow-sm">
            <div
              className="h-full rounded-full bg-foreground transition-all duration-700 ease-out shadow-sm"
              style={{ width: `${percentFull}%` }}
            />
          </div>
          {/* Gender Dist Dots - Visual Only */}
          <div className="flex justify-end mt-1.5 gap-1">
            {Array.from({ length: group.genderBreakdown.male }).map((_, i) => (
              <div
                key={`m-${i}`}
                className="w-1.5 h-1.5 rounded-full bg-primary"
                title={CONSTANTS.GENDER.MALE}
              />
            ))}
            {Array.from({ length: group.genderBreakdown.female }).map(
              (_, i) => (
                <div
                  key={`f-${i}`}
                  className="w-1.5 h-1.5 rounded-full bg-muted-foreground"
                  title={CONSTANTS.GENDER.FEMALE}
                />
              ),
            )}
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="flex-1 p-0 bg-card dark:bg-card/80">
        {/* Info Grid */}
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Destinations */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1">
              <MapPin className="w-3 h-3" /> {CONSTANTS.LABELS.DESTINATIONS}
            </span>
            <span
              className="text-xs font-bold text-foreground truncate"
              title={group.destinations?.join(", ") ?? ""}
            >
              {group.destinations?.length
                ? group.destinations.join(", ")
                : "—"}
            </span>
          </div>

          {/* Created */}
          <div className="flex flex-col gap-1 sm:border-l border-border sm:pl-3 pt-2 sm:pt-0 border-t sm:border-t-0">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1">
              {CONSTANTS.LABELS.CREATED}
            </span>
            <span className="text-xs font-bold text-foreground">
              {formatShortDate(group.createdAt)}
            </span>
          </div>
        </div>

        {group.averageRoadDistanceKm != null && (
          <div className="px-4 pb-1 flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1">
              <MapPin className="w-3 h-3" /> {CONSTANTS.LABELS.AVG_DISTANCE}
            </span>
            <span className="text-xs font-bold text-foreground">
              {Number(group.averageRoadDistanceKm).toFixed(1)} km
            </span>
          </div>
        )}

        {/* Action Footer */}
        <div className="px-4 py-3 bg-muted/30 border-t border-border flex flex-col sm:flex-row items-center justify-end gap-3 sm:gap-0 transition-colors duration-300">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
            className="w-full sm:w-auto text-xs font-bold bg-foreground text-background px-6 py-2.5 sm:py-1.5 rounded-xl shadow-lg hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-1"
          >
            {CONSTANTS.BUTTONS.VIEW_MORE} <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

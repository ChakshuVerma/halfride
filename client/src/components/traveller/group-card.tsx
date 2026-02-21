import { Users, MapPin, ArrowRight } from "lucide-react";
import type { Group } from "./types";

const CONSTANTS = {
  LABELS: {
    SEATS: "seats",
    CAPACITY: "Capacity",
    DESTINATIONS: "Destinations",
    CREATED: "Created",
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
};

export function GroupCard({ group, onClick, isYourGroup = false }: GroupCardProps) {
  const percentFull = Math.round((group.groupSize / group.maxUsers) * 100);

  // Monochromatic/Neutral gradient for group cards (Light Gray)
  const avatarGradient =
    "bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-900 border border-black/5 dark:border-white/10";
  const accentColor = "text-violet-600 dark:text-violet-400";

  return (
    <div
      className={`group flex flex-col overflow-hidden rounded-[2rem] border shadow-sm transition-all duration-500 hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:-translate-y-1 dark:border-white/5 ${
        isYourGroup
          ? "border-violet-400 dark:border-violet-500 ring-2 ring-violet-200 dark:ring-violet-900/50 bg-violet-50/30 dark:bg-violet-950/20"
          : "border-white/60 hover:border-white/80 dark:border-white/5"
      }`}
    >
      {/* Top Section - Gray Background */}
      <div className="relative p-4 sm:p-5 bg-zinc-200/70 dark:bg-zinc-800 border-b border-black/5 dark:border-white/5 transition-colors duration-300">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div
              className={`relative w-16 h-16 rounded-2xl ${avatarGradient} flex items-center justify-center shadow-lg ring-4 ring-white dark:ring-zinc-900 group-hover:scale-105 transition-transform duration-500`}
            >
              <Users className={`w-8 h-8 ${accentColor}`} strokeWidth={2.5} />
            </div>

            <div className="flex flex-col pt-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-bold text-foreground leading-tight group-hover:text-primary transition-colors line-clamp-1">
                  {group.name}
                </h3>
                {isYourGroup && (
                  <span className="px-2 py-0.5 rounded-full bg-violet-600 text-white text-[10px] font-bold shadow-sm">
                    Your group
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                {/* Capacity Pill */}
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white text-violet-600 border border-zinc-200 text-[10px] font-bold dark:bg-zinc-800 dark:border-zinc-700 dark:text-violet-400 shadow-sm">
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
          <div className="h-2 w-full rounded-full bg-white border border-zinc-100 dark:bg-white/10 dark:border-white/5 overflow-hidden shadow-sm">
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
                className="w-1.5 h-1.5 rounded-full bg-blue-500"
                title={CONSTANTS.GENDER.MALE}
              />
            ))}
            {Array.from({ length: group.genderBreakdown.female }).map(
              (_, i) => (
                <div
                  key={`f-${i}`}
                  className="w-1.5 h-1.5 rounded-full bg-pink-500"
                  title={CONSTANTS.GENDER.FEMALE}
                />
              ),
            )}
          </div>
        </div>
      </div>

      {/* Bottom Section - White Background */}
      <div className="flex-1 p-0 bg-white dark:bg-black/20">
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
          <div className="flex flex-col gap-1 sm:border-l border-zinc-100 sm:pl-3 pt-2 sm:pt-0 border-t sm:border-t-0 dark:border-white/5">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1">
              {CONSTANTS.LABELS.CREATED}
            </span>
            <span className="text-xs font-bold text-foreground">
              {group.createdAt
                ? new Date(group.createdAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "—"}
            </span>
          </div>
        </div>

        {/* Action Footer */}
        <div className="px-4 py-3 bg-zinc-50/30 border-t border-zinc-100 dark:bg-zinc-900/30 dark:border-white/5 flex flex-col sm:flex-row items-center justify-end gap-3 sm:gap-0 transition-colors duration-300">
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

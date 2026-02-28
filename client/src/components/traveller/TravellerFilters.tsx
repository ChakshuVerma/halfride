import { ArrowUpDown, Mars, UsersRound, User, Venus } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger } from "../ui/select";
import { cn } from "@/lib/utils";
import type { ViewMode } from "./types";
import { VIEW_MODE } from "./types";

type TravellerFiltersProps = {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  sortBy: "distance" | "wait_time";
  onSortByChange: (value: "distance" | "wait_time") => void;
  genderFilter: string[];
  onToggleGender: (gender: string) => void;
  terminals: { id: string; name: string }[];
  terminalFilter: string[];
  onToggleTerminal: (id: string) => void;
  showTerminalFilters: boolean;
};

const TERMINAL_PREFIX_REGEX = /Terminal\s+/i;

const GENDER_VALUES = {
  MALE: "Male",
  FEMALE: "Female",
} as const;

const SORT_VALUES = {
  DISTANCE: "distance",
  WAIT_TIME: "wait_time",
} as const;

export function TravellerFilters({
  viewMode,
  onViewModeChange,
  sortBy,
  onSortByChange,
  genderFilter,
  onToggleGender,
  terminals,
  terminalFilter,
  onToggleTerminal,
  showTerminalFilters,
}: TravellerFiltersProps) {
  return (
    <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6 p-1">
      {/* LEFT: FILTERS */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full xl:w-auto">
        <div className="flex items-center p-1 bg-zinc-100 border border-zinc-200 rounded-xl">
          {[GENDER_VALUES.MALE, GENDER_VALUES.FEMALE].map((gender) => (
            <button
              key={gender}
              onClick={() => onToggleGender(gender)}
              className={cn(
                "px-3 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 border border-transparent",
                genderFilter.includes(gender)
                  ? "bg-white shadow-sm border-zinc-200 text-zinc-900"
                  : "text-zinc-400 hover:text-zinc-900 hover:bg-zinc-200/50",
              )}
            >
              {gender === GENDER_VALUES.MALE ? (
                <Mars className="w-3.5 h-3.5" />
              ) : (
                <Venus className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">{gender}</span>
            </button>
          ))}
        </div>

        {showTerminalFilters && terminals.length > 0 && (
          <>
            <div className="hidden sm:block w-px h-8 bg-zinc-200" />
            <div className="w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0 scrollbar-hide">
              <div className="flex items-center gap-2">
                {terminals.map((t) => {
                  const isActive = terminalFilter.includes(t.id);
                  return (
                    <button
                      key={t.id}
                      onClick={() => onToggleTerminal(t.id)}
                      className={cn(
                        "px-3 py-1.5 text-xs font-bold rounded-lg border transition-all whitespace-nowrap",
                        isActive
                          ? "bg-zinc-900 text-white border-zinc-900 shadow-md shadow-zinc-200"
                          : "bg-white text-zinc-500 border-zinc-200 hover:border-zinc-300 hover:text-zinc-900",
                      )}
                    >
                      <span className="sm:hidden">
                        {t.name.replace(TERMINAL_PREFIX_REGEX, "T")}
                      </span>
                      <span className="hidden sm:inline">{t.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {/* RIGHT: SORT & VIEW */}
      <div className="flex items-center justify-between gap-4 w-full xl:w-auto">
        <Select
          value={sortBy}
          onValueChange={(val) => onSortByChange(val as "distance" | "wait_time")}
        >
          <SelectTrigger className="h-10 w-[140px] bg-white border-zinc-200 rounded-xl text-xs font-bold text-zinc-700 hover:border-zinc-300 focus:ring-0">
            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-3.5 h-3.5 text-zinc-400" />
              <span>
                {sortBy === SORT_VALUES.DISTANCE ? "Distance" : "Wait Time"}
              </span>
            </div>
          </SelectTrigger>
          <SelectContent className="rounded-xl p-1 border-zinc-200 shadow-xl">
            <SelectItem
              value={SORT_VALUES.DISTANCE}
              className="rounded-lg text-xs font-medium focus:bg-zinc-100 focus:text-zinc-900"
            >
              Sort by Distance
            </SelectItem>
            <SelectItem
              value={SORT_VALUES.WAIT_TIME}
              className="rounded-lg text-xs font-medium focus:bg-zinc-100 focus:text-zinc-900"
            >
              Sort by Wait Time
            </SelectItem>
          </SelectContent>
        </Select>

        <div className="flex p-1 bg-zinc-100 border border-zinc-200 rounded-xl">
          <button
            onClick={() => onViewModeChange(VIEW_MODE.INDIVIDUAL)}
            className={cn(
              "p-2 rounded-lg transition-all",
              viewMode === VIEW_MODE.INDIVIDUAL
                ? "bg-white shadow-sm text-zinc-900 border border-zinc-200"
                : "text-zinc-400 hover:text-zinc-900",
            )}
          >
            <User className="w-4 h-4" />
          </button>
          <button
            onClick={() => onViewModeChange(VIEW_MODE.GROUP)}
            className={cn(
              "p-2 rounded-lg transition-all",
              viewMode === VIEW_MODE.GROUP
                ? "bg-white shadow-sm text-zinc-900 border border-zinc-200"
                : "text-zinc-400 hover:text-zinc-900",
            )}
          >
            <UsersRound className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}


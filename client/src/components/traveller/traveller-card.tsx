import { memo } from "react";
import {
  User,
  Clock,
  Plane,
  ArrowRight,
  Calendar,
  Sparkles,
} from "lucide-react";
import type { Traveller } from "./types";
import { formatDateAndTime, calculateWaitText } from "./utils";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";

const CONSTANTS = {
  GENDER: {
    MALE: "Male",
  },
};

type TravellerCardProps = {
  traveller: Traveller;
  onClick: () => void;
  hasListing: boolean;
  /** When true, shows a loading overlay (e.g. while fetching fresh data before opening modal). */
  isOpening?: boolean;
};

export const TravellerCard = memo(function TravellerCard({
  traveller,
  onClick,
  hasListing,
  isOpening = false,
}: TravellerCardProps) {
  const isMale = traveller.gender === CONSTANTS.GENDER.MALE;
  const isOwnListing = traveller.isOwnListing === true;

  // REVERTED: Using the original utility function
  const flightTime = formatDateAndTime(traveller.flightDateTime);
  const waitText = calculateWaitText(traveller.flightDateTime);

  // Format distance to 1 decimal place
  const distance = traveller.distanceFromUserKm?.toFixed(1);

  return (
    <div
      onClick={isOpening ? undefined : onClick}
      className={cn(
        "group relative flex flex-col w-full rounded-[2rem] overflow-hidden",
        isOpening && "pointer-events-none opacity-70",
        "shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_24px_rgba(0,0,0,0.08)]",
        "transition-all duration-300 ease-out hover:-translate-y-1 cursor-pointer",
        isOwnListing
          ? "border-2 border-primary ring-1 ring-ring bg-card dark:bg-card"
          : "bg-card border border-border",
      )}
    >
      {isOpening && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-[2rem] bg-card/80">
          <Spinner size="lg" className="text-primary" />
        </div>
      )}
      {/* 1. Identity Header */}
      <div className="p-5 pb-4 flex items-start gap-4">
        {/* Avatar with Status Ring */}
        <div className="relative">
          <div
            className={cn(
              "w-14 h-14 rounded-2xl flex items-center justify-center text-foreground border-2 border-border bg-muted group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-colors duration-300 overflow-hidden",
            )}
          >
            {traveller.photoURL ? (
              <img
                src={traveller.photoURL}
                alt={traveller.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-6 h-6" strokeWidth={2} />
            )}
          </div>
          {/* Online/Gender Indicator */}
          <div
            className={cn(
              "absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-[3px] border-background flex items-center justify-center",
              isMale ? "bg-primary" : "bg-muted-foreground",
            )}
          >
            {hasListing && (
              <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
            )}
          </div>
        </div>

        {/* Name & Tags */}
        <div className="flex-1 min-w-0 pt-0.5">
          <div className="flex justify-between items-start gap-2">
            <h3 className="font-bold text-lg text-foreground truncate leading-none mb-1.5">
              {traveller.name}
            </h3>
            {isOwnListing && (
              <span className="shrink-0 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold shadow-sm">
                Your listing
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground font-medium mb-2">
            @{traveller.username}
          </p>

          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted text-[11px] font-bold text-foreground uppercase tracking-wide border border-border">
              <Plane className="w-3 h-3" />
              {traveller.flightNumber}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary text-[11px] font-bold text-primary-foreground uppercase tracking-wide">
              <Clock className="w-3 h-3" />
              {waitText}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Visual Divider (Dashed Line) */}
      <div className="relative w-full h-px">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t-2 border-dashed border-border" />
        </div>
        <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-muted border-r border-border" />
        <div className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-muted border-l border-border" />
      </div>

      {/* 3. Journey Details (Boarding Pass Style) */}
      <div className="p-5 pt-4 bg-muted/50 space-y-5">
        {/* Route Visualization */}
        <div className="flex items-center justify-between gap-4">
          {/* Origin */}
          <div className="flex flex-col min-w-[60px]">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-0.5">
              Terminal
            </span>
            <span className="text-xl font-black text-foreground">
              {traveller.terminal}
            </span>
          </div>

          {/* Plane Path */}
          <div className="flex-1 flex flex-col items-center gap-1 opacity-40">
            <div className="w-full flex items-center gap-2">
              <div className="h-[2px] w-full bg-border rounded-full" />
              <Plane className="w-5 h-5 text-muted-foreground rotate-90 shrink-0" />
              <div className="h-[2px] w-full bg-border rounded-full" />
            </div>
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
              Direct
            </span>
          </div>

          {/* Destination */}
          <div className="flex flex-col text-right max-w-[50%]">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-0.5">
              Dest
            </span>
            <span className="text-lg font-black text-foreground leading-tight">
              {traveller.destination}
            </span>
          </div>
        </div>

        {/* Time & Action Footer */}
        <div className="flex items-end justify-between gap-4">
          <div className="flex items-center gap-3 bg-card border border-border rounded-xl px-3 py-2 shadow-sm flex-1 min-w-0">
            <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
            <div className="flex flex-col truncate">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">
                Departure
              </span>
              <span className="text-sm font-bold text-foreground leading-none truncate">
                {flightTime}
              </span>
            </div>
          </div>

          <button className="h-10 px-5 rounded-xl bg-primary text-primary-foreground text-xs font-bold flex items-center gap-2 shadow-lg group-hover:scale-105 group-hover:opacity-90 transition-all duration-300 shrink-0">
            View <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Distance Badge */}
        {hasListing && (
          <div className="absolute top-4 right-5 animate-in fade-in slide-in-from-right-4 z-10">
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-card border border-border shadow-sm">
              <Sparkles className="w-3 h-3 text-foreground fill-foreground" />
              <span className="text-[10px] font-bold text-foreground">
                {distance} km away
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

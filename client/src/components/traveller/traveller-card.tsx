import { User, MapPin, Clock, CalendarRange, ChevronRight } from "lucide-react"
import type { Traveller } from "./types"
import { formatWaitTime, formatFlightDateTime } from "./utils"

const CONSTANTS = {
  LABELS: {
    DESTINATION: "Dest",
    FLIGHT: "Flight",
    WAIT: "Wait",
    AWAY: "away",
  },
  UNITS: {
    KM: "km",
  },
  BUTTONS: {
    VIEW_MORE: "View More",
  },
  GENDER: {
    MALE: "Male",
  }
}

type TravellerCardProps = {
  traveller: Traveller
  onClick: () => void
}

export function TravellerCard({
  traveller,
  onClick,
}: TravellerCardProps) {
  const isMale = traveller.gender === CONSTANTS.GENDER.MALE
  
  // Subtle gradients and accents
  const cardBorder = isMale 
    ? "hover:border-blue-500/30 dark:hover:border-blue-400/30" 
    : "hover:border-pink-500/30 dark:hover:border-pink-400/30"
    
  const avatarBg = isMale
    ? "bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400"
    : "bg-pink-50 dark:bg-pink-950/30 text-pink-600 dark:text-pink-400"

  const flightTime = formatFlightDateTime(traveller.flightDateTime).split(',')[1].trim()
  const waitTime = formatWaitTime(traveller.flightDateTime)

  return (
    <div
      className={`
        group relative flex flex-col p-5 gap-5
        bg-white dark:bg-zinc-900/50 
        backdrop-blur-sm
        rounded-[1.5rem] 
        border border-black/5 dark:border-white/10
        shadow-sm hover:shadow-xl hover:shadow-black/5 dark:hover:shadow-black/20
        transition-all duration-300 ease-out
        hover:-translate-y-1
        ${cardBorder}
      `}
    >
      {/* Header Section */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3.5">
          {/* Avatar Area */}
          <div className={`
            relative w-14 h-14 rounded-2xl flex items-center justify-center 
            transition-transform duration-500 group-hover:scale-105
            ${avatarBg}
          `}>
             <User className="w-7 h-7" strokeWidth={2.5} />
             {/* Status Dot */}
             <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-[3px] border-white dark:border-zinc-900 ${isMale ? 'bg-blue-500' : 'bg-pink-500'} shadow-sm`}></span>
          </div>

          <div className="flex flex-col gap-0.5">
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50 leading-tight group-hover:text-primary transition-colors">
              {traveller.name}
            </h3>
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
               {traveller.username}
            </span>
             <div className="flex flex-wrap items-center gap-1 mt-1">
                <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800/50">
                    {traveller.flightNumber}
                </span>
                {traveller.tags?.slice(0, 2).map((tag, i) => (
                    <span key={i} className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500 px-1.5 py-0.5 rounded-md bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800">
                        #{tag}
                    </span>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-3 gap-2 py-3 border-t border-black/5 dark:border-white/5 border-dashed">
         {/* Destination */}
         <div className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {CONSTANTS.LABELS.DESTINATION}
            </span>
            <span className="text-xs font-bold text-zinc-700 dark:text-zinc-200 truncate pr-1" title={traveller.destination}>
                {traveller.destination}
            </span>
         </div>
         
         {/* Flight Time */}
         <div className="flex flex-col gap-1 pl-2 border-l border-black/5 dark:border-white/5">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400 flex items-center gap-1">
                <Clock className="w-3 h-3" /> {CONSTANTS.LABELS.FLIGHT}
            </span>
            <span className="text-xs font-bold text-zinc-700 dark:text-zinc-200">
                {flightTime}
            </span>
         </div>

         {/* Wait Time */}
         <div className="flex flex-col gap-1 pl-2 border-l border-black/5 dark:border-white/5">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400 flex items-center gap-1">
                <CalendarRange className="w-3 h-3" /> {CONSTANTS.LABELS.WAIT}
            </span>
            <span className="text-xs font-bold text-zinc-700 dark:text-zinc-200">
                {waitTime}
            </span>
         </div>
      </div>

      {/* Footer/Distance */}
      <div className="flex items-center justify-between pt-0 mt-auto">
         <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
            <MapPin className="w-3 h-3 text-zinc-400" />
            <span className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-300">
                {traveller.distanceFromUserKm} {CONSTANTS.UNITS.KM} {CONSTANTS.LABELS.AWAY}
            </span>
         </div>
         <button 
            onClick={onClick}
            className="text-xs font-bold bg-zinc-900 text-white dark:bg-white dark:text-black px-4 py-2 rounded-xl shadow-lg hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-1"
          >
              {CONSTANTS.BUTTONS.VIEW_MORE} <ChevronRight className="w-3 h-3" />
          </button>
      </div>
    </div>
  )
}


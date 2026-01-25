import { Plane, User, MapPin, Clock, CalendarRange } from "lucide-react"
import type { Traveller } from "./types"
import { formatWaitTime, formatFlightDateTime } from "./utils"

type TravellerCardProps = {
  traveller: Traveller
  onClick: () => void
}

const TEXTS = {
  LABELS: {
    DESTINATION: "Destination",
    FLIGHT_TIME: "Flight",
    WAIT_TIME: "Wait",
    DISTANCE: "Distance",
    CONNECT: "Connect"
  },
  UNITS: {
    KM: "km away",
  }
}

export function TravellerCard({
  traveller,
  onClick,
}: TravellerCardProps) {
  const isMale = traveller.gender === "Male"
  
  // Gender-specific background gradient
  const avatarGradient = isMale 
    ? "bg-linear-to-br from-blue-500 to-indigo-600 shadow-blue-500/25 border border-blue-600/10" 
    : "bg-linear-to-br from-pink-500 to-rose-600 shadow-pink-500/25 border border-pink-600/10"
  
  // Icon should be white on colored background
  const accentColor = "text-white"
  
  // Badge with black text but darker colored background
  const genderBadge = isMale 
    ? "text-black bg-blue-300 border-blue-400 dark:text-white dark:bg-blue-700 dark:border-blue-600"
    : "text-black bg-pink-300 border-pink-400 dark:text-white dark:bg-pink-700 dark:border-pink-600"

  return (
    <div
      className="group flex flex-col overflow-hidden rounded-[2rem] border border-white/60 shadow-sm transition-all duration-500 hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:border-white/80 hover:-translate-y-1 dark:border-white/5"
    >
      {/* Top Section - Gray Background */}
      <div className="relative p-4 sm:p-5 bg-zinc-200/70 dark:bg-zinc-800 border-b border-black/5 dark:border-white/5 transition-colors duration-300">
        
        {/* Header: Avatar & Main Info */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className={`relative w-16 h-16 rounded-2xl ${avatarGradient} flex items-center justify-center shadow-lg ring-4 ring-white dark:ring-zinc-900 group-hover:scale-105 transition-transform duration-500`}>
              <User className={`w-8 h-8 ${accentColor}`} strokeWidth={2.5} />
             </div>
            
            <div className="flex flex-col pt-1">
              <h3 className="text-lg font-bold text-foreground leading-tight group-hover:text-primary transition-colors">
                {traveller.name}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${genderBadge}`}>
                  {traveller.gender}
                </span>
                 {/* Flight Pill */}
                 <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white border border-zinc-200 text-[10px] font-bold text-zinc-600 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300 shadow-sm">
                  <Plane className="w-3 h-3" />
                  {traveller.flightNumber}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bio Section */}
        {traveller.bio && (
            <p className="mt-4 text-sm text-muted-foreground leading-relaxed line-clamp-2">
                {traveller.bio}
            </p>
        )}

        {/* Tags Section */}
        {traveller.tags && traveller.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
                {traveller.tags.slice(0, 3).map(tag => (
                    <span key={tag} className="text-[10px] font-semibold px-2.5 py-1 rounded-lg bg-white border border-black/5 text-zinc-600 shadow-sm dark:bg-zinc-800 dark:text-zinc-400 dark:border-white/5">
                        #{tag}
                    </span>
                ))}
            </div>
        )}
      </div>

      {/* Bottom Section - White Background */}
      <div className="flex-1 p-0 bg-white dark:bg-black/20">
        {/* Info Grid */}
        <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
           {/* Destination */}
           <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {TEXTS.LABELS.DESTINATION}
              </span>
              <span className="text-xs font-bold text-foreground truncate" title={traveller.destination}>
                  {traveller.destination}
              </span>
           </div>

           {/* Time */}
           <div className="flex flex-col gap-1 sm:border-l border-zinc-100 sm:pl-3 pt-2 sm:pt-0 border-t sm:border-t-0 dark:border-white/5">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {TEXTS.LABELS.FLIGHT_TIME}
              </span>
              <span className="text-xs font-bold text-foreground">
                  {formatFlightDateTime(traveller.flightDateTime).split(',')[1]} 
              </span>
           </div>
           
           {/* Wait */}
           <div className="flex flex-col gap-1 sm:border-l border-zinc-100 sm:pl-3 pt-2 sm:pt-0 border-t sm:border-t-0 dark:border-white/5">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1">
                 <CalendarRange className="w-3 h-3" /> {TEXTS.LABELS.WAIT_TIME}
              </span>
              <span className="text-xs font-bold text-foreground">
                  {formatWaitTime(traveller.flightDateTime)}
              </span>
           </div>
        </div>
        
        {/* Action Footer */}
        <div className="px-4 py-3 bg-zinc-50/30 border-t border-zinc-100 dark:bg-zinc-900/30 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0 transition-colors duration-300">
           <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 w-full sm:w-auto justify-center sm:justify-start">
              <MapPin className="w-3.5 h-3.5 text-primary/80" />
              {traveller.distanceFromUserKm} {TEXTS.UNITS.KM}
           </span>
           <button 
             onClick={(e) => {
               e.stopPropagation();
               onClick();
             }}
             className="w-full sm:w-auto text-xs font-bold bg-foreground text-background px-6 py-2.5 sm:py-1.5 rounded-xl shadow-lg hover:opacity-90 active:scale-[0.98] transition-all"
           >
              View More
           </button>
        </div>
      </div>
    </div>
  )
}

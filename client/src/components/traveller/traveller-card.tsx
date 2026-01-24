import { Plane, User, MapPin, Clock, CalendarRange, CheckCircle2 } from "lucide-react"
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
  
  const avatarGradient = isMale 
    ? "bg-linear-to-br from-blue-500 to-indigo-600 shadow-blue-500/25" 
    : "bg-linear-to-br from-rose-500 to-pink-600 shadow-rose-500/25"
    
  // Using a soft color for the gender badge
  const genderColor = isMale ? "text-blue-600 bg-blue-50 border-blue-100" : "text-pink-600 bg-pink-50 border-pink-100"

  return (
    <div
      className="group relative flex flex-col overflow-hidden rounded-[2rem] border border-white/60 bg-white/40 backdrop-blur-xl shadow-sm transition-all duration-500 hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:border-white/80 hover:-translate-y-1 cursor-pointer dark:bg-zinc-900/40 dark:border-white/5"
      onClick={onClick}
    >
      {/* Top Banner Gradient Opacity */}
      <div className={`absolute top-0 left-0 right-0 h-24 opacity-10 ${avatarGradient}`} />

      <div className="relative p-5 pb-0 flex flex-col gap-4">
        {/* Header: Avatar & Main Info */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className={`relative w-16 h-16 rounded-2xl ${avatarGradient} flex items-center justify-center text-white shadow-lg ring-4 ring-white/50 dark:ring-black/20 group-hover:scale-105 transition-transform duration-500`}>
              <User className="w-8 h-8" strokeWidth={2.5} />
              {traveller.isVerified && (
                <div className="absolute -bottom-1 -right-1 bg-white dark:bg-zinc-900 rounded-full p-0.5 shadow-sm">
                  <CheckCircle2 className="w-5 h-5 text-sky-500 fill-sky-50" />
                </div>
              )}
            </div>
            
            <div className="flex flex-col pt-1">
              <h3 className="text-lg font-bold text-foreground leading-tight group-hover:text-primary transition-colors">
                {traveller.name}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${genderColor}`}>
                  {traveller.gender}
                </span>
                 {/* Flight Pill */}
                 <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-zinc-100 border border-zinc-200 text-[10px] font-bold text-zinc-600 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300">
                  <Plane className="w-3 h-3" />
                  {traveller.flightNumber}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bio Section (New) */}
        {traveller.bio && (
            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                {traveller.bio}
            </p>
        )}

        {/* Tags Section (New) */}
        {traveller.tags && traveller.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
                {traveller.tags.slice(0, 3).map(tag => (
                    <span key={tag} className="text-[10px] font-semibold px-2.5 py-1 rounded-lg bg-white/60 border border-black/5 text-zinc-600 shadow-sm dark:bg-zinc-800/60 dark:text-zinc-400 dark:border-white/5">
                        #{tag}
                    </span>
                ))}
            </div>
        )}
      </div>

      {/* Info Grid */}
      <div className="mt-5 p-4 bg-white/50 border-t border-white/60 dark:bg-black/20 dark:border-white/5 grid grid-cols-3 gap-3">
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
         <div className="flex flex-col gap-1 border-l border-black/5 pl-3 dark:border-white/5">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1">
                <Clock className="w-3 h-3" /> {TEXTS.LABELS.FLIGHT_TIME}
            </span>
            <span className="text-xs font-bold text-foreground">
                {formatFlightDateTime(traveller.flightDateTime).split(',')[1]} 
                {/* Just showing time/date part roughly or format properly if needed */}
            </span>
         </div>
         
         {/* Distance/Wait (Combined or singular) */}
         <div className="flex flex-col gap-1 border-l border-black/5 pl-3 dark:border-white/5">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1">
               <CalendarRange className="w-3 h-3" /> {TEXTS.LABELS.WAIT_TIME}
            </span>
            <span className="text-xs font-bold text-green-600 dark:text-green-400">
                {formatWaitTime(traveller.flightDateTime)}
            </span>
         </div>
      </div>
      
      {/* Action Footer */}
      <div className="px-4 py-3 bg-white/80 border-t border-white/60 dark:bg-zinc-900/30 dark:border-white/5 flex items-center justify-between">
         <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <MapPin className="w-3 h-3 text-primary" />
            {traveller.distanceFromUserKm} {TEXTS.UNITS.KM}
         </span>
         <button className="text-xs font-bold bg-primary text-primary-foreground px-4 py-1.5 rounded-xl shadow-lg shadow-primary/20 hover:bg-primary/90 transition-colors">
            {TEXTS.LABELS.CONNECT}
         </button>
      </div>
    </div>
  )
}

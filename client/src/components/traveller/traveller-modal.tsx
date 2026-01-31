import { useEffect, useState, useMemo } from "react"
import { DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog"
import { Plane, User, Clock, Navigation, Info, XCircle, CheckCircle2, Loader2, Heart } from "lucide-react"
import type { Traveller } from "./types"
import { useFlightTrackerApi, type FlightArrivalInfo } from "@/hooks/useFlightTrackerApi"
import { calculateWaitText } from "./utils"

const CONSTANTS = {
  STATUS_KEYWORDS: {
    CANCELLED: "cancelled",
    NOT_YET_STARTED: "not yet started",
    EARLY: "early",
    LATE: "late",
  },
  MESSAGES: {
    TRACKING_UNAVAILABLE: "Live tracking currently unavailable",
    SYNCING: "Syncing Radar",
    RETRY: "Retry Sync",
    SYNCED: "Synced",
    AGO: "ago",
    DEP: "DEP",
    ORIGIN: "Origin",
    ARR: "ARR",
    TERM_PREFIX: "T",
    TERM_UNKNOWN: "Term --",
    ARRIVAL: "Arrival",
    GATE_BELT: "Gate & Belt",
    GATE_PREFIX: "G-",
    GATE_TBD: "Gate TBD",
    BELT: "Belt",
    DISTANCE: "Distance",
    KM: "km",
    WAIT_TIME: "Wait Time",
    LANDED: "Landed",
    ARRIVED: "Arrived",
    INTERESTS: "Interests & Vibes",
    CONNECT: "Connect with",
  },
  COLORS: {
    CANCELLED: { text: "text-rose-500", bg: "bg-rose-500/10", border: "border-rose-500/20" },
    LANDED: { text: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20" },
    NOT_STARTED: { text: "text-slate-500", bg: "bg-slate-500/10", border: "border-slate-500/20" },
    EARLY: { text: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
    LATE: { text: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20" },
    DEFAULT: { text: "text-indigo-500", bg: "bg-indigo-500/10", border: "border-indigo-500/20" },
  }
};

type TravellerModalProps = { traveller: Traveller }

const getStatusStyles = (info?: FlightArrivalInfo) => {
  const status = info?.statusShort?.toLowerCase() || "";
  if (status.includes(CONSTANTS.STATUS_KEYWORDS.CANCELLED)) return { ...CONSTANTS.COLORS.CANCELLED, icon: <XCircle className="w-4 h-4" /> };
  if (info?.isLanded) return { ...CONSTANTS.COLORS.LANDED, icon: <CheckCircle2 className="w-4 h-4" /> };
  if (status.includes(CONSTANTS.STATUS_KEYWORDS.NOT_YET_STARTED)) return { ...CONSTANTS.COLORS.NOT_STARTED, icon: <Clock className="w-4 h-4" /> };
  if (info?.timingCategory === CONSTANTS.STATUS_KEYWORDS.EARLY) return { ...CONSTANTS.COLORS.EARLY, icon: <Plane className="w-4 h-4" /> };
  if (info?.timingCategory === CONSTANTS.STATUS_KEYWORDS.LATE) return { ...CONSTANTS.COLORS.LATE, icon: <Clock className="w-4 h-4" /> };
  return { ...CONSTANTS.COLORS.DEFAULT, icon: <Plane className="w-4 h-4" /> };
};

export function TravellerModal({ traveller }: TravellerModalProps) {
  const { fetchFlightTrackerByFlightNumber, loading: apiLoading } = useFlightTrackerApi()
  const [flightInfo, setFlightInfo] = useState<FlightArrivalInfo | undefined>(undefined)
  const [flightError, setFlightError] = useState<string | null>(null)
  const [now, setNow] = useState(Date.now())

  const isLoading = apiLoading || (!flightInfo && !flightError);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  const fetchArrivalInfo = async () => {
    try {
      setFlightError(null)
      const dateToUse = traveller.flightDepartureTime || traveller.flightDateTime
      const info = await fetchFlightTrackerByFlightNumber(traveller.flightNumber, dateToUse)
      setFlightInfo(info)
    } catch {
      setFlightError(CONSTANTS.MESSAGES.TRACKING_UNAVAILABLE)
    }
  }

  useEffect(() => { void fetchArrivalInfo() }, [traveller.id])



  const s = useMemo(() => getStatusStyles(flightInfo), [flightInfo])

  return (
    <div className="p-4 sm:p-6 space-y-6 max-h-[90vh] overflow-y-auto selection:bg-primary/10">
      {/* 1. Header (Static User Info) */}
      <DialogHeader className="space-y-0 pb-4 border-b border-border/10">
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ring-4 ring-background ${traveller.gender === "Male" ? "bg-indigo-600 shadow-indigo-500/20" : "bg-rose-600 shadow-rose-500/20"}`}>
            <User className="w-7 h-7 text-white" strokeWidth={2.5} />
          </div>
          <div className="flex-1 min-w-0">
            <DialogTitle className="text-xl font-black tracking-tight">{traveller.name}</DialogTitle>
            <DialogDescription className="flex items-center gap-2 text-xs font-bold mt-1">
              <span className="text-primary tracking-widest uppercase">#{traveller.flightNumber}</span>
              <span className="text-muted-foreground/30">•</span>
              <span className="text-muted-foreground flex items-center gap-1">
                <Navigation className="w-3 h-3" /> {traveller.destination}
              </span>
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      {/* 2. Dynamic Content Area */}
      <div className="min-h-[380px] flex flex-col justify-center">
        {isLoading ? (
          <div className="flex flex-col items-center gap-4 py-16 animate-in fade-in duration-300">
            <Loader2 className="w-10 h-10 animate-spin text-primary/30" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/30">{CONSTANTS.MESSAGES.SYNCING}</span>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            
            {/* Status Card (Handles Success/Error internally) */}
            <div className={`relative rounded-[2rem] border overflow-hidden min-h-[160px] flex flex-col justify-center transition-colors duration-500 ${flightInfo ? `${s.bg} ${s.border}` : 'bg-muted/5 border-border/10'}`}>
              {flightError ? (
                <div className="flex flex-col items-center gap-2 px-8 text-center py-8">
                  <Info className="w-6 h-6 text-muted-foreground/20" />
                  <p className="text-[11px] font-bold text-muted-foreground/50 uppercase tracking-widest">{flightError}</p>
                  <button onClick={fetchArrivalInfo} className="text-[9px] font-black uppercase text-primary mt-2 underline">{CONSTANTS.MESSAGES.RETRY}</button>
                </div>
              ) : flightInfo && (
                <div className="p-5 sm:p-6 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-wider ${s.bg} ${s.border} ${s.text}`}>
                      {s.icon} {flightInfo.statusShort}
                    </div>
                    <div className="text-[9px] font-bold text-muted-foreground/40 uppercase">
                      {CONSTANTS.MESSAGES.SYNCED} {Math.floor((now - (flightInfo.lastUpdatedAt || 0)) / 60000)}m {CONSTANTS.MESSAGES.AGO}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-6 px-2">
                    <div className="text-center font-black">
                       <div className="text-lg">{CONSTANTS.MESSAGES.DEP}</div>
                       <div className="text-[8px] text-muted-foreground/40 uppercase">{CONSTANTS.MESSAGES.ORIGIN}</div>
                    </div>
                    <div className="flex-1 relative h-px bg-current opacity-10">
                       <div className={`absolute top-1/2 -translate-y-1/2 p-2 rounded-full bg-background border-2 shadow-sm transition-all duration-700 ${s.text} ${s.border} ${flightInfo.isLanded ? 'right-0' : 'left-1/2'}`}>
                          <Plane className="w-3.5 h-3.5 fill-current" />
                       </div>
                    </div>
                    <div className="text-center font-black">
                       <div className="text-lg">{CONSTANTS.MESSAGES.ARR}</div>
                       <div className="text-[8px] text-muted-foreground/40 uppercase">{flightInfo.terminal ? `${CONSTANTS.MESSAGES.TERM_PREFIX}${flightInfo.terminal}` : CONSTANTS.MESSAGES.TERM_UNKNOWN}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6 pt-4 border-t border-current/5">
                    <div>
                      <div className="text-[9px] font-black text-muted-foreground/40 uppercase">{CONSTANTS.MESSAGES.ARRIVAL}</div>
                      <div className={`text-lg font-black tabular-nums ${s.text}`}>{flightInfo.arrivalTimeLocal}</div>
                      {flightInfo.timingLabel && <div className="text-[9px] font-bold opacity-60 uppercase">{flightInfo.timingLabel}</div>}
                    </div>
                    <div className="text-right">
                      <div className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-tighter">{CONSTANTS.MESSAGES.GATE_BELT}</div>
                      <div className="text-sm font-black">{flightInfo.gate ? `${CONSTANTS.MESSAGES.GATE_PREFIX}${flightInfo.gate}` : CONSTANTS.MESSAGES.GATE_TBD}</div>
                      {flightInfo.baggage && <div className="text-[10px] font-bold text-muted-foreground/60 uppercase">{CONSTANTS.MESSAGES.BELT} {flightInfo.baggage}</div>}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-3xl bg-muted/10 border border-border/10">
                <div className="text-[9px] font-black text-muted-foreground/40 uppercase mb-1 tracking-widest">{CONSTANTS.MESSAGES.DISTANCE}</div>
                <span className="text-xl font-black tracking-tight">{traveller.distanceFromUserKm} <span className="text-xs font-normal">{CONSTANTS.MESSAGES.KM}</span></span>
              </div>
              <div className="p-4 rounded-3xl bg-muted/10 border border-border/10">
                <div className="text-[9px] font-black text-muted-foreground/40 uppercase mb-1 tracking-widest">{CONSTANTS.MESSAGES.WAIT_TIME}</div>
                <span className={`text-xl font-black tracking-tight ${calculateWaitText(traveller.flightDateTime) === CONSTANTS.MESSAGES.LANDED ? 'text-blue-500' : ''}`}>
                  {calculateWaitText(traveller.flightDateTime)}
                </span>
              </div>
            </div>

            {/* Interests Section */}
            {traveller.tags && traveller.tags.length > 0 && (
              <div className="space-y-3 px-1">
                <div className="flex items-center gap-2 text-[9px] font-black text-muted-foreground/40 uppercase tracking-[0.2em]">
                  <Heart className="w-3 h-3" /> {CONSTANTS.MESSAGES.INTERESTS}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {traveller.tags.map((tag, i) => (
                    <span key={i} className="text-[10px] font-bold px-3 py-1 rounded-full bg-muted/20 border border-border/10 text-muted-foreground/80">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Action Button */}
            <button className="w-full py-4.5 bg-primary text-primary-foreground rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:brightness-105 active:scale-[0.98] transition-all">
              {CONSTANTS.MESSAGES.CONNECT} {traveller.name.split(' ')[0]}
            </button>

          </div>
        )}
      </div>
    </div>
  )
}
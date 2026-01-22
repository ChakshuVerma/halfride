import { useEffect, useMemo, useState } from "react"

import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { ScrollArea } from "../ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog"
import { Users, UsersRound, Plane, User } from "lucide-react"

type Traveller = {
  id: string
  name: string
  gender: "Male" | "Female" | "Other"
  destination: string
  airportName: string
  flightDateTime: Date
  terminal: string
  flightNumber: string
  distanceFromUserKm: number
}

type Group = {
  id: string
  name: string
  gender: "Male" | "Female" | "Other"
  destination: string
  airportName: string
  flightDateTime: Date
  terminal: string
  flightNumber: string
  // for groups we use distanceFromUserKm as the minimum of all member distances (dummy for now)
  distanceFromUserKm: number
  // current number of members in the group
  groupSize: number
  // maximum capacity of the group
  maxUsers: number
  // simple gender distribution inside the group (only male/female for now)
  genderBreakdown: {
    male: number
    female: number
  }
}

// Dummy data for now – this should eventually come from your backend
const dummyTravellers: Traveller[] = [
  {
    id: "t1",
    name: "Aarav Sharma",
    gender: "Male",
    destination: "Delhi (DEL)",
    airportName: "Indira Gandhi International Airport",
    flightDateTime: new Date(new Date().getTime() + 90 * 60 * 1000),
    terminal: "T1",
    // Example real flight number from FlightStats departures list
    flightNumber: "AI 111",
    distanceFromUserKm: 12,
  },
  {
    id: "t2",
    name: "Sara Khan",
    gender: "Female",
    destination: "Mumbai (BOM)",
    airportName: "Indira Gandhi International Airport",
    flightDateTime: new Date(new Date().getTime() + 3 * 60 * 60 * 1000),
    terminal: "T1",
    flightNumber: "AI 853",
    distanceFromUserKm: 25,
  },
  {
    id: "t3",
    name: "Rohan Mehta",
    gender: "Male",
    destination: "Bengaluru (BLR)",
    airportName: "Kempegowda International Airport",
    flightDateTime: new Date(new Date().getTime() + 45 * 60 * 1000),
    terminal: "T2",
    flightNumber: "AI 185",
    distanceFromUserKm: 8,
  },
  {
    id: "t4",
    name: "Neha Verma",
    gender: "Female",
    destination: "Hyderabad (HYD)",
    airportName: "Indira Gandhi International Airport",
    flightDateTime: new Date(new Date().getTime() + 2 * 60 * 60 * 1000),
    terminal: "T3",
    flightNumber: "AI 443",
    distanceFromUserKm: 16,
  },
  {
    id: "t5",
    name: "Kabir Singh",
    gender: "Male",
    destination: "Chennai (MAA)",
    airportName: "Kempegowda International Airport",
    flightDateTime: new Date(new Date().getTime() + 4 * 60 * 60 * 1000),
    terminal: "T2",
    flightNumber: "AI 485",
    distanceFromUserKm: 22,
  },
  {
    id: "t6",
    name: "Ananya Iyer",
    gender: "Female",
    destination: "Pune (PNQ)",
    airportName: "Indira Gandhi International Airport",
    flightDateTime: new Date(new Date().getTime() + 30 * 60 * 1000),
    terminal: "T1",
    flightNumber: "AI 1706",
    distanceFromUserKm: 10,
  },
]

const dummyGroups: Group[] = [
  {
    id: "g1",
    name: "Friends Trip – Goa",
    gender: "Other",
    destination: "Goa (GOI)",
    airportName: "Indira Gandhi International Airport",
    flightDateTime: new Date(new Date().getTime() + 2 * 60 * 60 * 1000),
    terminal: "T1",
    flightNumber: "AI 473",
    distanceFromUserKm: 18,
    groupSize: 4,
    maxUsers: 5,
    genderBreakdown: {
      male: 2,
      female: 2,
    },
  },
  {
    id: "g2",
    name: "Family Vacation – Singapore",
    gender: "Other",
    destination: "Singapore (SIN)",
    airportName: "Kempegowda International Airport",
    flightDateTime: new Date(new Date().getTime() + 5 * 60 * 60 * 1000),
    terminal: "T2",
    flightNumber: "AI 111",
    distanceFromUserKm: 30,
    groupSize: 3,
    maxUsers: 4,
    genderBreakdown: {
      male: 1,
      female: 2,
    },
  },
  {
    id: "g3",
    name: "Office Offsite – Jaipur",
    gender: "Other",
    destination: "Jaipur (JAI)",
    airportName: "Indira Gandhi International Airport",
    flightDateTime: new Date(new Date().getTime() + 75 * 60 * 1000),
    terminal: "T1",
    flightNumber: "AI 715",
    distanceFromUserKm: 14,
    groupSize: 6,
    maxUsers: 8,
    genderBreakdown: {
      male: 4,
      female: 2,
    },
  },
  {
    id: "g4",
    name: "College Reunion – Kochi",
    gender: "Other",
    destination: "Kochi (COK)",
    airportName: "Kempegowda International Airport",
    flightDateTime: new Date(new Date().getTime() + 2.5 * 60 * 60 * 1000),
    terminal: "T2",
    flightNumber: "AI 485",
    distanceFromUserKm: 19,
    groupSize: 5,
    maxUsers: 6,
    genderBreakdown: {
      male: 3,
      female: 2,
    },
  },
]

function formatWaitTime(flightDateTime: Date) {
  const now = new Date()
  const diffMs = flightDateTime.getTime() - now.getTime()

  if (diffMs <= 0) return "Departed"

  const diffMinutes = Math.round(diffMs / 60000)
  const hours = Math.floor(diffMinutes / 60)
  const minutes = diffMinutes % 60

  if (hours === 0) return `${minutes} min`
  if (minutes === 0) return `${hours}h`

  return `${hours}h ${minutes}m`
}

function formatFlightDateTime(flightDateTime: Date) {
  return flightDateTime.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

type ViewMode = "individual" | "group"
type SelectedEntity =
  | { type: "traveller"; data: Traveller }
  | { type: "group"; data: Group }
  | null

type FlightArrivalInfo = {
  arrivalTimeLocal: string
  lastUpdatedAt: number
  etaLocal: string
  statusShort?: string
  statusDetail?: string
  isLanded: boolean
  timingLabel?: string
  timingCategory?: "early" | "on_time" | "late"
  timingDeltaMinutes?: number
}

// Backend proxy endpoint (server calls FlightStats to avoid CORS issues)
const FLIGHT_STATUS_URL = "/api/public/flight-status"

const TerminalTravellers = () => {
  const [selectedAirport, setSelectedAirport] = useState<string | undefined>(undefined)
  const [selectedTerminal, setSelectedTerminal] = useState<string | undefined>(undefined)
  const [viewMode, setViewMode] = useState<ViewMode>("individual")
  const [selectedEntity, setSelectedEntity] = useState<SelectedEntity>(null)
  const [flightInfoByTraveller, setFlightInfoByTraveller] = useState<
    Record<string, FlightArrivalInfo | undefined>
  >({})
  const [isRefreshingFlight, setIsRefreshingFlight] = useState(false)
  const [flightError, setFlightError] = useState<string | null>(null)

  const airports = useMemo(() => {
    const all = [...dummyTravellers, ...dummyGroups].map((item) => item.airportName)
    return Array.from(new Set(all)).sort()
  }, [])

  const activeAirport = selectedAirport || airports[0]

  const terminals = useMemo(() => {
    const all = [...dummyTravellers, ...dummyGroups]
      .filter((item) => item.airportName === activeAirport)
      .map((item) => item.terminal)
    return Array.from(new Set(all)).sort()
  }, [activeAirport])

  const activeTerminal = selectedTerminal || terminals[0]

  const airportTerminalCombos = useMemo(
    () => {
      const all = [...dummyTravellers, ...dummyGroups].map((item) => ({
        airportName: item.airportName,
        terminal: item.terminal,
      }))
      const unique = new Map<string, { airportName: string; terminal: string }>()
      all.forEach((combo) => {
        const key = `${combo.airportName}__${combo.terminal}`
        if (!unique.has(key)) {
          unique.set(key, combo)
        }
      })
      return Array.from(unique.values())
    },
    [],
  )

  const travellersForTerminal = useMemo(
    () =>
      dummyTravellers.filter(
        (t) => t.airportName === activeAirport && t.terminal === activeTerminal,
      ),
    [activeAirport, activeTerminal],
  )

  const groupsForTerminal = useMemo(
    () =>
      dummyGroups.filter(
        (g) => g.airportName === activeAirport && g.terminal === activeTerminal,
      ),
    [activeAirport, activeTerminal],
  )

  const activeTravellerId =
    selectedEntity && selectedEntity.type === "traveller" ? selectedEntity.data.id : null

  const fetchArrivalInfo = async (travellerId: string) => {
    try {
      setIsRefreshingFlight(true)
      setFlightError(null)
      const traveller = dummyTravellers.find((t) => t.id === travellerId)
      const flightDate = traveller?.flightDateTime
      const flightNumber = traveller?.flightNumber

      if (!traveller || !flightDate || !flightNumber) {
        throw new Error("Traveller or flight info not found")
      }

      const flightDateStr = `${flightDate.getFullYear()}-${String(flightDate.getMonth() + 1).padStart(
        2,
        "0",
      )}-${String(flightDate.getDate()).padStart(2, "0")}` // local YYYY-MM-DD
      const params = new URLSearchParams({
        flightNumber,
        date: flightDateStr,
      })

      const response = await fetch(`${FLIGHT_STATUS_URL}?${params.toString()}`)
      if (!response.ok) {
        throw new Error("Failed to fetch flight status")
      }
      const json = await response.json()

      // Our backend wraps the upstream JSON as { ok, data }, and the upstream JSON itself
      // has the shape { data: { schedule, status, flightNote, ... } }
      const upstream = json?.data
      const inner = upstream?.data ?? upstream
      const schedule = inner?.schedule
      const statusInfo = inner?.status
      const flightNote = inner?.flightNote

      const scheduledIso: string | undefined = schedule?.scheduledArrival
      const estimatedIso: string | undefined = schedule?.estimatedActualArrival

      // Try to read an ISO arrival time from the API response; fall back to scheduled arrival
      const isoArrival: string | undefined = estimatedIso || scheduledIso

      if (!isoArrival) {
        throw new Error("Arrival time not available")
      }

      const arrivalDate = new Date(isoArrival)
      const arrivalTimeLocal = arrivalDate.toLocaleString(undefined, {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })

      const etaLocal = arrivalTimeLocal
      const statusShort: string | undefined =
        statusInfo?.status || flightNote?.phase || flightNote?.message
      const statusDetail: string | undefined =
        statusInfo?.statusDescription || undefined

      const isLanded = Boolean(
        inner?.isLanded || flightNote?.landed || statusInfo?.statusCode === "L",
      )

      let timingCategory: "early" | "on_time" | "late" | undefined
      let timingLabel: string | undefined
      let timingDeltaMinutes: number | undefined

      if (!isLanded && scheduledIso && estimatedIso) {
        const sched = new Date(scheduledIso)
        const est = new Date(estimatedIso)
        const diffMinutes = Math.round((est.getTime() - sched.getTime()) / 60000)
        timingDeltaMinutes = diffMinutes

        const abs = Math.abs(diffMinutes)
        if (abs <= 5) {
          timingCategory = "on_time"
          timingLabel = "On time"
        } else if (diffMinutes > 5) {
          timingCategory = "late"
          timingLabel = `Delayed by ${abs} min`
        } else if (diffMinutes < -5) {
          timingCategory = "early"
          timingLabel = `Arriving ${abs} min early`
        }
      }

      const now = Date.now()
      setFlightInfoByTraveller((prev) => ({
        ...prev,
        [travellerId]: {
          arrivalTimeLocal,
          lastUpdatedAt: now,
          etaLocal,
          statusShort,
          statusDetail,
          isLanded,
          timingCategory,
          timingLabel,
          timingDeltaMinutes,
        },
      }))
    } catch {
      setFlightError("Could not refresh flight arrival time.")
    } finally {
      setIsRefreshingFlight(false)
    }
  }

  // Auto-fetch once when opening a traveller modal if we don't have data yet
  useEffect(() => {
    if (activeTravellerId && !flightInfoByTraveller[activeTravellerId] && !isRefreshingFlight) {
      void fetchArrivalInfo(activeTravellerId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTravellerId])

  return (
    <>
      <style>{`
        @keyframes slideInFromLeft {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes slideInFromRight {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
      <div className="flex items-center justify-center min-h-[50vh] p-8 w-full">
      <Card className="w-full max-w-5xl border border-border/20 shadow-xl shadow-black/5 rounded-3xl bg-card/98 backdrop-blur-xl overflow-hidden">
        <CardHeader className="pt-10 pb-7 px-10 border-b border-border/20">
          <div className="flex items-start justify-between gap-8">
            <div className="flex items-center gap-6">
              <div className="w-18 h-18 rounded-2xl flex items-center justify-center text-primary bg-primary/8 border border-primary/15 shadow-lg shadow-primary/5">
                {viewMode === "individual" ? (
                  <Users className="w-9 h-9" />
                ) : (
                  <UsersRound className="w-9 h-9" />
                )}
              </div>
              <div>
                <CardTitle className="text-3xl font-bold tracking-tight text-foreground leading-tight">
                  Terminal travellers &amp; groups
                </CardTitle>
              </div>
            </div>
            <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground/70 px-4 py-2 rounded-xl bg-muted/40 border border-border/30">
              Dummy data
            </div>
          </div>
        </CardHeader>

        <CardContent className="px-10 pb-10 space-y-7">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
              <div className="flex flex-col gap-3 flex-1">
                <label className="text-xs font-semibold text-muted-foreground/80 uppercase tracking-widest">
                  Airport &amp; terminal
                </label>
                <Select
                  value={`${activeAirport}__${activeTerminal}`}
                  onValueChange={(value) => {
                    const [airportName, terminal] = value.split("__")
                    setSelectedAirport(airportName)
                    setSelectedTerminal(terminal)
                  }}
                >
                  <SelectTrigger className="h-13 bg-background rounded-2xl border border-border/30 hover:border-border/50 focus:ring-2 focus:ring-primary/20 transition-all duration-200 shadow-sm hover:shadow-md">
                    <SelectValue placeholder="Select airport & terminal" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border border-border/20 shadow-xl">
                    {airportTerminalCombos.map((combo) => (
                      <SelectItem
                        key={`${combo.airportName}__${combo.terminal}`}
                        value={`${combo.airportName}__${combo.terminal}`}
                        className="rounded-xl"
                      >
                        {combo.airportName} — {combo.terminal}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-3">
                <label className="text-xs font-semibold text-muted-foreground/80 uppercase tracking-widest">
                  View
                </label>
                <div className="inline-flex items-center rounded-2xl border border-border/30 bg-muted/20 p-1.5 text-sm shadow-sm relative backdrop-blur-sm">
                  <div
                    aria-hidden="true"
                    className="absolute inset-y-1.5 left-1.5 w-1/2 rounded-xl bg-primary shadow-md shadow-primary/20 transition-transform duration-300 ease-out"
                    style={{
                      transform: viewMode === "group" ? "translateX(100%)" : "translateX(0%)",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setViewMode("individual")}
                    className={`toggle-button px-5 py-2.5 rounded-xl font-medium relative z-10 transition-colors duration-300 ease-out ${
                      viewMode === "individual"
                        ? "text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Individual
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("group")}
                    className={`toggle-button px-5 py-2.5 rounded-xl font-medium relative z-10 transition-colors duration-300 ease-out ${
                      viewMode === "group"
                        ? "text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Group
                  </button>
                </div>
              </div>
            </div>
          </div>

          {viewMode === "individual" && (
            <div 
              key="individual"
              className="border rounded-2xl bg-muted/20 border-border/20 overflow-hidden shadow-lg shadow-black/5 backdrop-blur-sm"
              style={{
                animation: 'slideInFromLeft 0.5s ease-out',
              }}
            >
              <div className="px-7 py-5 flex items-center justify-between gap-5 border-b border-border/20 bg-linear-to-r from-transparent via-muted/10 to-transparent">
                <div className="flex flex-col gap-1.5">
                  <div className="text-xl font-bold text-foreground tracking-tight">Travellers</div>
                  <div className="text-xs text-muted-foreground/70 font-medium">
                    Departing from {activeAirport}, terminal {activeTerminal}.
                  </div>
                </div>
                <div className="text-xs font-semibold text-muted-foreground/80 px-4 py-2 rounded-xl bg-muted/40 border border-border/30 shadow-sm">
                  {travellersForTerminal.length} result{travellersForTerminal.length === 1 ? "" : "s"}
                </div>
              </div>

              <div className="h-[480px]">
                <ScrollArea className="h-full px-5 py-5">
                  <div className="space-y-4">
                    {travellersForTerminal.length === 0 && (
                      <p className="text-sm text-muted-foreground/70 px-6 py-16 text-center font-medium">
                        No travellers for this airport/terminal yet.
                      </p>
                    )}
                    {travellersForTerminal.map((traveller) => (
                      <div
                        key={traveller.id}
                        className="border rounded-2xl p-6 shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer group backdrop-blur-sm bg-card/40 border-border/40 hover:border-primary/20 hover:bg-card/80"
                        onClick={() => setSelectedEntity({ type: "traveller", data: traveller })}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex flex-col gap-3 flex-1">
                            <div className="flex items-center gap-3 flex-wrap">
                              <span className="font-bold text-foreground text-lg group-hover:text-primary transition-colors duration-200">{traveller.name}</span>
                              <span className={`text-xs px-3 py-1.5 rounded-xl font-semibold inline-flex items-center gap-1.5 shadow-sm ${
                                traveller.gender === "Male"
                                  ? "bg-blue-50 text-blue-700 border border-blue-200/50"
                                  : "bg-pink-100 text-pink-800 border border-pink-300/50"
                              }`}>
                                <User className="w-3.5 h-3.5" />
                                {traveller.gender}
                              </span>
                            </div>
                            <div className="inline-flex items-center gap-3 text-xs text-muted-foreground/80">
                              <span className="px-3.5 py-1.5 rounded-xl bg-primary/8 text-primary font-semibold border border-primary/15 inline-flex items-center gap-1.5 shadow-sm">
                                <Plane className="w-3.5 h-3.5" />
                                {traveller.flightNumber}
                              </span>
                              <span className="text-muted-foreground/70 font-medium">
                                {traveller.destination} • {traveller.terminal}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-5 pt-5 border-t border-border/20 grid sm:grid-cols-2 gap-x-8 gap-y-3 text-xs">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-muted-foreground/70 font-medium">Destination</span>
                            <span className="text-right text-foreground font-semibold">{traveller.destination}</span>
                          </div>

                          <div className="flex items-center justify-between gap-3">
                            <span className="text-muted-foreground/70 font-medium">Flight time &amp; date</span>
                            <span className="text-right text-foreground font-semibold">
                              {formatFlightDateTime(traveller.flightDateTime)}
                            </span>
                          </div>

                          <div className="flex items-center justify-between gap-3">
                            <span className="text-muted-foreground/70 font-medium">Terminal</span>
                            <span className="text-right text-foreground font-semibold">{traveller.terminal}</span>
                          </div>

                          <div className="flex items-center justify-between gap-3">
                            <span className="text-muted-foreground/70 font-medium">Flight number</span>
                            <span className="text-right text-foreground font-semibold">{traveller.flightNumber}</span>
                          </div>

                          <div className="flex items-center justify-between gap-3">
                            <span className="text-muted-foreground/70 font-medium">
                              Distance from your dest
                            </span>
                            <span className="text-right text-foreground font-semibold">
                              {traveller.distanceFromUserKm} km (dummy)
                            </span>
                          </div>

                          <div className="flex items-center justify-between gap-3">
                            <span className="text-muted-foreground/70 font-medium">Wait time</span>
                            <span className="text-right text-foreground font-semibold">
                              {formatWaitTime(traveller.flightDateTime)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
          )}

          {viewMode === "group" && (
            <div 
              key="group"
              className="border rounded-2xl bg-muted/20 border-border/20 overflow-hidden shadow-lg shadow-black/5 backdrop-blur-sm"
              style={{
                animation: 'slideInFromRight 0.5s ease-out',
              }}
            >
              <div className="px-7 py-5 flex items-center justify-between gap-5 border-b border-border/20 bg-linear-to-r from-transparent via-muted/10 to-transparent">
                <div className="flex flex-col gap-1.5">
                  <div className="text-xl font-bold text-foreground tracking-tight">Groups</div>
                  <div className="text-xs text-muted-foreground/70 font-medium">
                    Departing from {activeAirport}, terminal {activeTerminal}.
                  </div>
                </div>
                <div className="text-xs font-semibold text-muted-foreground/80 px-4 py-2 rounded-xl bg-muted/40 border border-border/30 shadow-sm">
                  {groupsForTerminal.length} result{groupsForTerminal.length === 1 ? "" : "s"}
                </div>
              </div>

              <div className="h-[480px]">
                <ScrollArea className="h-full px-5 py-5">
                  <div className="space-y-4">
                    {groupsForTerminal.length === 0 && (
                      <p className="text-sm text-muted-foreground/70 px-6 py-16 text-center font-medium">
                        No groups for this airport/terminal yet.
                      </p>
                    )}
                    {groupsForTerminal.map((group) => (
                      <div
                        key={group.id}
                        className="border rounded-2xl p-6 shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer group backdrop-blur-sm bg-card/40 border-border/40 hover:border-primary/20 hover:bg-card/80"
                        onClick={() => setSelectedEntity({ type: "group", data: group })}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex flex-col gap-3 flex-1">
                            <div className="flex items-center gap-3 flex-wrap">
                              <span className="font-bold text-foreground text-lg group-hover:text-primary transition-colors duration-200">{group.name}</span>
                              <span className={`text-xs px-3 py-1.5 rounded-xl font-semibold inline-flex items-center gap-1.5 shadow-sm ${
                                group.gender === "Male"
                                  ? "bg-blue-50 text-blue-700 border border-blue-200/50"
                                  : "bg-pink-100 text-pink-800 border border-pink-300/50"
                              }`}>
                                <User className="w-3.5 h-3.5" />
                                {group.gender}
                              </span>
                            </div>
                            <div className="inline-flex items-center gap-3 text-xs text-muted-foreground/80">
                              <span className="px-3.5 py-1.5 rounded-xl bg-primary/8 text-primary font-semibold border border-primary/15 shadow-sm">
                                {group.groupSize}/{group.maxUsers} seats
                              </span>
                              <span className="text-muted-foreground/70 font-medium inline-flex items-center gap-1.5">
                                <Plane className="w-3.5 h-3.5" />
                                {group.flightNumber} • {group.terminal}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-5 pt-5 border-t border-border/20 space-y-4 text-xs">
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-muted-foreground/70 font-medium">Capacity</span>
                              <span className="text-foreground font-semibold">
                                {Math.round((group.groupSize / group.maxUsers) * 100)}%
                              </span>
                            </div>
                            <div className="h-2.5 w-full rounded-full bg-muted/40 overflow-hidden shadow-inner">
                              <div
                                className="h-full rounded-full bg-linear-to-r from-primary via-primary/90 to-primary/80 shadow-sm transition-all duration-500"
                                style={{
                                  width: `${Math.min(
                                    100,
                                    Math.round((group.groupSize / group.maxUsers) * 100),
                                  )}%`,
                                }}
                              />
                            </div>
                          </div>

                          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-3">
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-muted-foreground/70 font-medium">
                                Min distance from destinations
                              </span>
                              <span className="text-right text-foreground font-semibold">
                                {group.distanceFromUserKm} km (dummy min)
                              </span>
                            </div>

                            <div className="flex items-center justify-between gap-3">
                              <span className="text-muted-foreground/70 font-medium">Wait time</span>
                              <span className="text-right text-foreground font-semibold">
                                {formatWaitTime(group.flightDateTime)}
                              </span>
                            </div>

                            <div className="flex items-center justify-between gap-3 sm:col-span-2">
                              <span className="text-muted-foreground/70 font-medium">Gender distribution</span>
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
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
          )}
          <Dialog
            open={selectedEntity !== null}
            onOpenChange={(open) => {
              if (!open) setSelectedEntity(null)
            }}
          >
            <DialogContent
              className="max-w-xl rounded-3xl border border-border/20 bg-card/98 backdrop-blur-xl shadow-2xl shadow-black/10 p-0 overflow-hidden"
              onPointerDownOutside={(event) => event.preventDefault()}
              onEscapeKeyDown={(event) => event.preventDefault()}
            >
              {selectedEntity && selectedEntity.type === "traveller" && (
                <div className="p-8 space-y-7 pr-16">
                  <DialogHeader className="space-y-4 pb-5 border-b border-border/20">
                    <div className="flex items-start gap-5">
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-primary bg-primary/8 border border-primary/15 shadow-lg shadow-primary/5">
                        <Users className="w-7 h-7" />
                      </div>
                      <div className="flex-1 space-y-2.5">
                        <div className="flex items-center gap-3 flex-wrap">
                          <DialogTitle className="text-2xl font-bold tracking-tight">
                            {selectedEntity.data.name}
                          </DialogTitle>
                          <span className={`text-xs px-3 py-1.5 rounded-xl font-semibold inline-flex items-center gap-1.5 shadow-sm ${
                            selectedEntity.data.gender === "Male"
                              ? "bg-blue-50 text-blue-700 border border-blue-200/50"
                              : "bg-pink-100 text-pink-800 border border-pink-300/50"
                          }`}>
                            <User className="w-3.5 h-3.5" />
                            {selectedEntity.data.gender}
                          </span>
                        </div>
                        <DialogDescription className="text-sm text-muted-foreground/80 inline-flex items-center gap-2 font-medium">
                          <Plane className="w-4 h-4" />
                          Flight {selectedEntity.data.flightNumber} • {selectedEntity.data.destination} •{" "}
                          {selectedEntity.data.terminal}
                        </DialogDescription>
                      </div>
                    </div>
                  </DialogHeader>

                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
                      <div className="flex flex-col gap-1.5">
                        <span className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-widest">Destination</span>
                        <span className="text-foreground font-semibold text-base">
                          {selectedEntity.data.destination}
                        </span>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <span className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-widest">Flight time &amp; date</span>
                        <span className="text-foreground font-semibold text-base">
                          {formatFlightDateTime(selectedEntity.data.flightDateTime)}
                        </span>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <span className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-widest">Terminal</span>
                        <span className="text-foreground font-semibold text-base">
                          {selectedEntity.data.terminal}
                        </span>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <span className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-widest">Flight number</span>
                        <span className="text-foreground font-semibold text-base">
                          {selectedEntity.data.flightNumber}
                        </span>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <span className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-widest">Distance from your dest</span>
                        <span className="text-foreground font-semibold text-base">
                          {selectedEntity.data.distanceFromUserKm} km (dummy)
                        </span>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <span className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-widest">Wait time</span>
                        <span className="text-foreground font-semibold text-base">
                          {formatWaitTime(selectedEntity.data.flightDateTime)}
                        </span>
                      </div>
                    </div>

                    {(() => {
                      const info = activeTravellerId
                        ? flightInfoByTraveller[activeTravellerId]
                        : undefined
                      const lastUpdatedMinutesAgo = info
                        ? Math.floor((Date.now() - info.lastUpdatedAt) / 60000)
                        : null
                      const isStale =
                        lastUpdatedMinutesAgo === null || lastUpdatedMinutesAgo > 10

                      return (
                        <div className="rounded-2xl bg-muted/20 border border-border/20 px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 backdrop-blur-sm shadow-sm">
                          <div className="text-xs text-muted-foreground/80 space-y-2">
                            {info ? (
                              <>
                                <div>
                                  <span className="text-muted-foreground/70">Last updated arrival time: </span>
                                  <span className="font-semibold text-foreground">
                                    {info.arrivalTimeLocal}
                                  </span>
                                  <span className="ml-2 text-[11px] text-muted-foreground/60">
                                    ({lastUpdatedMinutesAgo} min ago)
                                  </span>
                                </div>
                                {(info.etaLocal || info.statusShort || info.statusDetail) && (
                                  <div className="text-xs flex flex-col gap-1.5">
                                    {!info.isLanded && info.etaLocal && (
                                      <div>
                                        <span className="text-muted-foreground/70">ETA: </span>
                                        <span className="font-semibold text-foreground">
                                          {info.etaLocal}
                                        </span>
                                      </div>
                                    )}
                                    <div className="flex items-center gap-2.5 flex-wrap">
                                      {(info.statusShort || info.statusDetail) && (
                                        <span className="font-medium text-foreground">
                                          {info.statusShort}
                                          {info.statusDetail
                                            ? ` – ${info.statusDetail}`
                                            : ""}
                                        </span>
                                      )}
                                      {!info.isLanded && info.timingCategory && info.timingLabel && (
                                        <span
                                          className={`px-2.5 py-1 rounded-xl text-[10px] font-semibold uppercase tracking-wider shadow-sm ${
                                            info.timingCategory === "early"
                                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200/50"
                                              : info.timingCategory === "late"
                                                ? "bg-amber-50 text-amber-800 border border-amber-200/50"
                                                : "bg-emerald-50/80 text-emerald-700 border border-emerald-200/30"
                                          }`}
                                        >
                                          {info.timingLabel}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </>
                            ) : (
                              <span className="text-muted-foreground/70 font-medium">Fetching latest arrival time…</span>
                            )}
                            {flightError && (
                              <div className="mt-1.5 text-xs text-destructive font-medium">
                                {flightError}
                              </div>
                            )}
                          </div>
                          {isStale && (
                            <button
                              type="button"
                              onClick={() => activeTravellerId && fetchArrivalInfo(activeTravellerId)}
                              disabled={isRefreshingFlight}
                              className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-60 disabled:cursor-not-allowed hover:bg-primary/90 transition-all duration-200 shadow-md hover:shadow-lg"
                            >
                              {isRefreshingFlight ? "Refreshing..." : "Refresh"}
                            </button>
                          )}
                        </div>
                      )
                    })()}
                  </div>
                </div>
              )}

              {selectedEntity && selectedEntity.type === "group" && (
                <div className="p-8 space-y-7 pr-16">
                  <DialogHeader className="space-y-4 pb-5 border-b border-border/20">
                    <div className="flex items-start gap-5">
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-primary bg-primary/8 border border-primary/15 shadow-lg shadow-primary/5">
                        <UsersRound className="w-7 h-7" />
                      </div>
                      <div className="flex-1 space-y-2.5">
                        <div className="flex items-center gap-3 flex-wrap">
                          <DialogTitle className="text-2xl font-bold tracking-tight">
                            {selectedEntity.data.name}
                          </DialogTitle>
                          <span className={`text-xs px-3 py-1.5 rounded-xl font-semibold inline-flex items-center gap-1.5 shadow-sm ${
                            selectedEntity.data.gender === "Male"
                              ? "bg-blue-50 text-blue-700 border border-blue-200/50"
                              : "bg-pink-100 text-pink-800 border border-pink-300/50"
                          }`}>
                            <User className="w-3.5 h-3.5" />
                            {selectedEntity.data.gender}
                          </span>
                        </div>
                        <DialogDescription className="text-sm text-muted-foreground/80 inline-flex items-center gap-2 font-medium">
                          <Plane className="w-4 h-4" />
                          Group of {selectedEntity.data.groupSize} • Flight {selectedEntity.data.flightNumber} •{" "}
                          {selectedEntity.data.terminal}
                        </DialogDescription>
                      </div>
                    </div>
                  </DialogHeader>

                  <div className="space-y-6">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-widest">Capacity</span>
                        <span className="text-sm font-semibold text-foreground">
                          {selectedEntity.data.groupSize}/{selectedEntity.data.maxUsers} (
                          {Math.round(
                            (selectedEntity.data.groupSize / selectedEntity.data.maxUsers) * 100,
                          )}
                          %)
                        </span>
                      </div>
                      <div className="h-2.5 w-full rounded-full bg-muted/40 overflow-hidden shadow-inner">
                        <div
                          className="h-full rounded-full bg-linear-to-r from-primary via-primary/90 to-primary/80 shadow-sm transition-all duration-500"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.round(
                                (selectedEntity.data.groupSize /
                                  selectedEntity.data.maxUsers) *
                                  100,
                              ),
                            )}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
                      <div className="flex flex-col gap-1.5">
                        <span className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-widest">
                          Min distance from destinations
                        </span>
                        <span className="text-foreground font-semibold text-base">
                          {selectedEntity.data.distanceFromUserKm} km (dummy min)
                        </span>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <span className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-widest">Wait time</span>
                        <span className="text-foreground font-semibold text-base">
                          {formatWaitTime(selectedEntity.data.flightDateTime)}
                        </span>
                      </div>

                      <div className="flex flex-col gap-1.5 col-span-2">
                        <span className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-widest mb-2">Gender distribution</span>
                        <div className="flex items-center gap-5">
                          <span className="inline-flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-blue-500 shadow-sm" />
                            <span className="text-foreground font-semibold text-base">{selectedEntity.data.genderBreakdown.male}M</span>
                          </span>
                          <span className="inline-flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-pink-500 shadow-sm" />
                            <span className="text-foreground font-semibold text-base">{selectedEntity.data.genderBreakdown.female}F</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
    </>
  )
}

export default TerminalTravellers


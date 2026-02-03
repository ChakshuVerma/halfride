import { useEffect, useCallback, useState, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"

import { Select, SelectContent, SelectItem, SelectTrigger } from "../ui/select"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription } from "../ui/dialog"
import { UsersRound, Loader2, Filter, ArrowUpDown, User, ChevronsUpDown, Plane, Pencil } from "lucide-react"
import { cn } from "@/lib/utils"
import { useGetTravellerApi } from "@/hooks/useGetTravellerApi"
import { useGetAirportsApi, type Airport } from "@/hooks/useGetAirportApi"
import { TravellerCard } from "./traveller-card"
import { GroupCard } from "./group-card"
import { TravellerModal } from "./traveller-modal"
import { GroupModal } from "./group-modal"
import { JoinWaitlistModal } from "./join-waitlist-modal"
import { type Traveller, type Group, type ViewMode, type SelectedEntity, ENTITY_TYPE, VIEW_MODE } from "./types"
import ListSection from "./list-section"

const CONSTANTS = {
  ERRORS: {
    TRAVELLER_OR_FLIGHT_NOT_FOUND: "Traveller or flight info not found",
    REFRESH_FLIGHT_ERROR: "Could not refresh flight arrival time.",
  },
  LABELS: {
    AIRPORT: "Airport",
    SELECT_PLACEHOLDER: "Select airport",
    VIEW: "View",
    INDIVIDUAL: "Individual",
    GROUP: "Group",
    TRAVELLERS_TITLE: "Travellers",
    GROUPS_TITLE: "Groups",

    DEPARTING_FROM: "Departing from",
    ALL_GENDERS: "All Genders",
    MIN_DISTANCE: "Min Distance",
    WAIT_TIME: "Wait Time",
    SELECT_AIRPORT_TITLE: "Select an Airport",
    SELECT_AIRPORT_MSG: "Please select an airport above to view available travellers and groups.",
    SEARCH_AIRPORT_PLACEHOLDER: "Search airport...",
    JOIN_WAITLIST: "Join Waitlist",
    TERMINAL: "Terminal",
    HERO_TITLE: "Find your travel companion",
    HERO_SUBTITLE: "Select your departure airport to connect with fellow travellers and groups.",
  },
  MESSAGES: {
    NO_TRAVELLERS: "No travellers found. Try changing the filter.",
    NO_GROUPS: "No groups found. Try changing the filter.",
    NO_AIRPORT_FOUND: "No airport found.",
  },
  LOADING: "Loading...",
  VALUES: {
     ALL: "all",
     MALE: "Male",
     FEMALE: "Female",
     DISTANCE: "distance",
     WAIT_TIME_VAL: "wait_time",
  },
  ANIMATION: {
    LEFT: "left",
    RIGHT: "right",
  }
} as const


// Toggle button component
interface ToggleButtonProps {
  label: string
  isActive: boolean
  onClick: () => void
}

function ToggleButton({ label, isActive, onClick }: ToggleButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        relative z-10 flex-1 px-4 py-2 text-sm font-semibold transition-all duration-300 ease-out rounded-lg
        ${isActive 
          ? "text-zinc-900 dark:text-zinc-100 shadow-xs" 
          : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
        }
      `}
    >
      {label}
    </button>
  )
}

const AirportTravellers = () => {
  // States
  const [selectedAirport, setSelectedAirport] = useState<string | undefined>(undefined)
  const [viewMode, setViewMode] = useState<ViewMode>(VIEW_MODE.INDIVIDUAL)
  const [selectedEntity, setSelectedEntity] = useState<SelectedEntity>(null)
  const [travellers, setTravellers] = useState<Traveller[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [airports, setAirports] = useState<Airport[]>([])

  type SortOption = typeof CONSTANTS.VALUES.DISTANCE | typeof CONSTANTS.VALUES.WAIT_TIME_VAL
  type FilterGender = typeof CONSTANTS.VALUES.ALL | typeof CONSTANTS.VALUES.MALE | typeof CONSTANTS.VALUES.FEMALE

  const [sortBy, setSortBy] = useState<SortOption>(CONSTANTS.VALUES.DISTANCE)
  const [filterGender, setFilterGender] = useState<FilterGender>(CONSTANTS.VALUES.ALL)
  const [open, setOpen] = useState(false)
  const [isWaitlistModalOpen, setIsWaitlistModalOpen] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus()
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [open])

  // console.log(selectedAirport)

  // Hooks
  const { fetchTravellers, fetchGroups, loading: isFetchingList } = useGetTravellerApi()
  const { fetchAirports, fetchTerminals, loading: isFetchingCombos } = useGetAirportsApi()
  const [terminals, setTerminals] = useState<string[]>([])

  useEffect(() => {
    const loadAirports = async () => {
      const fetched = await fetchAirports()
      fetched.sort((a, b) => a.airportName.localeCompare(b.airportName))
      setAirports(fetched)
    }
    void loadAirports()
  }, [])

  const filterAirports = (value: string, search: string) => {
    if (value.toLowerCase().includes(search.toLowerCase())) return 1
    return 0
  }

  useEffect(() => {
    if (!selectedAirport) {
        setTerminals([])
        return
    }

    const loadData = async () => {
      // Find code for selected airport name
      const airportObj = airports.find(a => a.airportName === selectedAirport)
      const code = airportObj?.airportCode
      if (!code) return

      const fetchedTerminals = await fetchTerminals(code)
      setTerminals(fetchedTerminals)

      if (viewMode === VIEW_MODE.INDIVIDUAL) {
        const fetchedTravellers = await fetchTravellers(code)
        setTravellers(fetchedTravellers)
      } else if (viewMode === VIEW_MODE.GROUP) {
        const fetchedGroups = await fetchGroups(selectedAirport)
        setGroups(fetchedGroups)
      }
    }
    void loadData()
  }, [viewMode, fetchTravellers, fetchGroups, selectedAirport, airports, fetchTerminals])

  const ListSectionWrapper = useCallback(() => {
    if (!selectedAirport) return null
    const title = viewMode === VIEW_MODE.INDIVIDUAL ? CONSTANTS.LABELS.TRAVELLERS_TITLE : CONSTANTS.LABELS.GROUPS_TITLE

    const emptyMessage = viewMode === VIEW_MODE.INDIVIDUAL ? CONSTANTS.MESSAGES.NO_TRAVELLERS : CONSTANTS.MESSAGES.NO_GROUPS
    const animation = viewMode === VIEW_MODE.INDIVIDUAL ? CONSTANTS.ANIMATION.LEFT : CONSTANTS.ANIMATION.RIGHT
    const airportSubtitle = `${CONSTANTS.LABELS.DEPARTING_FROM} ${selectedAirport}`

    // --- Filtering & Sorting Logic ---
    let processedTravellers = [...travellers]
    let processedGroups = [...groups]

    // 1. FILTER
    if (filterGender !== CONSTANTS.VALUES.ALL) {
        if (viewMode === VIEW_MODE.INDIVIDUAL) {
            processedTravellers = processedTravellers.filter(t => t.gender === filterGender)
        } else {
            processedGroups = processedGroups.filter(g => g.gender === filterGender)
        }
    }

    // 2. SORT
    const sortFn = (a: any, b: any) => {
        if (sortBy === CONSTANTS.VALUES.DISTANCE) {
            return a.distanceFromUserKm - b.distanceFromUserKm
        } else if (sortBy === CONSTANTS.VALUES.WAIT_TIME_VAL) {
            return new Date(a.flightDateTime).getTime() - new Date(b.flightDateTime).getTime()
        }
        return 0
    }
    
    if (viewMode === VIEW_MODE.INDIVIDUAL) {
        processedTravellers.sort(sortFn)
    } else {
        processedGroups.sort(sortFn)
    }

    const count = viewMode === VIEW_MODE.INDIVIDUAL ? processedTravellers.length : processedGroups.length

    const getNewTravellerCard = (traveller: Traveller) => {
      return (
        <TravellerCard
          key={traveller.id}
          traveller={traveller}
          onClick={() => setSelectedEntity({ type: ENTITY_TYPE.TRAVELLER, data: traveller })}
        />
      )
    }
    
    const getNewGroupCard = (group: Group) => {
      return (
        <GroupCard
          key={group.id}
          group={group}
          onClick={() => setSelectedEntity({ type: ENTITY_TYPE.GROUP, data: group })}
        />
      )
    }

    return (
      <ListSection
        title={title}
        subtitle={airportSubtitle}
        count={count}
        emptyMessage={emptyMessage}
        animation={animation}
        loading={isFetchingList}
        icon={viewMode === VIEW_MODE.INDIVIDUAL ? <User className="w-5 h-5" /> : <UsersRound className="w-5 h-5" />}
      >
        {viewMode === VIEW_MODE.INDIVIDUAL 
          ? processedTravellers.map(getNewTravellerCard)
          : processedGroups.map(getNewGroupCard)
        }
      </ListSection>
    )
  }, [
      selectedAirport, 
      viewMode, 
      travellers, 
      groups, 
      isFetchingList,
      sortBy,       // Add dependency
      filterGender  // Add dependency
  ])

  // --- Helper Component: AirportSelect ---
  const AirportSelect = ({ 
    large = false,
    children
  }: { 
    large?: boolean
    children?: React.ReactNode
  }) => (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "justify-between bg-background border-border/30 hover:border-border/50 hover:bg-background/80 text-foreground px-4 font-normal transition-all duration-300",
            !selectedAirport && "text-muted-foreground",
            large ? "w-full h-14 sm:h-16 text-base sm:text-lg rounded-2xl shadow-sm" : "w-full h-13 rounded-2xl",
            open && "opacity-0 pointer-events-none" 
          )}
        >
           <span className="truncate">
            {selectedAirport
                ? airports.find((airport) => airport.airportName === selectedAirport)?.airportName
                : CONSTANTS.LABELS.SELECT_PLACEHOLDER}
           </span>
          <ChevronsUpDown className={cn("ml-2 shrink-0 opacity-50", large ? "h-5 w-5" : "h-4 w-4")} />
        </Button>
        )}
      </DialogTrigger>
      <DialogContent className="p-0 overflow-hidden bg-background/80 backdrop-blur-xl border-border/20 shadow-2xl rounded-2xl sm:rounded-3xl w-[90vw] max-w-2xl gap-0"  onPointerDownOutside={(event) => event.preventDefault()}
                onEscapeKeyDown={(event) => event.preventDefault()}>
        <div className="flex flex-col h-[65vh] sm:h-[600px]">
             <div className="px-4 py-3 border-b border-border/10 bg-muted/5">
                <DialogTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-widest pl-2">
                    {CONSTANTS.LABELS.SELECT_AIRPORT_TITLE || "Select Airport"}
                </DialogTitle>
                <DialogDescription className="sr-only">
                    Search and select your departure airport to connect with fellow travellers.
                </DialogDescription>
            </div>
            <Command className="flex-1 bg-transparent" filter={filterAirports}>
            <CommandInput 
                ref={searchInputRef} 
                placeholder={CONSTANTS.LABELS.SEARCH_AIRPORT_PLACEHOLDER} 
                className="border-none focus:ring-0 text-lg sm:text-xl py-6 h-16 bg-transparent"
            />
            <CommandList className="max-h-full p-2 scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent">
                <CommandEmpty className="py-10 text-center text-muted-foreground">
                    {CONSTANTS.MESSAGES.NO_AIRPORT_FOUND}
                </CommandEmpty>
                <CommandGroup>
                {airports.map((airport) => (
                    <CommandItem
                    key={airport.airportCode}
                    value={`${airport.airportName} ${airport.airportCode}`}
                    onSelect={() => {
                        setSelectedAirport(airport.airportName === selectedAirport ? undefined : airport.airportName)
                        setOpen(false)
                    }}
                    className="flex items-center justify-between py-3 px-4 rounded-xl aria-selected:bg-primary/5 aria-selected:text-primary mb-1 cursor-pointer transition-colors"
                    >
                    <div className="flex items-center gap-4">
                         <div className={cn(
                             "w-10 h-10 rounded-full flex items-center justify-center border transition-all duration-300",
                                selectedAirport === airport.airportName 
                                ? "bg-primary text-primary-foreground border-primary" 
                                : "bg-muted/30 text-muted-foreground border-border/40"
                         )}>
                             <Plane className="w-4 h-4" />
                         </div>
                        <div className="flex flex-col">
                            <span className="text-base font-medium text-foreground">{airport.airportName}</span>
                            <span className="text-xs text-muted-foreground">International Airport</span>
                        </div>
                    </div>
                     <span className="text-xs font-bold font-mono px-2 py-1 rounded-md bg-muted/50 text-muted-foreground border border-border/20">
                         {airport.airportCode}
                     </span>
                    </CommandItem>
                ))}
                </CommandGroup>
            </CommandList>
            </Command>
        </div>
      </DialogContent>
    </Dialog>
  )

  if (isFetchingCombos) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-16 text-muted-foreground/60 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary/60" />
        <span className="text-sm font-medium">{CONSTANTS.LOADING}</span>
      </div>
    )
  }

  const ModalWrapper = () => {
    if (!selectedEntity) return

    if (selectedEntity.type === ENTITY_TYPE.TRAVELLER) {
      return (
       <TravellerModal
        traveller={selectedEntity.data}
      />
      )
    }
    if (selectedEntity.type === ENTITY_TYPE.GROUP) {
      return (
       <GroupModal
          group={selectedEntity.data}
        />
      )
    }
  }

  return (
    <>
      <style>{`
        @keyframes slideInFromLeft {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInFromRight {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
      <div className="flex items-center justify-center min-h-[50vh] p-2 sm:p-8 w-full">
        <Card className="w-full max-w-5xl border border-border/20 shadow-xl shadow-black/5 rounded-3xl bg-card/98 backdrop-blur-xl">
            {selectedAirport && (
              <CardHeader className="pt-6 sm:pt-10 pb-6 sm:pb-7 px-6 sm:px-10 border-b border-border/10">
                <div className="flex items-start justify-between gap-8">
                  <div className="flex items-center gap-4 sm:gap-6">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center text-primary bg-primary/5 border border-primary/10 shadow-sm">
                      <Plane className="w-6 h-6 sm:w-8 sm:h-8" />
                    </div>
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-xl sm:text-3xl font-bold tracking-tight text-foreground leading-tight">
                        {selectedAirport}
                      </CardTitle>
                      <AirportSelect>
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full opacity-50 hover:opacity-100 hover:bg-primary/10 hover:text-primary transition-all">
                            <Pencil className="w-4 h-4" />
                        </Button>
                      </AirportSelect>
                    </div>
                  </div>
                </div>
              </CardHeader>
            )}

          <CardContent className={cn("px-3 sm:px-10 pb-6 sm:pb-10 transition-all duration-500", !selectedAirport ? "pt-10 sm:pt-20 pb-20 sm:pb-32" : "pt-6 sm:pt-10 space-y-7")}>
            
            {/* STATE 1: NO AIRPORT SELECTED (HERO VIEW) */}
            {!selectedAirport && (
                <div className="flex flex-col items-center justify-center text-center space-y-8 animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-700 ease-out max-w-2xl mx-auto">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-[2rem] bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center text-primary shadow-inner ring-1 ring-primary/20 mb-2">
                        <Plane className="w-10 h-10 sm:w-12 sm:h-12" />
                    </div>
                    
                    <div className="space-y-4 max-w-lg">
                        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/70">
                        {CONSTANTS.LABELS.HERO_TITLE}
                        </h2>
                        <p className="text-muted-foreground text-lg leading-relaxed">
                        {CONSTANTS.LABELS.HERO_SUBTITLE}
                        </p>
                    </div>

                    <div className="w-full max-w-md pt-2">
                        <div className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-blue-500/20 rounded-[1.2rem] blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
                            <div className="relative">
                                <AirportSelect large />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* STATE 2: AIRPORT SELECTED (DASHBOARD VIEW) */}
             {selectedAirport && (
              <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
               {/* Visibility Section */}
               <div className="flex flex-col gap-6 w-full">
                       <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
                        {/* Toggle */}
                        <div className="flex flex-col gap-3 w-full xl:w-auto">
                          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-1">
                            {CONSTANTS.LABELS.VIEW}
                          </label>
                          <div className="flex p-1 bg-zinc-100/50 dark:bg-zinc-800/50 border border-zinc-200/50 dark:border-white/5 rounded-xl relative w-full xl:w-[280px]">
                            {/* Sliding Background */}
                            <div
                              className={`
                                absolute inset-y-1 w-[calc(50%-4px)] bg-white dark:bg-zinc-700 rounded-lg shadow-sm border border-zinc-200/50 dark:border-white/5 transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)]
                                ${viewMode === VIEW_MODE.GROUP ? "translate-x-[calc(100%+4px)]" : "translate-x-1"}
                              `}
                            />
                            <ToggleButton
                              label={CONSTANTS.LABELS.INDIVIDUAL}
                              isActive={viewMode === VIEW_MODE.INDIVIDUAL}
                              onClick={() => setViewMode(VIEW_MODE.INDIVIDUAL)}
                            />
                            <ToggleButton
                              label={CONSTANTS.LABELS.GROUP}
                              isActive={viewMode === VIEW_MODE.GROUP}
                              onClick={() => setViewMode(VIEW_MODE.GROUP)}
                            />
                          </div>
                        </div>

                        {/* Filters & Sort */}
                        <div className="flex flex-col sm:flex-row gap-3 flex-1 justify-end">
                             {/* Filter */}
                             <div className="w-full sm:w-[180px]">
                                <Select
                                  value={filterGender}
                                  onValueChange={(val) => setFilterGender(val as FilterGender)}
                                >
                                  <SelectTrigger className="h-11 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-white/10 hover:border-zinc-300 dark:hover:border-white/20 transition-all rounded-xl font-medium shadow-sm">
                                    <div className="flex items-center gap-2.5 truncate">
                                      <Filter className="w-4 h-4 text-zinc-400" />
                                      <span className="text-sm text-zinc-700 dark:text-zinc-200">
                                        {filterGender === CONSTANTS.VALUES.ALL ? CONSTANTS.LABELS.ALL_GENDERS : filterGender}
                                      </span>
                                    </div>
                                  </SelectTrigger>
                                  <SelectContent className="rounded-xl border border-zinc-200 dark:border-white/10 shadow-xl p-1">
                                    <SelectItem value={CONSTANTS.VALUES.ALL} className="rounded-lg">{CONSTANTS.LABELS.ALL_GENDERS}</SelectItem>
                                    <SelectItem value={CONSTANTS.VALUES.MALE} className="text-blue-600 focus:text-blue-600 dark:text-blue-400 dark:focus:text-blue-400 font-medium rounded-lg">{CONSTANTS.VALUES.MALE}</SelectItem>
                                    <SelectItem value={CONSTANTS.VALUES.FEMALE} className="text-pink-600 focus:text-pink-600 dark:text-pink-400 dark:focus:text-pink-400 font-medium rounded-lg">{CONSTANTS.VALUES.FEMALE}</SelectItem>
                                  </SelectContent>
                                </Select>
                             </div>

                             {/* Sort */}
                             <div className="w-full sm:w-[180px]">
                                <Select
                                  value={sortBy}
                                  onValueChange={(val) => setSortBy(val as SortOption)}
                                >
                                  <SelectTrigger className="h-11 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-white/10 hover:border-zinc-300 dark:hover:border-white/20 transition-all rounded-xl font-medium shadow-sm">
                                     <div className="flex items-center gap-2.5 truncate">
                                      <ArrowUpDown className="w-4 h-4 text-zinc-400" />
                                      <span className="text-sm text-zinc-700 dark:text-zinc-200">
                                        {sortBy === CONSTANTS.VALUES.DISTANCE ? CONSTANTS.LABELS.MIN_DISTANCE : CONSTANTS.LABELS.WAIT_TIME}
                                      </span>
                                    </div>
                                  </SelectTrigger>
                                  <SelectContent className="rounded-xl border border-zinc-200 dark:border-white/10 shadow-xl p-1">
                                    <SelectItem value={CONSTANTS.VALUES.DISTANCE} className="rounded-lg">{CONSTANTS.LABELS.MIN_DISTANCE}</SelectItem>
                                    <SelectItem value={CONSTANTS.VALUES.WAIT_TIME_VAL} className="rounded-lg">{CONSTANTS.LABELS.WAIT_TIME}</SelectItem>
                                  </SelectContent>
                                </Select>
                             </div>

                             <Button 
                                onClick={() => setIsWaitlistModalOpen(true)}
                                className="w-full sm:w-auto h-11 px-6 rounded-xl font-bold uppercase tracking-widest text-[10px] bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all"
                             >
                                <Plane className="w-3.5 h-3.5 mr-2" />
                                {CONSTANTS.LABELS.JOIN_WAITLIST}
                             </Button>
                        </div>
                       </div>
                       
                        {terminals.length > 0 && (
                        <div className="flex flex-wrap gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                            {terminals.map((terminal) => (
                            <div 
                                key={terminal}
                                className="px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-default"
                            >
                                {CONSTANTS.LABELS.TERMINAL} {terminal}
                            </div>
                            ))}
                        </div>
                        )}
                    </div>
                </div>
            )}
            
            {/* TRAVELLER LIST */}
            <ListSectionWrapper />

            <Dialog
              open={selectedEntity !== null}
              onOpenChange={(open) => {
                if (!open) setSelectedEntity(null)
              }}
            >
              <DialogContent
                className="w-[90vw] sm:w-full max-w-xl max-h-[85vh] overflow-y-auto rounded-2xl sm:rounded-3xl border border-border/20 bg-card/98 backdrop-blur-xl shadow-2xl shadow-black/10 p-0"
                onPointerDownOutside={(event) => event.preventDefault()}
                onEscapeKeyDown={(event) => event.preventDefault()}
              >
                <ModalWrapper />
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>
      <JoinWaitlistModal open={isWaitlistModalOpen} onOpenChange={setIsWaitlistModalOpen} />
    </>
  )
}

export default AirportTravellers


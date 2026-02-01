import { useEffect, useCallback, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Dialog, DialogContent } from "../ui/dialog"
import { UsersRound, Loader2, Filter, ArrowUpDown, User, MapPin } from "lucide-react"
import { useGetTravellerApi } from "@/hooks/useGetTravellerApi"
import { useGetAirportsApi, type Airport } from "@/hooks/useGetAirportApi"
import { TravellerCard } from "./traveller-card"
import { GroupCard } from "./group-card"
import { TravellerModal } from "./traveller-modal"
import { GroupModal } from "./group-modal"
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
    HEADER: "Airport travellers & groups",
    DEPARTING_FROM: "Departing from",
    ALL_GENDERS: "All Genders",
    MIN_DISTANCE: "Min Distance",
    WAIT_TIME: "Wait Time",
    SELECT_AIRPORT_TITLE: "Select an Airport",
    SELECT_AIRPORT_MSG: "Please select an airport above to view available travellers and groups.",
  },
  MESSAGES: {
    NO_TRAVELLERS: "No travellers found. Try changing the filter.",
    NO_GROUPS: "No groups found. Try changing the filter.",
  },
  LOADING: "Loading...",
  VALUES: {
     ALL: "all",
     MALE: "Male",
     FEMALE: "Female",
     DISTANCE: "distance",
     WAIT_TIME_VAL: "wait_time",
  }
}


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

  type SortOption = "distance" | "wait_time"
  type FilterGender = "all" | "Male" | "Female"

  const [sortBy, setSortBy] = useState<SortOption>("distance")
  const [filterGender, setFilterGender] = useState<FilterGender>("all")

  // Hooks
  const { fetchTravellers, fetchGroups, loading: isFetchingList } = useGetTravellerApi()
  const { fetchAirports, loading: isFetchingCombos } = useGetAirportsApi()

  useEffect(() => {
    const loadAirports = async () => {
      const fetched = await fetchAirports()
      setAirports(fetched)
    }
    void loadAirports()
  }, [])

  useEffect(() => {
    if (!selectedAirport) return

    const loadData = async () => {
      // Find code for selected airport name
      const airportObj = airports.find(a => a.airportName === selectedAirport)
      const code = airportObj?.airportCode

      if (viewMode === VIEW_MODE.INDIVIDUAL && code) {
        const fetchedTravellers = await fetchTravellers(code)
        setTravellers(fetchedTravellers)
      } else if (viewMode === VIEW_MODE.GROUP) {
        const fetchedGroups = await fetchGroups(selectedAirport)
        setGroups(fetchedGroups)
      }
    }
    void loadData()
  }, [viewMode, fetchTravellers, fetchGroups, selectedAirport, airports])

  const ListSectionWrapper = useCallback(() => {
    if (!selectedAirport) return null
    const title = viewMode === VIEW_MODE.INDIVIDUAL ? CONSTANTS.LABELS.TRAVELLERS_TITLE : CONSTANTS.LABELS.GROUPS_TITLE

    const emptyMessage = viewMode === VIEW_MODE.INDIVIDUAL ? CONSTANTS.MESSAGES.NO_TRAVELLERS : CONSTANTS.MESSAGES.NO_GROUPS
    const animation = viewMode === VIEW_MODE.INDIVIDUAL ? "left" : "right"
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
          <CardHeader className="pt-6 sm:pt-10 pb-6 sm:pb-7 px-6 sm:px-10 border-b border-border/10">
            <div className="flex items-start justify-between gap-8">
              <div className="flex items-center gap-4 sm:gap-6">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center text-primary bg-primary/5 border border-primary/10 shadow-sm">
                  {viewMode === VIEW_MODE.INDIVIDUAL ? (
                    <User className="w-6 h-6 sm:w-8 sm:h-8" />
                  ) : (
                    <UsersRound className="w-6 h-6 sm:w-8 sm:h-8" />
                  )}
                </div>
                <div>
                  <CardTitle className="text-xl sm:text-3xl font-bold tracking-tight text-foreground leading-tight">
                    {CONSTANTS.LABELS.HEADER}
                  </CardTitle>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="px-3 sm:px-10 pb-6 sm:pb-10 space-y-7">
            <div className="flex flex-col gap-6">
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
                <div className="flex flex-col gap-3 flex-1 w-full">
                  <label className="text-xs font-semibold text-muted-foreground/80 uppercase tracking-widest">
                    {CONSTANTS.LABELS.AIRPORT}
                  </label>
                  <Select
                    value={selectedAirport || ""}
                    onValueChange={(value) => {
                      setSelectedAirport(value)
                    }}
                  >
                    <SelectTrigger className="h-13 bg-background rounded-2xl border border-border/30 hover:border-border/50 focus:ring-2 focus:ring-primary/20 transition-all duration-200 shadow-sm hover:shadow-md w-full">
                      <SelectValue placeholder={CONSTANTS.LABELS.SELECT_PLACEHOLDER} />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border border-border/20 shadow-xl">
                      {airports.map((airport) => (
                        <SelectItem
                          key={airport.airportCode}
                          value={airport.airportName}
                          className="rounded-xl"
                        >
                          {airport.airportName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                </div>
                {
                  selectedAirport && (
                    <div className="flex flex-col gap-6 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
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
                        </div>
                       </div>
                    </div>
                  )
                }
 
                {!selectedAirport && (
                   <div className="flex flex-col items-center justify-center py-16 sm:py-20 text-center space-y-4 rounded-3xl border border-dashed border-border/40 bg-muted/5">
                      <div className="p-4 rounded-full bg-primary/5 text-primary mb-2">
                         <MapPin className="w-8 h-8 sm:w-10 sm:h-10 opacity-50" />
                      </div>
                       <div className="space-y-1 max-w-sm px-4">
                         <h3 className="text-lg font-semibold text-foreground">{CONSTANTS.LABELS.SELECT_AIRPORT_TITLE}</h3>
                         <p className="text-sm text-muted-foreground/70">
                           {CONSTANTS.LABELS.SELECT_AIRPORT_MSG}
                         </p>
                       </div>
                   </div>
                )}
              </div>

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
    </>
  )
}

export default AirportTravellers


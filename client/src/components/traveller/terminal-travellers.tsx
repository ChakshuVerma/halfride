import { useEffect, useCallback, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Dialog, DialogContent } from "../ui/dialog"
import { UsersRound, Loader2, Filter, ArrowUpDown, User, MapPin } from "lucide-react"

// ... (lines 6-172) removed
import { useGetTravellerApi } from "@/hooks/useGetTravellerApi"
import { useGetAirportTerminalApi, type AirportTerminalCombo } from "@/hooks/useGetAirportTerminalApi"
import { TravellerCard } from "./traveller-card"
import { GroupCard } from "./group-card"
import { TravellerModal } from "./traveller-modal"
import { GroupModal } from "./group-modal"
import { type Traveller, type Group, type ViewMode, type SelectedEntity, ENTITY_TYPE, VIEW_MODE } from "./types"
import ListSection from "./list-section"

const TEXTS = {
  ERRORS: {
    TRAVELLER_OR_FLIGHT_NOT_FOUND: "Traveller or flight info not found",
    REFRESH_FLIGHT_ERROR: "Could not refresh flight arrival time.",
  },
  LABELS: {
    DUMMY_DATA: "Dummy data",
    AIRPORT_AND_TERMINAL: "Airport & terminal",
    SELECT_PLACEHOLDER: "Select airport & terminal",
    VIEW: "View",
    INDIVIDUAL: "Individual",
    GROUP: "Group",
    TRAVELLERS_TITLE: "Travellers",
    GROUPS_TITLE: "Groups",
    HEADER: "Terminal travellers & groups",
    DEPARTING_FROM: "Departing from",
    TERMINAL_LOWER: "terminal",
  },
  MESSAGES: {
    NO_TRAVELLERS: "No travellers found. Try changing the filter.",
    NO_GROUPS: "No groups found. Try changing the filter.",
  },
  LOADING: "Loading...",
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
      className={`toggle-button flex-1 md:flex-none w-full md:w-auto px-5 py-2.5 rounded-xl font-medium relative z-10 transition-colors duration-300 ease-out text-center ${
        isActive ? "text-white font-bold" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
    </button>
  )
}

const TerminalTravellers = () => {
  // States
  const [selectedAirport, setSelectedAirport] = useState<string | undefined>(undefined)
  const [selectedTerminal, setSelectedTerminal] = useState<string | undefined>(undefined)
  const [viewMode, setViewMode] = useState<ViewMode>(VIEW_MODE.INDIVIDUAL)
  const [selectedEntity, setSelectedEntity] = useState<SelectedEntity>(null)
  const [travellers, setTravellers] = useState<Traveller[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [airportTerminalCombos, setAirportTerminalCombos] = useState<AirportTerminalCombo[]>([])

  type SortOption = "distance" | "wait_time"
  type FilterGender = "all" | "Male" | "Female"

  const [sortBy, setSortBy] = useState<SortOption>("distance")
  const [filterGender, setFilterGender] = useState<FilterGender>("all")

  // Hooks
  const { fetchTravellers, fetchGroups, loading: isFetchingList } = useGetTravellerApi()
  const { fetchAirportTerminalCombos, loading: isFetchingCombos } = useGetAirportTerminalApi()

  useEffect(() => {
    const loadCombos = async () => {
      const fetchedCombos = await fetchAirportTerminalCombos()
      setAirportTerminalCombos(fetchedCombos)
    }
    void loadCombos()
  }, [])

  useEffect(() => {
    if (!selectedAirport || !selectedTerminal) return

    const loadData = async () => {
      if (viewMode === VIEW_MODE.INDIVIDUAL) {
        const fetchedTravellers = await fetchTravellers(selectedAirport, selectedTerminal)
        setTravellers(fetchedTravellers)
      } else if (viewMode === VIEW_MODE.GROUP) {
        const fetchedGroups = await fetchGroups(selectedAirport, selectedTerminal)
        setGroups(fetchedGroups)
      }
    }
    void loadData()
  }, [viewMode, fetchTravellers, fetchGroups, selectedAirport, selectedTerminal])

  const ListSectionWrapper = useCallback(() => {
    if (!selectedAirport || !selectedTerminal) return null
    const title = viewMode === VIEW_MODE.INDIVIDUAL ? TEXTS.LABELS.TRAVELLERS_TITLE : TEXTS.LABELS.GROUPS_TITLE

    const emptyMessage = viewMode === VIEW_MODE.INDIVIDUAL ? TEXTS.MESSAGES.NO_TRAVELLERS : TEXTS.MESSAGES.NO_GROUPS
    const animation = viewMode === VIEW_MODE.INDIVIDUAL ? "left" : "right"
    const terminalSubtitle = `${TEXTS.LABELS.DEPARTING_FROM} ${selectedAirport}, ${TEXTS.LABELS.TERMINAL_LOWER} ${selectedTerminal}.`

    // --- Filtering & Sorting Logic ---
    let processedTravellers = [...travellers]
    let processedGroups = [...groups]

    // 1. FILTER
    if (filterGender !== "all") {
        if (viewMode === VIEW_MODE.INDIVIDUAL) {
            processedTravellers = processedTravellers.filter(t => t.gender === filterGender)
        } else {
            processedGroups = processedGroups.filter(g => g.gender === filterGender)
        }
    }

    // 2. SORT
    const sortFn = (a: any, b: any) => {
        if (sortBy === "distance") {
            return a.distanceFromUserKm - b.distanceFromUserKm
        } else if (sortBy === "wait_time") {
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
        subtitle={terminalSubtitle}
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
      selectedTerminal, 
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
        <span className="text-sm font-medium">{TEXTS.LOADING}</span>
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
                    {TEXTS.LABELS.HEADER}
                  </CardTitle>
                </div>
              </div>
              <div className="hidden sm:block text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800/50 border border-border/40">
                {TEXTS.LABELS.DUMMY_DATA}
              </div>
            </div>
          </CardHeader>

          <CardContent className="px-3 sm:px-10 pb-6 sm:pb-10 space-y-7">
            <div className="flex flex-col gap-6">
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
                <div className="flex flex-col gap-3 flex-1 w-full">
                  <label className="text-xs font-semibold text-muted-foreground/80 uppercase tracking-widest">
                    {TEXTS.LABELS.AIRPORT_AND_TERMINAL}
                  </label>
                  <Select
                    value={`${selectedAirport}__${selectedTerminal}`}
                    onValueChange={(value) => {
                      const [airportName, terminal] = value.split("__")
                      setSelectedAirport(airportName)
                      setSelectedTerminal(terminal)
                    }}
                  >
                    <SelectTrigger className="h-13 bg-background rounded-2xl border border-border/30 hover:border-border/50 focus:ring-2 focus:ring-primary/20 transition-all duration-200 shadow-sm hover:shadow-md w-full">
                      <SelectValue placeholder={TEXTS.LABELS.SELECT_PLACEHOLDER} />
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
                </div>
                {
                  selectedAirport && selectedTerminal && (
                    <div className="flex flex-col gap-6 w-full">
                       <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
                        <div className="flex flex-col gap-2 w-full md:w-auto shrink-0">
                          <label className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider">
                            {TEXTS.LABELS.VIEW}
                          </label>
                          <div className="grid grid-cols-2 gap-0 rounded-xl border border-border/40 bg-zinc-100/80 dark:bg-zinc-800/80 p-1 shadow-sm backdrop-blur-md w-full md:w-[240px] relative">
                            <div
                              aria-hidden="true"
                              className="absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-lg bg-black dark:bg-white shadow-sm transition-transform duration-300 ease-[cubic-bezier(0.2,0,0,1)]"
                              style={{
                                transform: viewMode === VIEW_MODE.GROUP ? "translateX(100%)" : "translateX(0%)",
                              }}
                            />
                            <ToggleButton
                              label={TEXTS.LABELS.INDIVIDUAL}
                              isActive={viewMode === VIEW_MODE.INDIVIDUAL}
                              onClick={() => setViewMode(VIEW_MODE.INDIVIDUAL)}
                            />
                            <ToggleButton
                              label={TEXTS.LABELS.GROUP}
                              isActive={viewMode === VIEW_MODE.GROUP}
                              onClick={() => setViewMode(VIEW_MODE.GROUP)}
                            />
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 flex-1 justify-end">
                             {/* Filter */}
                             <div className="w-full sm:w-[160px]">
                                <Select
                                  value={filterGender}
                                  onValueChange={(val) => setFilterGender(val as FilterGender)}
                                >
                                  <SelectTrigger className="h-10 sm:h-11 bg-black text-white border-0 hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90 transition-all rounded-xl gap-2.5 font-medium shadow-lg shadow-black/5">
                                    <div className="flex items-center gap-2 truncate">
                                      <Filter className="w-4 h-4 text-white/70 dark:text-black/70" />
                                      <span className="text-xs">
                                        {filterGender === 'all' ? 'All Genders' : filterGender}
                                      </span>
                                    </div>
                                  </SelectTrigger>
                                  <SelectContent className="rounded-xl border border-border/20 shadow-lg">
                                    <SelectItem value="all">All Genders</SelectItem>
                                    <SelectItem value="Male" className="text-blue-600 focus:text-blue-600 dark:text-blue-400 dark:focus:text-blue-400 font-medium">Male</SelectItem>
                                    <SelectItem value="Female" className="text-pink-600 focus:text-pink-600 dark:text-pink-400 dark:focus:text-pink-400 font-medium">Female</SelectItem>
                                  </SelectContent>
                                </Select>
                             </div>

                             {/* Sort */}
                             <div className="w-full sm:w-[160px]">
                                <Select
                                  value={sortBy}
                                  onValueChange={(val) => setSortBy(val as SortOption)}
                                >
                                  <SelectTrigger className="h-10 sm:h-11 bg-black text-white border-0 hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90 transition-all rounded-xl gap-2.5 font-medium shadow-lg shadow-black/5">
                                     <div className="flex items-center gap-2 truncate">
                                      <ArrowUpDown className="w-4 h-4 text-white/70 dark:text-black/70" />
                                      <span className="text-xs">
                                        {sortBy === 'distance' ? 'Min Distance' : 'Wait Time'}
                                      </span>
                                    </div>
                                  </SelectTrigger>
                                  <SelectContent className="rounded-xl border border-border/20 shadow-lg">
                                    <SelectItem value="distance">Min Distance</SelectItem>
                                    <SelectItem value="wait_time">Wait Time</SelectItem>
                                  </SelectContent>
                                </Select>
                             </div>
                        </div>
                       </div>
                    </div>
                  )
                }

                {!selectedAirport && !selectedTerminal && (
                   <div className="flex flex-col items-center justify-center py-16 sm:py-20 text-center space-y-4 rounded-3xl border border-dashed border-border/40 bg-muted/5">
                      <div className="p-4 rounded-full bg-primary/5 text-primary mb-2">
                         <MapPin className="w-8 h-8 sm:w-10 sm:h-10 opacity-50" />
                      </div>
                      <div className="space-y-1 max-w-sm px-4">
                        <h3 className="text-lg font-semibold text-foreground">Select a Terminal</h3>
                        <p className="text-sm text-muted-foreground/70">
                          Please select an airport and terminal above to view available travellers and groups.
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

export default TerminalTravellers


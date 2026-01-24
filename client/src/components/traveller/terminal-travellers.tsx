import { useEffect, useCallback, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Dialog, DialogContent } from "../ui/dialog"
import { Users, UsersRound, Loader2 } from "lucide-react"
import { useGetTravellerApi } from "@/hooks/useGetTravellerApi"
import { useGetAirportTerminalApi, type AirportTerminalCombo } from "@/hooks/useGetAirportTerminalApi"
import { TravellerCard } from "./traveller-card"
import { GroupCard } from "./group-card"
import { TravellerModal } from "./traveller-modal"
import { GroupModal } from "./group-modal"
import type { Traveller, Group, ViewMode, SelectedEntity } from "./types"
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
    NO_TRAVELLERS: "No travellers for this airport/terminal yet.",
    NO_GROUPS: "No groups for this airport/terminal yet.",
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
        isActive ? "text-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
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
  const [viewMode, setViewMode] = useState<ViewMode>("individual")
  const [selectedEntity, setSelectedEntity] = useState<SelectedEntity>(null)
  const [travellers, setTravellers] = useState<Traveller[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [airportTerminalCombos, setAirportTerminalCombos] = useState<AirportTerminalCombo[]>([])

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
      if (viewMode === "individual") {
        const fetchedTravellers = await fetchTravellers(selectedAirport, selectedTerminal)
        setTravellers(fetchedTravellers)
      } else if (viewMode === "group") {
        const fetchedGroups = await fetchGroups(selectedAirport, selectedTerminal)
        setGroups(fetchedGroups)
      }
    }
    void loadData()
  }, [viewMode, fetchTravellers, fetchGroups, selectedAirport, selectedTerminal])

  const ListSectionWrapper = useCallback(() => {
    if (!selectedAirport || !selectedTerminal) return null
    const title = viewMode === "individual" ? TEXTS.LABELS.TRAVELLERS_TITLE : TEXTS.LABELS.GROUPS_TITLE

    const emptyMessage = viewMode === "individual" ? TEXTS.MESSAGES.NO_TRAVELLERS : TEXTS.MESSAGES.NO_GROUPS
    const count = viewMode === "individual" ? travellers.length : groups.length
    const animation = viewMode === "individual" ? "left" : "right"
    const terminalSubtitle = `${TEXTS.LABELS.DEPARTING_FROM} ${selectedAirport}, ${TEXTS.LABELS.TERMINAL_LOWER} ${selectedTerminal}.`

    const getNewTravellerCard = (traveller: Traveller) => {
      return (
        <TravellerCard
          key={traveller.id}
          traveller={traveller}
          onClick={() => setSelectedEntity({ type: "traveller", data: traveller })}
        />
      )
    }
    
    const getNewGroupCard = (group: Group) => {
      return (
        <GroupCard
          key={group.id}
          group={group}
          onClick={() => setSelectedEntity({ type: "group", data: group })}
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
      >
        {viewMode === "individual" 
          ? travellers.map(getNewTravellerCard)
          : groups.map(getNewGroupCard)
        }
      </ListSection>
    )
  }, [selectedAirport, selectedTerminal, viewMode, travellers, groups, isFetchingList])

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

    if (selectedEntity.type === "traveller") {
      return (
       <TravellerModal
        traveller={selectedEntity.data}
      />
      )
    }
    if (selectedEntity.type === "group") {
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
                  {viewMode === "individual" ? (
                    <Users className="w-6 h-6 sm:w-8 sm:h-8" />
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
                {
                  selectedAirport && selectedTerminal && (
                    <div className="flex flex-col gap-2 w-full md:w-auto shrink-0">
                      <label className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider">
                        {TEXTS.LABELS.VIEW}
                      </label>
                      <div className="grid grid-cols-2 gap-0 rounded-xl border border-border/40 bg-zinc-200/50 dark:bg-zinc-800/50 p-1 shadow-sm backdrop-blur-md w-full md:w-[240px] relative">
                        <div
                          aria-hidden="true"
                          className="absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-lg bg-white dark:bg-zinc-700 shadow-sm transition-transform duration-300 ease-[cubic-bezier(0.2,0,0,1)]"
                          style={{
                            transform: viewMode === "group" ? "translateX(100%)" : "translateX(0%)",
                          }}
                        />
                        <ToggleButton
                          label={TEXTS.LABELS.INDIVIDUAL}
                          isActive={viewMode === "individual"}
                          onClick={() => setViewMode("individual")}
                        />
                        <ToggleButton
                          label={TEXTS.LABELS.GROUP}
                          isActive={viewMode === "group"}
                          onClick={() => setViewMode("group")}
                        />
                      </div>
                    </div>
                  )
                }
              </div>
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


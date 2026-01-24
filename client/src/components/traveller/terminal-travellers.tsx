import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Dialog, DialogContent } from "../ui/dialog"
import { Users, UsersRound } from "lucide-react"
import { useFlightTrackerApi, type FlightArrivalInfo } from "@/hooks/useFlightTrackerApi"
import { useGetTravellerApi } from "@/hooks/useGetTravellerApi"
import { useGetAirportTerminalApi, type AirportTerminalCombo } from "@/hooks/useGetAirportTerminalApi"
import { TravellerCard } from "./traveller-card"
import { GroupCard } from "./group-card"
import { TravellerModal } from "./traveller-modal"
import { GroupModal } from "./group-modal"
import type { Traveller, Group, ViewMode, SelectedEntity } from "./types"
import ListSection from "./list-section"
import { formatWaitTime, formatFlightDateTime } from "./utils"

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
      className={`toggle-button px-5 py-2.5 rounded-xl font-medium relative z-10 transition-colors duration-300 ease-out ${
        isActive ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
    </button>
  )
}

const TerminalTravellers = () => {
  const [selectedAirport, setSelectedAirport] = useState<string | undefined>(undefined)
  const [selectedTerminal, setSelectedTerminal] = useState<string | undefined>(undefined)
  const [viewMode, setViewMode] = useState<ViewMode>("individual")
  const [selectedEntity, setSelectedEntity] = useState<SelectedEntity>(null)
  const [flightInfoByTraveller, setFlightInfoByTraveller] = useState<
    Record<string, FlightArrivalInfo | undefined>
  >({})
  const [flightError, setFlightError] = useState<string | null>(null)
  const [travellers, setTravellers] = useState<Traveller[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [airportTerminalCombos, setAirportTerminalCombos] = useState<AirportTerminalCombo[]>([])

  const { fetchFlightTrackerByFlightNumber, loading: isRefreshingFlight } = useFlightTrackerApi()
  const { fetchTravellers, fetchGroups } = useGetTravellerApi()
  const { fetchAirportTerminalCombos } = useGetAirportTerminalApi()

  useEffect(() => {
    const loadCombos = async () => {
      const fetchedCombos = await fetchAirportTerminalCombos()
      setAirportTerminalCombos(fetchedCombos)
    }
    void loadCombos()
  }, [fetchAirportTerminalCombos])

  
  useEffect(() => {
    const loadData = async () => {
      try {
      if (viewMode === "individual") {
        const fetchedTravellers = await fetchTravellers()
        setTravellers(fetchedTravellers)
      } else if (viewMode === "group") {
        const fetchedGroups = await fetchGroups()
        setGroups(fetchedGroups)
      }
    } catch {
      // Do nothing
    }
    }
    void loadData()
  }, [viewMode, fetchTravellers, fetchGroups])

  const allItems = useMemo(() => [...travellers, ...groups], [travellers, groups])

  const airports = useMemo(() => {
    const all = allItems.map((item) => item.airportName)
    return Array.from(new Set(all)).sort()
  }, [allItems])

  const activeAirport = selectedAirport || airports[0]

  const terminals = useMemo(() => {
    const all = allItems
      .filter((item) => item.airportName === activeAirport)
      .map((item) => item.terminal)
    return Array.from(new Set(all)).sort()
  }, [allItems, activeAirport])

  const activeTerminal = selectedTerminal || terminals[0]

  const filterByTerminal = <T extends { airportName: string; terminal: string }>(items: T[]) =>
    items.filter((item) => item.airportName === activeAirport && item.terminal === activeTerminal)

  const travellersForTerminal = useMemo(
    () => filterByTerminal(travellers),
    [travellers, activeAirport, activeTerminal],
  )

  const groupsForTerminal = useMemo(
    () => filterByTerminal(groups),
    [groups, activeAirport, activeTerminal],
  )

  const activeTravellerId =
    selectedEntity && selectedEntity.type === "traveller" ? selectedEntity.data.id : null

  const fetchArrivalInfo = async (travellerId: string) => {
    try {
      setFlightError(null)
      const traveller = travellers.find((t) => t.id === travellerId)

      if (!traveller?.flightDateTime || !traveller?.flightNumber) {
        throw new Error(TEXTS.ERRORS.TRAVELLER_OR_FLIGHT_NOT_FOUND)
      }

      const flightInfo = await fetchFlightTrackerByFlightNumber(
        traveller.flightNumber,
        traveller.flightDateTime,
      )

      setFlightInfoByTraveller((prev) => ({
        ...prev,
        [travellerId]: flightInfo,
      }))
    } catch {
      setFlightError(TEXTS.ERRORS.REFRESH_FLIGHT_ERROR)
    }
  }

  useEffect(() => {
    if (activeTravellerId && !flightInfoByTraveller[activeTravellerId] && !isRefreshingFlight) {
      void fetchArrivalInfo(activeTravellerId)
    }
  }, [activeTravellerId])

  const terminalSubtitle = `${TEXTS.LABELS.DEPARTING_FROM} ${activeAirport}, ${TEXTS.LABELS.TERMINAL_LOWER} ${activeTerminal}.`

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
                    {TEXTS.LABELS.HEADER}
                  </CardTitle>
                </div>
              </div>
              <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground/70 px-4 py-2 rounded-xl bg-muted/40 border border-border/30">
                {TEXTS.LABELS.DUMMY_DATA}
              </div>
            </div>
          </CardHeader>

          <CardContent className="px-10 pb-10 space-y-7">
            <div className="flex flex-col gap-6">
              <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
                <div className="flex flex-col gap-3 flex-1">
                  <label className="text-xs font-semibold text-muted-foreground/80 uppercase tracking-widest">
                    {TEXTS.LABELS.AIRPORT_AND_TERMINAL}
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

                <div className="flex flex-col gap-3">
                  <label className="text-xs font-semibold text-muted-foreground/80 uppercase tracking-widest">
                    {TEXTS.LABELS.VIEW}
                  </label>
                  <div className="inline-flex items-center rounded-2xl border border-border/30 bg-muted/20 p-1.5 text-sm shadow-sm relative backdrop-blur-sm">
                    <div
                      aria-hidden="true"
                      className="absolute inset-y-1.5 left-1.5 w-1/2 rounded-xl bg-primary shadow-md shadow-primary/20 transition-transform duration-300 ease-out"
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
              </div>
            </div>

            {viewMode === "individual" && (
              <ListSection
                title={TEXTS.LABELS.TRAVELLERS_TITLE}
                subtitle={terminalSubtitle}
                count={travellersForTerminal.length}
                emptyMessage={TEXTS.MESSAGES.NO_TRAVELLERS}
                animation="left"
              >
                {travellersForTerminal.map((traveller) => (
                  <TravellerCard
                    key={traveller.id}
                    traveller={traveller}
                    onClick={() => setSelectedEntity({ type: "traveller", data: traveller })}
                    formatFlightDateTime={formatFlightDateTime}
                    formatWaitTime={formatWaitTime}
                  />
                ))}
              </ListSection>
            )}

            {viewMode === "group" && (
              <ListSection
                title={TEXTS.LABELS.GROUPS_TITLE}
                subtitle={terminalSubtitle}
                count={groupsForTerminal.length}
                emptyMessage={TEXTS.MESSAGES.NO_GROUPS}
                animation="right"
              >
                {groupsForTerminal.map((group) => (
                  <GroupCard
                    key={group.id}
                    group={group}
                    onClick={() => setSelectedEntity({ type: "group", data: group })}
                    formatWaitTime={formatWaitTime}
                  />
                ))}
              </ListSection>
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
                  <TravellerModal
                    traveller={selectedEntity.data}
                    flightInfo={flightInfoByTraveller[selectedEntity.data.id]}
                    flightError={flightError}
                    isRefreshingFlight={isRefreshingFlight}
                    onRefresh={() => fetchArrivalInfo(selectedEntity.data.id)}
                    formatFlightDateTime={formatFlightDateTime}
                    formatWaitTime={formatWaitTime}
                  />
                )}

                {selectedEntity && selectedEntity.type === "group" && (
                  <GroupModal
                    group={selectedEntity.data}
                    formatWaitTime={formatWaitTime}
                  />
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


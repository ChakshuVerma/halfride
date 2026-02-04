import { useEffect, useCallback, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

import { Select, SelectContent, SelectItem, SelectTrigger } from "../ui/select";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";
import {
  UsersRound,
  Loader2,
  ArrowUpDown,
  User,
  ChevronsUpDown,
  Plane,
  Pencil,
  Mars,
  Venus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useGetTravellerApi } from "@/hooks/useGetTravellerApi";
import { useGetAirportsApi, type Airport } from "@/hooks/useGetAirportApi";
import { TravellerCard } from "./traveller-card";
import { GroupCard } from "./group-card";
import { TravellerModal } from "./traveller-modal";
import { GroupModal } from "./group-modal";
import { JoinWaitlistModal } from "./join-waitlist-modal";
import {
  type Traveller,
  type Group,
  type ViewMode,
  type SelectedEntity,
  ENTITY_TYPE,
  VIEW_MODE,
} from "./types";
import ListSection from "./list-section";

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
    MIN_DISTANCE: "Min Distance",
    WAIT_TIME: "Wait Time",
    SELECT_AIRPORT_TITLE: "Select Airport",
    SEARCH_AIRPORT_PLACEHOLDER: "Search airport...",
    JOIN_WAITLIST: "Join Waitlist",
    HERO_TITLE: "Find your travel companion",
    HERO_SUBTITLE:
      "Select your departure airport to connect with fellow travellers and groups.",
    SELECT_AIRPORT_DESC: "Choose your departure airport.",
    DETAILS: "Details",
    VIEW_MORE_INFO: "View more information.",
    DIST_SHORT: "Dist.",
    WAIT_SHORT: "Wait",
  },
  MESSAGES: {
    NO_TRAVELLERS: "No travellers found. Try changing the filter.",
    NO_GROUPS: "No groups found. Try changing the filter.",
    NO_AIRPORT_FOUND: "No airport found.",
  },
  LOADING: "Loading...",
  VALUES: {
    MALE: "Male",
    FEMALE: "Female",
    DISTANCE: "distance",
    WAIT_TIME_VAL: "wait_time",
  },
  REGEX: {
    TERMINAL_PREFIX: /Terminal\s+/i,
  },
} as const;

const filterAirports = (value: string, search: string) => {
  if (value.toLowerCase().includes(search.toLowerCase())) return 1;
  return 0;
};

interface ToggleButtonProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
}

function ToggleButton({ label, isActive, onClick, icon }: ToggleButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative z-10 flex flex-1 items-center justify-center gap-2 px-4 py-2 text-xs font-bold transition-all duration-300 rounded-lg",
        isActive
          ? "bg-background text-primary shadow-sm border border-border/20"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

const AirportTravellers = () => {
  const [selectedAirport, setSelectedAirport] = useState<string | undefined>(
    undefined,
  );
  const [viewMode, setViewMode] = useState<ViewMode>(VIEW_MODE.INDIVIDUAL);
  const [selectedEntity, setSelectedEntity] = useState<SelectedEntity>(null);
  const [travellers, setTravellers] = useState<Traveller[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [airports, setAirports] = useState<Airport[]>([]);
  const [sortBy, setSortBy] = useState<"distance" | "wait_time">(
    CONSTANTS.VALUES.DISTANCE,
  );
  const [filterGender, setFilterGender] = useState<string[]>([
    CONSTANTS.VALUES.MALE,
    CONSTANTS.VALUES.FEMALE,
  ]);
  const [filterTerminal, setFilterTerminal] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [isWaitlistModalOpen, setIsWaitlistModalOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const {
    fetchTravellers,
    fetchGroups,
    loading: isFetchingList,
  } = useGetTravellerApi();
  const {
    fetchAirports,
    fetchTerminals,
    loading: isFetchingCombos,
  } = useGetAirportsApi();
  const [terminals, setTerminals] = useState<{ id: string; name: string }[]>(
    [],
  );

  useEffect(() => {
    const loadAirports = async () => {
      const fetched = await fetchAirports();
      fetched.sort((a, b) => a.airportName.localeCompare(b.airportName));
      setAirports(fetched);
    };
    void loadAirports();
  }, []);

  useEffect(() => {
    if (!selectedAirport) {
      setTerminals([]);
      setFilterTerminal([]);
      return;
    }
    const loadData = async () => {
      const airportObj = airports.find(
        (a) => a.airportName === selectedAirport,
      );
      const code = airportObj?.airportCode;
      if (!code) return;

      const fetchedTerminals = await fetchTerminals(code);
      setTerminals(fetchedTerminals);
      setFilterTerminal(fetchedTerminals.map((t) => t.id));

      if (viewMode === VIEW_MODE.INDIVIDUAL) {
        const fetchedTravellers = await fetchTravellers(code);
        setTravellers(fetchedTravellers);
      } else {
        const fetchedGroups = await fetchGroups(selectedAirport);
        setGroups(fetchedGroups);
      }
    };
    void loadData();
  }, [viewMode, selectedAirport, airports]);

  const handleFilterToggle = useCallback(
    (
      setFilterState: React.Dispatch<React.SetStateAction<string[]>>,
      value: string,
    ) => {
      setFilterState((prev) =>
        prev.includes(value)
          ? prev.filter((item) => item !== value)
          : [...prev, value],
      );
    },
    [],
  );

  const ListSectionWrapper = useCallback(() => {
    if (!selectedAirport) return null;

    const isIndividual = viewMode === VIEW_MODE.INDIVIDUAL;
    let processedTravellers = [...travellers].filter(
      (t) =>
        filterGender.includes(t.gender) && filterTerminal.includes(t.terminal),
    );
    let processedGroups = [...groups].filter(
      (g) =>
        filterGender.includes(g.gender) && filterTerminal.includes(g.terminal),
    );

    const sortFn = (a: any, b: any) => {
      if (sortBy === CONSTANTS.VALUES.DISTANCE)
        return a.distanceFromUserKm - b.distanceFromUserKm;
      return (
        new Date(a.flightDateTime).getTime() -
        new Date(b.flightDateTime).getTime()
      );
    };

    isIndividual
      ? processedTravellers.sort(sortFn)
      : processedGroups.sort(sortFn);

    return (
      <ListSection
        title={
          isIndividual
            ? CONSTANTS.LABELS.TRAVELLERS_TITLE
            : CONSTANTS.LABELS.GROUPS_TITLE
        }
        subtitle={`${CONSTANTS.LABELS.DEPARTING_FROM} ${selectedAirport}`}
        count={
          isIndividual ? processedTravellers.length : processedGroups.length
        }
        emptyMessage={
          isIndividual
            ? CONSTANTS.MESSAGES.NO_TRAVELLERS
            : CONSTANTS.MESSAGES.NO_GROUPS
        }
        animation={isIndividual ? "left" : "right"}
        loading={isFetchingList}
        icon={
          isIndividual ? (
            <User className="w-5 h-5" />
          ) : (
            <UsersRound className="w-5 h-5" />
          )
        }
      >
        {isIndividual
          ? processedTravellers.map((t, index) => (
              <TravellerCard
                key={`${t.id}-${index}`}
                traveller={t}
                onClick={() =>
                  setSelectedEntity({ type: ENTITY_TYPE.TRAVELLER, data: t })
                }
              />
            ))
          : processedGroups.map((g, index) => (
              <GroupCard
                key={`${g.id}-${index}`}
                group={g}
                onClick={() =>
                  setSelectedEntity({ type: ENTITY_TYPE.GROUP, data: g })
                }
              />
            ))}
      </ListSection>
    );
  }, [
    selectedAirport,
    viewMode,
    travellers,
    groups,
    isFetchingList,
    sortBy,
    filterGender,
    filterTerminal,
  ]);

  const AirportSelect = ({
    large = false,
    children,
  }: {
    large?: boolean;
    children?: React.ReactNode;
  }) => (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button
            variant="outline"
            className={cn(
              "justify-between w-full h-13 rounded-2xl bg-background border-border/30",
              !selectedAirport && "text-muted-foreground",
              large && "h-14 sm:h-16 text-lg rounded-2xl",
              open && "opacity-0",
            )}
          >
            <span className="truncate">
              {selectedAirport || CONSTANTS.LABELS.SELECT_PLACEHOLDER}
            </span>
            <ChevronsUpDown
              className={cn(
                "ml-2 shrink-0 opacity-50",
                large ? "h-5 w-5" : "h-4 w-4",
              )}
            />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="p-0 overflow-hidden bg-background/80 backdrop-blur-xl border-border/20 shadow-2xl rounded-3xl w-[90vw] max-w-2xl">
        <div className="flex flex-col h-[600px]">
          <div className="px-4 py-3 border-b border-border/10 bg-muted/5">
            <DialogTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-widest pl-2">
              {CONSTANTS.LABELS.SELECT_AIRPORT_TITLE}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {CONSTANTS.LABELS.SELECT_AIRPORT_DESC}
            </DialogDescription>
          </div>
          <Command className="flex-1 bg-transparent" filter={filterAirports}>
            <CommandInput
              ref={searchInputRef}
              placeholder={CONSTANTS.LABELS.SEARCH_AIRPORT_PLACEHOLDER}
              className="border-none focus:ring-0 text-xl h-16 bg-transparent"
            />
            <CommandList className="max-h-full p-2">
              <CommandEmpty className="py-10 text-center text-muted-foreground">
                {CONSTANTS.MESSAGES.NO_AIRPORT_FOUND}
              </CommandEmpty>
              <CommandGroup>
                {airports.map((airport) => (
                  <CommandItem
                    key={airport.airportCode}
                    value={`${airport.airportName} ${airport.airportCode}`}
                    onSelect={() => {
                      setSelectedAirport(airport.airportName);
                      setOpen(false);
                    }}
                    className="flex items-center justify-between py-3 px-4 rounded-xl cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center border",
                          selectedAirport === airport.airportName
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted/30",
                        )}
                      >
                        <Plane className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-base font-medium">
                          {airport.airportName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          International Airport
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-bold font-mono px-2 py-1 rounded-md bg-muted/50 border border-border/20">
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
  );

  if (isFetchingCombos)
    return (
      <div className="flex flex-col items-center justify-center h-full py-16 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary/60" />
        <span>{CONSTANTS.LOADING}</span>
      </div>
    );

  return (
    <>
      <div className="flex items-center justify-center min-h-[50vh] p-2 sm:p-8 w-full">
        <Card className="w-full max-w-5xl border border-border/20 shadow-xl rounded-3xl bg-card/98 backdrop-blur-xl">
          {selectedAirport && (
            <CardHeader className="pt-6 sm:pt-10 pb-6 px-6 sm:px-10 border-b border-border/10">
              <div className="flex items-center gap-4 sm:gap-6">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center text-primary bg-primary/5 border border-primary/10">
                  <Plane className="w-6 h-6 sm:w-8 sm:h-8" />
                </div>
                <div className="flex items-center gap-3">
                  <CardTitle className="text-xl sm:text-3xl font-bold tracking-tight leading-tight">
                    {selectedAirport}
                  </CardTitle>
                  <AirportSelect>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-full opacity-50 hover:opacity-100"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                  </AirportSelect>
                </div>
              </div>
            </CardHeader>
          )}

          <CardContent
            className={cn(
              "px-3 sm:px-10 pb-6 transition-all duration-500",
              !selectedAirport ? "pt-20 pb-32" : "pt-6 space-y-8",
            )}
          >
            {!selectedAirport && (
              <div className="flex flex-col items-center justify-center text-center space-y-8 max-w-2xl mx-auto">
                <div className="w-24 h-24 rounded-[2rem] bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center text-primary ring-1 ring-primary/20">
                  <Plane className="w-12 h-12" />
                </div>
                <div className="space-y-4">
                  <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
                    {CONSTANTS.LABELS.HERO_TITLE}
                  </h2>
                  <p className="text-muted-foreground text-lg">
                    {CONSTANTS.LABELS.HERO_SUBTITLE}
                  </p>
                </div>
                <div className="w-full max-w-md">
                  <AirportSelect large />
                </div>
              </div>
            )}

            {selectedAirport && (
              <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* ROW 1: FILTERS & SORT (COMPACT MOBILE DESIGN) */}
                <div className="flex items-center justify-between gap-3 w-full">
                  {/* Wrapping Filters Section */}
                  <div className="flex flex-wrap items-center gap-2 flex-1">
                    {/* Gender Filters with Icons for mobile */}
                    {[CONSTANTS.VALUES.MALE, CONSTANTS.VALUES.FEMALE].map(
                      (gender) => (
                        <button
                          key={gender}
                          onClick={() =>
                            handleFilterToggle(setFilterGender, gender)
                          }
                          className={cn(
                            "px-3 sm:px-4 py-2 text-xs font-bold rounded-xl border transition-all flex items-center gap-1.5",
                            filterGender.includes(gender)
                              ? gender === CONSTANTS.VALUES.MALE
                                ? "bg-blue-600/10 text-blue-600 border-blue-600/20"
                                : "bg-pink-600/10 text-pink-600 border-pink-600/20"
                              : "bg-muted/30 text-muted-foreground border-transparent",
                          )}
                        >
                          {gender === CONSTANTS.VALUES.MALE ? (
                            <Mars className="w-3.5 h-3.5" />
                          ) : (
                            <Venus className="w-3.5 h-3.5" />
                          )}
                          <span className="hidden sm:inline">{gender}</span>
                        </button>
                      ),
                    )}

                    <div className="w-[1px] h-4 bg-border/20 mx-0.5" />

                    {/* Terminal Filters with Shortened Names (T1, T2...) for mobile */}
                    {terminals.map((t) => (
                      <button
                        key={t.id}
                        onClick={() =>
                          handleFilterToggle(setFilterTerminal, t.id)
                        }
                        className={cn(
                          "px-3 py-2 text-xs font-bold rounded-xl border transition-all whitespace-nowrap",
                          filterTerminal.includes(t.id)
                            ? "bg-foreground text-background border-foreground"
                            : "bg-muted/30 text-muted-foreground border-transparent",
                        )}
                      >
                        <span className="sm:hidden">
                          {t.name.replace(CONSTANTS.REGEX.TERMINAL_PREFIX, "T")}
                        </span>
                        <span className="hidden sm:inline">{t.name}</span>
                      </button>
                    ))}
                  </div>

                  {/* Sort: Anchored to right */}
                  <div className="shrink-0 self-start sm:self-center">
                    <Select
                      value={sortBy}
                      onValueChange={(val) =>
                        setSortBy(val as "distance" | "wait_time")
                      }
                    >
                      <SelectTrigger className="h-9 w-[110px] sm:w-[140px] bg-muted/20 border-transparent rounded-xl text-[10px] sm:text-xs font-bold">
                        <div className="flex items-center gap-1.5 sm:gap-2 truncate">
                          <ArrowUpDown className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                          {sortBy === CONSTANTS.VALUES.DISTANCE
                            ? CONSTANTS.LABELS.DIST_SHORT
                            : CONSTANTS.LABELS.WAIT_SHORT}
                        </div>
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value={CONSTANTS.VALUES.DISTANCE}>
                          {CONSTANTS.LABELS.MIN_DISTANCE}
                        </SelectItem>
                        <SelectItem value={CONSTANTS.VALUES.WAIT_TIME_VAL}>
                          {CONSTANTS.LABELS.WAIT_TIME}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* ROW 2: VIEW TOGGLE & JOIN ACTION */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border/10 pt-6">
                  <div className="flex p-1 bg-muted/40 border border-border/20 rounded-xl w-full sm:w-[280px]">
                    <ToggleButton
                      label={CONSTANTS.LABELS.INDIVIDUAL}
                      isActive={viewMode === VIEW_MODE.INDIVIDUAL}
                      onClick={() => setViewMode(VIEW_MODE.INDIVIDUAL)}
                      icon={<User className="w-3.5 h-3.5" />}
                    />
                    <ToggleButton
                      label={CONSTANTS.LABELS.GROUP}
                      isActive={viewMode === VIEW_MODE.GROUP}
                      onClick={() => setViewMode(VIEW_MODE.GROUP)}
                      icon={<UsersRound className="w-3.5 h-3.5" />}
                    />
                  </div>

                  <Button
                    onClick={() => setIsWaitlistModalOpen(true)}
                    className="w-full sm:w-auto h-11 px-6 rounded-xl font-bold uppercase tracking-widest text-[10px] bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                  >
                    <Plane className="w-3.5 h-3.5 mr-2" />{" "}
                    {CONSTANTS.LABELS.JOIN_WAITLIST}
                  </Button>
                </div>

                <ListSectionWrapper />
              </div>
            )}

            <Dialog
              open={selectedEntity !== null}
              onOpenChange={(open) => !open && setSelectedEntity(null)}
            >
              <DialogContent className="w-[90vw] max-w-xl max-h-[85vh] overflow-y-auto rounded-3xl border-border/20 bg-card/98 backdrop-blur-xl p-0">
                <DialogTitle className="sr-only">
                  {CONSTANTS.LABELS.DETAILS}
                </DialogTitle>
                <DialogDescription className="sr-only">
                  {CONSTANTS.LABELS.VIEW_MORE_INFO}
                </DialogDescription>
                {selectedEntity?.type === ENTITY_TYPE.TRAVELLER ? (
                  <TravellerModal traveller={selectedEntity.data} />
                ) : (
                  selectedEntity && <GroupModal group={selectedEntity.data} />
                )}
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>
      <JoinWaitlistModal
        open={isWaitlistModalOpen}
        onOpenChange={setIsWaitlistModalOpen}
        terminals={terminals}
        defaultTerminal={filterTerminal.length === 1 ? filterTerminal[0] : ""}
      />
    </>
  );
};

export default AirportTravellers;

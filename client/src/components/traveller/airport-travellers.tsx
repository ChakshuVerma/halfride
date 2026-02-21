import { useEffect, useCallback, useMemo, useState, useRef } from "react";
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
  MapPin,
  Search,
  Sparkles,
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
    MIN_DISTANCE: "Distance",
    WAIT_TIME: "Wait Time",
    SELECT_AIRPORT_TITLE: "Select Airport",
    SEARCH_AIRPORT_PLACEHOLDER: "Search by city or code...",
    JOIN_WAITLIST: "Post Your Flight",
    HERO_TITLE: "Find your travel companion",
    HERO_SUBTITLE:
      "Select your departure airport to connect with fellow travellers and share the ride.",
    SELECT_AIRPORT_DESC: "Choose your departure airport.",
    DETAILS: "Details",
    VIEW_MORE_INFO: "View more information.",
    DIST_SHORT: "Dist.",
    WAIT_SHORT: "Wait",
  },
  MESSAGES: {
    NO_TRAVELLERS: "No active travellers found right now.",
    NO_GROUPS: "No active groups found right now.",
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

type AirportSelectProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedAirport: Airport | undefined;
  onSelectAirport: (airport: Airport) => void;
  airports: Airport[];
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  large?: boolean;
  children?: React.ReactNode;
};

function AirportSelect({
  open,
  onOpenChange,
  selectedAirport,
  onSelectAirport,
  airports,
  searchInputRef,
  large = false,
  children,
}: AirportSelectProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {children || (
          <Button
            variant="outline"
            className={cn(
              "justify-between w-full rounded-2xl border-zinc-200 bg-white hover:bg-zinc-50 hover:border-zinc-300 transition-all duration-300 text-zinc-900",
              large
                ? "h-16 text-lg px-6 shadow-xl shadow-zinc-200/50"
                : "h-10 text-sm",
              open && "opacity-50",
            )}
          >
            <div className="flex items-center gap-3 overflow-hidden">
              <Search
                className={cn(
                  "shrink-0 text-zinc-400",
                  large ? "w-5 h-5" : "w-4 h-4",
                )}
              />
              <span className="truncate">
                {selectedAirport?.airportName ||
                  CONSTANTS.LABELS.SELECT_PLACEHOLDER}
              </span>
            </div>
            <ChevronsUpDown
              className={cn(
                "ml-2 shrink-0 text-zinc-400",
                large ? "h-5 w-5" : "h-4 w-4",
              )}
            />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="p-0 overflow-hidden bg-white/95 backdrop-blur-2xl border-zinc-200 shadow-2xl rounded-3xl w-[95vw] max-w-2xl gap-0">
        <div className="flex flex-col h-[70vh] sm:h-[600px]">
          <div className="px-4 py-4 border-b border-zinc-100">
            <DialogTitle className="text-xs font-bold text-zinc-400 uppercase tracking-widest pl-2 mb-2">
              {CONSTANTS.LABELS.SELECT_AIRPORT_TITLE}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {CONSTANTS.LABELS.SELECT_AIRPORT_DESC}
            </DialogDescription>
            <Command className="flex-1 bg-transparent" filter={filterAirports}>
              <div className="flex items-center gap-2 bg-zinc-100 px-3 rounded-xl border border-transparent focus-within:border-zinc-300 focus-within:bg-white transition-all">
                <Search className="w-5 h-5 text-zinc-400" />
                <CommandInput
                  ref={searchInputRef}
                  placeholder={CONSTANTS.LABELS.SEARCH_AIRPORT_PLACEHOLDER}
                  className="border-none focus:ring-0 text-lg h-12 bg-transparent w-full placeholder:text-zinc-400 text-zinc-900"
                />
              </div>

              <CommandList className="max-h-full p-2 mt-4 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-zinc-200">
                <CommandEmpty className="py-12 text-center flex flex-col items-center gap-3">
                  <div className="p-4 rounded-full bg-zinc-100">
                    <Plane className="w-8 h-8 text-zinc-300" />
                  </div>
                  <span className="text-zinc-500 font-medium">
                    {CONSTANTS.MESSAGES.NO_AIRPORT_FOUND}
                  </span>
                </CommandEmpty>
                <CommandGroup>
                  {airports.map((airport) => (
                    <CommandItem
                      key={airport.airportCode}
                      value={`${airport.airportName} ${airport.airportCode}`}
                      onSelect={() => {
                        if (
                          selectedAirport?.airportCode !== airport.airportCode
                        ) {
                          onSelectAirport(airport);
                        }
                        onOpenChange(false);
                      }}
                      className="group flex items-center justify-between py-3 px-4 rounded-xl cursor-pointer hover:bg-zinc-100 data-[selected=true]:bg-zinc-900 data-[selected=true]:text-white transition-all mb-1"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center border transition-colors",
                            selectedAirport?.airportCode === airport.airportCode
                              ? "bg-white text-black border-transparent"
                              : "bg-white border-zinc-200 group-hover:border-zinc-300 group-data-[selected=true]:bg-zinc-800 group-data-[selected=true]:border-zinc-700",
                          )}
                        >
                          <Plane className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-base font-semibold group-data-[selected=true]:text-white">
                            {airport.airportName}
                          </span>
                          <span className="text-xs text-zinc-500 group-data-[selected=true]:text-zinc-400">
                            International Airport
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-bold font-mono px-2 py-1 rounded-md bg-zinc-100 border border-zinc-200 group-data-[selected=true]:bg-zinc-800 group-data-[selected=true]:text-zinc-300 group-data-[selected=true]:border-zinc-700">
                        {airport.airportCode}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const AirportTravellers = () => {
  const [selectedAirport, setSelectedAirport] = useState<Airport | undefined>(
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
  const [initialDataFetchCompleted, setInitialDataFetchCompleted] =
    useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const {
    fetchTravellers,
    fetchGroups,
    fetchUserDestination,
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
  }, [fetchAirports]);

  useEffect(() => {
    if (!selectedAirport?.airportCode) return;
    const code = selectedAirport.airportCode;
    const loadData = async () => {
      const fetchedTerminals = await fetchTerminals(code);
      setTerminals(fetchedTerminals);
      setFilterTerminal(fetchedTerminals.map((t) => t.id));
    };
    void loadData();
  }, [selectedAirport, fetchTerminals]);

  const effectiveTerminals = useMemo(
    () => (selectedAirport ? terminals : []),
    [selectedAirport, terminals],
  );
  const effectiveFilterTerminal = useMemo(
    () => (selectedAirport ? filterTerminal : []),
    [selectedAirport, filterTerminal],
  );

  const [isUserInGroup, setIsUserInGroup] = useState(false);
  const [userGroupId, setUserGroupId] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedAirport?.airportCode) return;
    const loadData = async () => {
      const code = selectedAirport?.airportCode;
      if (viewMode === VIEW_MODE.INDIVIDUAL) {
        const { travellers: fetchedTravellers, isUserInGroup, userGroupId: gid } =
          await fetchTravellers(code);
        setTravellers(fetchedTravellers);
        setIsUserInGroup(isUserInGroup);
        setUserGroupId(gid);
      } else {
        const [travellersResult, fetchedGroups] = await Promise.all([
          fetchTravellers(code),
          fetchGroups(
            selectedAirport.airportCode,
            selectedAirport.airportName,
          ),
        ]);
        setTravellers(travellersResult.travellers);
        setIsUserInGroup(travellersResult.isUserInGroup);
        setUserGroupId(travellersResult.userGroupId);
        setGroups(fetchedGroups);
      }
      setInitialDataFetchCompleted(true);
    };
    void loadData();
  }, [viewMode, selectedAirport, fetchTravellers, fetchGroups]);

  const [userDestination, setUserDestination] = useState<string | null>(null);

  useEffect(() => {
    const checkUserListing = async () => {
      if (selectedAirport?.airportCode) {
        const result = await fetchUserDestination(selectedAirport.airportCode);
        setUserDestination(result);
      }
    };
    checkUserListing();
  }, [selectedAirport, fetchUserDestination]);

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

  const handleConnectionResponded = useCallback(async () => {
    if (selectedAirport?.airportCode) {
      const code = selectedAirport.airportCode;
      const [travellersResult, fetchedGroups] = await Promise.all([
        fetchTravellers(code),
        fetchGroups(code, selectedAirport.airportName),
      ]);
      setTravellers(travellersResult.travellers);
      setIsUserInGroup(travellersResult.isUserInGroup);
      setUserGroupId(travellersResult.userGroupId);
      setGroups(fetchedGroups);
    }
    setSelectedEntity(null);
  }, [selectedAirport, fetchTravellers, fetchGroups]);

  const handleLeaveGroup = useCallback(async () => {
    if (selectedAirport?.airportCode) {
      const code = selectedAirport.airportCode;
      const [travellersResult, fetchedGroups] = await Promise.all([
        fetchTravellers(code),
        fetchGroups(code, selectedAirport.airportName),
      ]);
      setTravellers(travellersResult.travellers);
      setIsUserInGroup(travellersResult.isUserInGroup);
      setUserGroupId(travellersResult.userGroupId);
      setGroups(fetchedGroups);
    }
    setSelectedEntity(null);
  }, [selectedAirport, fetchTravellers, fetchGroups]);

  const listSectionContent = useMemo(() => {
    if (!selectedAirport) return null;

    const isIndividual = viewMode === VIEW_MODE.INDIVIDUAL;
    const isTerminalVisible = (terminal: string) => {
      return (
        effectiveFilterTerminal.includes(terminal) ||
        !effectiveTerminals.some((t) => t.id === terminal)
      );
    };

    const processedTravellers = [...travellers].filter(
      (t) => filterGender.includes(t.gender) && isTerminalVisible(t.terminal),
    );
    const processedGroups = [...groups];

    const sortFn = (a: Traveller | Group, b: Traveller | Group) => {
      if (sortBy === CONSTANTS.VALUES.DISTANCE) {
        const aDist = "distanceFromUserKm" in a ? a.distanceFromUserKm : 0;
        const bDist = "distanceFromUserKm" in b ? b.distanceFromUserKm : 0;
        return aDist - bDist;
      }
      const aTime =
        "flightDateTime" in a && a.flightDateTime
          ? new Date(a.flightDateTime).getTime()
          : "createdAt" in a && a.createdAt
            ? new Date(a.createdAt).getTime()
            : 0;
      const bTime =
        "flightDateTime" in b && b.flightDateTime
          ? new Date(b.flightDateTime).getTime()
          : "createdAt" in b && b.createdAt
            ? new Date(b.createdAt).getTime()
            : 0;
      return aTime - bTime;
    };

    if (isIndividual) {
      processedTravellers.sort(sortFn);
    } else {
      processedGroups.sort(sortFn);
    }

    return (
      <ListSection
        title={
          isIndividual
            ? CONSTANTS.LABELS.TRAVELLERS_TITLE
            : CONSTANTS.LABELS.GROUPS_TITLE
        }
        subtitle={`${CONSTANTS.LABELS.DEPARTING_FROM} ${selectedAirport.airportName}`}
        count={
          isIndividual ? processedTravellers.length : processedGroups.length
        }
        emptyMessage={
          isIndividual
            ? CONSTANTS.MESSAGES.NO_TRAVELLERS
            : CONSTANTS.MESSAGES.NO_GROUPS
        }
        animation={isIndividual ? "left" : "right"}
        loading={isFetchingList || !initialDataFetchCompleted}
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
                hasListing={!!userDestination}
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
    effectiveFilterTerminal,
    effectiveTerminals,
    initialDataFetchCompleted,
    userDestination,
  ]);

  if (isFetchingCombos)
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-900" />
        <span className="text-zinc-500 text-sm font-medium animate-pulse">
          {CONSTANTS.LOADING}
        </span>
      </div>
    );

  return (
    <>
      <div className="flex items-start sm:items-center justify-center min-h-[85vh] p-2 sm:p-6 w-full max-w-7xl mx-auto">
        <Card
          className={cn(
            "w-full border-zinc-200/50 shadow-2xl shadow-zinc-200/50 transition-all duration-700 ease-out",
            // Glassmorphism - kept light/neutral
            "bg-white/70 backdrop-blur-xl",
            !selectedAirport
              ? "rounded-[3rem] max-w-3xl border-white/40"
              : "rounded-[2.5rem] max-w-6xl",
          )}
        >
          {selectedAirport && (
            <CardHeader className="pt-8 pb-6 px-6 sm:px-10 border-b border-zinc-100">
              <div className="flex flex-col sm:flex-row sm:items-center gap-6 justify-between">
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center text-white bg-zinc-900 shadow-lg shadow-zinc-200">
                    <span className="text-xl sm:text-2xl font-black tracking-tighter">
                      {selectedAirport.airportCode}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <CardTitle className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900">
                      {selectedAirport.airportName}
                    </CardTitle>
                    <div className="flex items-center gap-2 text-sm text-zinc-500 font-medium">
                      <MapPin className="w-4 h-4" />
                      <span>Viewing active travellers</span>
                    </div>
                  </div>
                </div>

                <div className="w-full sm:w-auto">
                  <AirportSelect
                    open={open}
                    onOpenChange={setOpen}
                    selectedAirport={selectedAirport}
                    onSelectAirport={setSelectedAirport}
                    airports={airports}
                    searchInputRef={searchInputRef}
                  >
                    <Button
                      variant="outline"
                      className="rounded-full border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 transition-all group"
                    >
                      Change Airport
                      <Pencil className="w-3.5 h-3.5 ml-2 text-zinc-400 group-hover:text-zinc-900 transition-colors" />
                    </Button>
                  </AirportSelect>
                </div>
              </div>
            </CardHeader>
          )}

          <CardContent
            className={cn(
              "px-3 sm:px-10 transition-all duration-500",
              !selectedAirport ? "py-20 sm:py-24" : "py-8 space-y-8",
            )}
          >
            {/* EMPTY STATE / HERO */}
            {!selectedAirport && (
              <div className="flex flex-col items-center justify-center text-center space-y-10 max-w-2xl mx-auto animate-in fade-in zoom-in-95 duration-700">
                <div className="relative group cursor-pointer">
                  {/* Glow effect - Monochrome */}
                  <div className="absolute inset-0 bg-zinc-200 rounded-full blur-3xl opacity-50 group-hover:opacity-80 transition-opacity duration-1000"></div>

                  <div className="w-28 h-28 rounded-[2.5rem] bg-white border border-zinc-100 shadow-2xl flex items-center justify-center relative z-10 group-hover:scale-105 transition-transform duration-500">
                    <div className="w-24 h-24 rounded-[2rem] bg-zinc-900 flex items-center justify-center text-white shadow-inner">
                      <Plane className="w-12 h-12 transform -rotate-45 group-hover:rotate-0 transition-transform duration-500" />
                    </div>
                  </div>
                  {/* Decor elements */}
                  <div className="absolute -top-4 -right-4 w-12 h-12 bg-white border border-zinc-100 rounded-full flex items-center justify-center shadow-lg animate-bounce delay-100 z-20">
                    <UsersRound className="w-6 h-6 text-zinc-900" />
                  </div>
                </div>

                <div className="space-y-4">
                  <h2 className="text-4xl sm:text-6xl font-bold tracking-tighter text-zinc-900">
                    Find your <br className="sm:hidden" />
                    <span className="text-zinc-400">travel buddy.</span>
                  </h2>
                  <p className="text-zinc-500 text-lg sm:text-xl max-w-md mx-auto leading-relaxed">
                    {CONSTANTS.LABELS.HERO_SUBTITLE}
                  </p>
                </div>

                <div className="w-full max-w-md transform transition-all hover:scale-[1.02]">
                  <AirportSelect
                    open={open}
                    onOpenChange={setOpen}
                    selectedAirport={selectedAirport}
                    onSelectAirport={setSelectedAirport}
                    airports={airports}
                    searchInputRef={searchInputRef}
                    large
                  />
                  <div className="flex justify-center gap-6 mt-8 text-[10px] text-zinc-400 font-bold uppercase tracking-[0.2em]">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3" /> Safe
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3" /> Verified
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3" /> Split Cost
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* DASHBOARD CONTENT */}
            {selectedAirport && (
              <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
                {/* CONTROLS BAR */}
                <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6 p-1">
                  {/* LEFT: FILTERS */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full xl:w-auto">
                    {/* Gender Pill - Monochrome */}
                    <div className="flex items-center p-1 bg-zinc-100 border border-zinc-200 rounded-xl">
                      {[CONSTANTS.VALUES.MALE, CONSTANTS.VALUES.FEMALE].map(
                        (gender) => (
                          <button
                            key={gender}
                            onClick={() =>
                              handleFilterToggle(setFilterGender, gender)
                            }
                            className={cn(
                              "px-3 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 border border-transparent",
                              filterGender.includes(gender)
                                ? "bg-white shadow-sm border-zinc-200 text-zinc-900"
                                : "text-zinc-400 hover:text-zinc-900 hover:bg-zinc-200/50",
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
                    </div>

                    <div className="hidden sm:block w-px h-8 bg-zinc-200" />

                    {/* Terminal Scroll Container - Monochrome */}
                    <div className="w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0 scrollbar-hide">
                      <div className="flex items-center gap-2">
                        {effectiveTerminals.map((t) => (
                          <button
                            key={t.id}
                            onClick={() =>
                              handleFilterToggle(setFilterTerminal, t.id)
                            }
                            className={cn(
                              "px-3 py-1.5 text-xs font-bold rounded-lg border transition-all whitespace-nowrap",
                              effectiveFilterTerminal.includes(t.id)
                                ? "bg-zinc-900 text-white border-zinc-900 shadow-md shadow-zinc-200"
                                : "bg-white text-zinc-500 border-zinc-200 hover:border-zinc-300 hover:text-zinc-900",
                            )}
                          >
                            {/* Short name for mobile, full for desktop */}
                            <span className="sm:hidden">
                              {t.name.replace(
                                CONSTANTS.REGEX.TERMINAL_PREFIX,
                                "T",
                              )}
                            </span>
                            <span className="hidden sm:inline">{t.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* RIGHT: SORT & VIEW */}
                  <div className="flex items-center justify-between gap-4 w-full xl:w-auto">
                    <Select
                      value={sortBy}
                      onValueChange={(val) =>
                        setSortBy(val as "distance" | "wait_time")
                      }
                    >
                      <SelectTrigger className="h-10 w-[140px] bg-white border-zinc-200 rounded-xl text-xs font-bold text-zinc-700 hover:border-zinc-300 focus:ring-0">
                        <div className="flex items-center gap-2">
                          <ArrowUpDown className="w-3.5 h-3.5 text-zinc-400" />
                          <span>
                            {sortBy === CONSTANTS.VALUES.DISTANCE
                              ? CONSTANTS.LABELS.MIN_DISTANCE
                              : CONSTANTS.LABELS.WAIT_TIME}
                          </span>
                        </div>
                      </SelectTrigger>
                      <SelectContent className="rounded-xl p-1 border-zinc-200 shadow-xl">
                        <SelectItem
                          value={CONSTANTS.VALUES.DISTANCE}
                          className="rounded-lg text-xs font-medium focus:bg-zinc-100 focus:text-zinc-900"
                        >
                          Sort by Distance
                        </SelectItem>
                        <SelectItem
                          value={CONSTANTS.VALUES.WAIT_TIME_VAL}
                          className="rounded-lg text-xs font-medium focus:bg-zinc-100 focus:text-zinc-900"
                        >
                          Sort by Wait Time
                        </SelectItem>
                      </SelectContent>
                    </Select>

                    {/* View Toggle - Monochrome */}
                    <div className="flex p-1 bg-zinc-100 border border-zinc-200 rounded-xl">
                      <button
                        onClick={() => setViewMode(VIEW_MODE.INDIVIDUAL)}
                        className={cn(
                          "p-2 rounded-lg transition-all",
                          viewMode === VIEW_MODE.INDIVIDUAL
                            ? "bg-white shadow-sm text-zinc-900 border border-zinc-200"
                            : "text-zinc-400 hover:text-zinc-900",
                        )}
                      >
                        <User className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setViewMode(VIEW_MODE.GROUP)}
                        className={cn(
                          "p-2 rounded-lg transition-all",
                          viewMode === VIEW_MODE.GROUP
                            ? "bg-white shadow-sm text-zinc-900 border border-zinc-200"
                            : "text-zinc-400 hover:text-zinc-900",
                        )}
                      >
                        <UsersRound className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="h-px bg-zinc-100" />

                {/* USER STATUS / ACTION */}
                <div className="flex justify-center">
                  {userDestination
                    ? initialDataFetchCompleted && (
                        <div className="inline-flex items-center gap-3 pl-4 pr-6 py-2 bg-zinc-50 text-zinc-900 rounded-full border border-zinc-200 animate-in zoom-in duration-300">
                          <div className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-zinc-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-zinc-900"></span>
                          </div>
                          <span className="text-sm font-medium">
                            You are listed for{" "}
                            <span className="font-bold">{userDestination}</span>
                          </span>
                        </div>
                      )
                    : initialDataFetchCompleted && (
                        <Button
                          onClick={() => setIsWaitlistModalOpen(true)}
                          className="h-12 px-8 rounded-full font-bold shadow-xl shadow-zinc-300/40 hover:shadow-zinc-300/60 hover:-translate-y-0.5 transition-all bg-zinc-900 hover:bg-black text-white"
                        >
                          <Plane className="w-4 h-4 mr-2" />
                          {CONSTANTS.LABELS.JOIN_WAITLIST}
                        </Button>
                      )}
                </div>

                {/* MAIN LIST */}
                <div className="min-h-[300px]">
                  {listSectionContent}
                </div>
              </div>
            )}

            {/* MODALS */}
            <Dialog
              open={selectedEntity !== null}
              onOpenChange={(open) => !open && setSelectedEntity(null)}
            >
              <DialogContent className="w-[95vw] max-w-xl max-h-[85vh] overflow-y-auto rounded-3xl border-zinc-200 bg-white/95 backdrop-blur-xl p-0 shadow-2xl">
                <DialogTitle className="sr-only">
                  {CONSTANTS.LABELS.DETAILS}
                </DialogTitle>
                <DialogDescription className="sr-only">
                  {CONSTANTS.LABELS.VIEW_MORE_INFO}
                </DialogDescription>
                {selectedEntity?.type === ENTITY_TYPE.TRAVELLER ? (
                  <TravellerModal
                    traveller={selectedEntity.data}
                    isUserInGroup={isUserInGroup}
                    onConnectionResponded={handleConnectionResponded}
                  />
                ) : (
                  selectedEntity && (
                    <GroupModal
                      group={selectedEntity.data}
                      isCurrentUserInGroup={
                        userGroupId != null &&
                        userGroupId === selectedEntity.data.id
                      }
                      onLeaveGroup={handleLeaveGroup}
                    />
                  )
                )}
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>
      {selectedAirport && (
        <JoinWaitlistModal
          currentAirport={selectedAirport}
          open={isWaitlistModalOpen}
          onOpenChange={setIsWaitlistModalOpen}
          terminals={effectiveTerminals}
        />
      )}
    </>
  );
};

export default AirportTravellers;

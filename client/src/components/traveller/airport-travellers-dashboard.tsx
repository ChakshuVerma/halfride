import { useEffect, useCallback, useMemo, useState } from "react";
import { Card, CardContent } from "../ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger } from "../ui/select";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";
import {
  UsersRound,
  ArrowUpDown,
  User,
  Plane,
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
import { AirportHeader } from "./airport-header";
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
  LABELS: {
    TRAVELLERS_TITLE: "Travellers",
    GROUPS_TITLE: "Groups",
    DEPARTING_FROM: "Departing from",
    MIN_DISTANCE: "Distance",
    WAIT_TIME: "Wait Time",
    JOIN_WAITLIST: "Post Your Flight",
    DETAILS: "Details",
    VIEW_MORE_INFO: "View more information.",
  },
  MESSAGES: {
    NO_TRAVELLERS: "No active travellers found right now.",
    NO_GROUPS: "No active groups found right now.",
  },
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

export type AirportTravellersDashboardProps = {
  selectedAirport: Airport;
  airports: Airport[];
  onSelectAirport: (airport: Airport) => void;
  selectOpen: boolean;
  onSelectOpenChange: (open: boolean) => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
};

export function AirportTravellersDashboard({
  selectedAirport,
  airports,
  onSelectAirport,
  selectOpen,
  onSelectOpenChange,
  searchInputRef,
}: AirportTravellersDashboardProps) {
  const [viewMode, setViewMode] = useState<ViewMode>(VIEW_MODE.INDIVIDUAL);
  const [selectedEntity, setSelectedEntity] = useState<SelectedEntity>(null);
  const [travellers, setTravellers] = useState<Traveller[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [sortBy, setSortBy] = useState<"distance" | "wait_time">(
    CONSTANTS.VALUES.DISTANCE,
  );
  const [filterGender, setFilterGender] = useState<string[]>([
    CONSTANTS.VALUES.MALE,
    CONSTANTS.VALUES.FEMALE,
  ]);
  const [filterTerminal, setFilterTerminal] = useState<string[]>([]);
  const [isWaitlistModalOpen, setIsWaitlistModalOpen] = useState(false);
  const [initialDataFetchCompleted, setInitialDataFetchCompleted] =
    useState(false);
  const [terminals, setTerminals] = useState<{ id: string; name: string }[]>([]);
  const [isUserInGroup, setIsUserInGroup] = useState(false);
  const [userGroupId, setUserGroupId] = useState<string | null>(null);
  const [userDestination, setUserDestination] = useState<string | null>(null);

  const {
    fetchTravellers,
    fetchGroups,
    fetchUserDestination,
    revokeListing,
    fetchTravellersLoading,
    fetchGroupsLoading,
    revokeListingLoading,
  } = useGetTravellerApi();
  const { fetchTerminals } = useGetAirportsApi();

  const isFetchingList = fetchTravellersLoading || fetchGroupsLoading;

  const effectiveTerminals = useMemo(() => terminals, [terminals]);
  const effectiveFilterTerminal = useMemo(() => filterTerminal, [filterTerminal]);

  useEffect(() => {
    const code = selectedAirport.airportCode;
    const loadData = async () => {
      const fetchedTerminals = await fetchTerminals(code);
      setTerminals(fetchedTerminals);
      setFilterTerminal(fetchedTerminals.map((t) => t.id));
    };
    void loadData();
  }, [selectedAirport, fetchTerminals]);

  useEffect(() => {
    const code = selectedAirport.airportCode;
    const loadData = async () => {
      try {
        if (viewMode === VIEW_MODE.INDIVIDUAL) {
          const {
            travellers: fetchedTravellers,
            isUserInGroup,
            userGroupId: gid,
          } = await fetchTravellers(code);
          setTravellers(fetchedTravellers);
          setIsUserInGroup(isUserInGroup);
          setUserGroupId(gid);
        } else {
          const [travellersResult, fetchedGroups] = await Promise.all([
            fetchTravellers(code),
            fetchGroups(selectedAirport.airportCode, selectedAirport.airportName),
          ]);
          setTravellers(travellersResult.travellers);
          setIsUserInGroup(travellersResult.isUserInGroup);
          setUserGroupId(travellersResult.userGroupId);
          setGroups(fetchedGroups);
        }
        setInitialDataFetchCompleted(true);
      } catch {
        // loading state is handled by hooks
      }
    };
    void loadData();
  }, [viewMode, selectedAirport, fetchTravellers, fetchGroups]);

  useEffect(() => {
    const checkUserListing = async () => {
      const result = await fetchUserDestination(selectedAirport.airportCode);
      setUserDestination(result);
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

  const refreshAirportData = useCallback(async () => {
    const code = selectedAirport.airportCode;
    const [travellersResult, fetchedGroups] = await Promise.all([
      fetchTravellers(code),
      fetchGroups(code, selectedAirport.airportName),
    ]);
    setTravellers(travellersResult.travellers);
    setIsUserInGroup(travellersResult.isUserInGroup);
    setUserGroupId(travellersResult.userGroupId);
    setGroups(fetchedGroups);
  }, [selectedAirport, fetchTravellers, fetchGroups]);

  const handleConnectionResponded = useCallback(async () => {
    await refreshAirportData();
    setSelectedEntity(null);
  }, [refreshAirportData]);

  const handleLeaveGroup = useCallback(async () => {
    await refreshAirportData();
    setSelectedEntity(null);
  }, [refreshAirportData]);

  const handleJoinRequestSuccess = useCallback(async () => {
    await refreshAirportData();
    setSelectedEntity(null);
  }, [refreshAirportData]);

  const handleWaitlistSuccess = useCallback(async () => {
    const code = selectedAirport.airportCode;
    const [destination, travellersResult] = await Promise.all([
      fetchUserDestination(code),
      fetchTravellers(code),
    ]);
    setUserDestination(destination);
    setTravellers(travellersResult.travellers);
    setIsUserInGroup(travellersResult.isUserInGroup);
    setUserGroupId(travellersResult.userGroupId);
  }, [selectedAirport, fetchUserDestination, fetchTravellers]);

  const handleRevokeListing = useCallback(
    async (closeModalAfter?: boolean): Promise<boolean> => {
      if (!selectedAirport?.airportCode || revokeListingLoading) return false;
      const result = await revokeListing(selectedAirport.airportCode);
      if (result.ok) {
        setUserDestination(null);
        setIsUserInGroup(false);
        setUserGroupId(null);
        const code = selectedAirport.airportCode;
        const [travellersResult, fetchedGroups] = await Promise.all([
          fetchTravellers(code),
          fetchGroups(selectedAirport.airportCode, selectedAirport.airportName),
        ]);
        setTravellers(travellersResult.travellers);
        setGroups(fetchedGroups);
        if (closeModalAfter) setSelectedEntity(null);
        return true;
      }
      return false;
    },
    [
      selectedAirport,
      revokeListing,
      revokeListingLoading,
      fetchTravellers,
      fetchGroups,
    ],
  );

  const listSectionContent = useMemo(() => {
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

    let processedGroups: Group[];
    if (isIndividual) {
      processedTravellers.sort(sortFn);
      processedGroups = [];
    } else {
      const userGroup = userGroupId
        ? groups.find((g) => g.id === userGroupId)
        : null;
      const otherGroups = userGroupId
        ? groups.filter((g) => g.id !== userGroupId)
        : [...groups];
      otherGroups.sort(sortFn);
      processedGroups = userGroup ? [userGroup, ...otherGroups] : otherGroups;
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
                isYourGroup={userGroupId != null && g.id === userGroupId}
              />
            ))}
      </ListSection>
    );
  }, [
    selectedAirport,
    viewMode,
    travellers,
    groups,
    userGroupId,
    isFetchingList,
    sortBy,
    filterGender,
    effectiveFilterTerminal,
    effectiveTerminals,
    initialDataFetchCompleted,
    userDestination,
  ]);

  return (
    <>
      <div className="flex items-start sm:items-center justify-center min-h-[85vh] p-2 sm:p-6 w-full max-w-7xl mx-auto">
        <Card
          className={cn(
            "w-full border-zinc-200/50 shadow-2xl shadow-zinc-200/50 transition-all duration-700 ease-out",
            "bg-white/70 backdrop-blur-xl",
            "rounded-[2.5rem] max-w-6xl",
          )}
        >
          <AirportHeader
            selectedAirport={selectedAirport}
            airports={airports}
            onSelectAirport={onSelectAirport}
            selectOpen={selectOpen}
            onSelectOpenChange={onSelectOpenChange}
            searchInputRef={searchInputRef}
          />

          <CardContent className="px-3 sm:px-10 py-8 space-y-8 transition-all duration-500">
            <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
              {/* CONTROLS BAR */}
              <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6 p-1">
                {/* LEFT: FILTERS */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full xl:w-auto">
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

                  {viewMode === VIEW_MODE.INDIVIDUAL && (
                    <>
                      <div className="hidden sm:block w-px h-8 bg-zinc-200" />
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
                    </>
                  )}
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
                {userDestination && !isUserInGroup
                  ? initialDataFetchCompleted && (
                      <div className="inline-flex items-center gap-3 pl-4 pr-2 py-2 bg-zinc-50 text-zinc-900 rounded-full border border-zinc-200 animate-in zoom-in duration-300">
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
                  : userDestination && isUserInGroup
                    ? initialDataFetchCompleted && (
                        <div className="inline-flex items-center gap-3 pl-4 pr-6 py-2 bg-zinc-50 text-zinc-900 rounded-full border border-zinc-200 animate-in zoom-in duration-300">
                          <div className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-zinc-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-zinc-900"></span>
                          </div>
                          <span className="text-sm font-medium">
                            You are listed for{" "}
                            <span className="font-bold">
                              {userDestination}
                            </span>
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
              <div className="min-h-[300px]">{listSectionContent}</div>
            </div>

            {/* MODALS */}
            <Dialog
              open={selectedEntity !== null}
              onOpenChange={(open) => !open && setSelectedEntity(null)}
            >
              <DialogContent className="w-[95vw] max-w-xl max-h-[85vh] overflow-y-auto rounded-3xl border-zinc-200 bg-white/95 backdrop-blur-xl p-0 shadow-2xl [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
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
                    onRevokeListing={
                      selectedEntity.data.isOwnListing
                        ? async () => {
                            await handleRevokeListing(true);
                          }
                        : undefined
                    }
                    isRevokingListing={revokeListingLoading}
                  />
                ) : (
                  selectedEntity && (
                    <GroupModal
                      group={selectedEntity.data}
                      isCurrentUserInGroup={
                        userGroupId != null &&
                        userGroupId === selectedEntity.data.id
                      }
                      hasListingAtThisAirport={!!userDestination}
                      onLeaveGroup={handleLeaveGroup}
                      onJoinRequestSuccess={handleJoinRequestSuccess}
                      onGroupNameUpdated={refreshAirportData}
                    />
                  )
                )}
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>
      <JoinWaitlistModal
        currentAirport={selectedAirport}
        open={isWaitlistModalOpen}
        onOpenChange={setIsWaitlistModalOpen}
        onSuccess={handleWaitlistSuccess}
        terminals={effectiveTerminals}
      />
    </>
  );
}

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent } from "../ui/card";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";
import { User, UsersRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { type Airport } from "@/hooks/useGetAirportApi";
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
  ENTITY_TYPE,
  VIEW_MODE,
} from "./types";
import { ListSection } from "@/components/common/ListSection";
import { TravellerFilters } from "./TravellerFilters";
import { UserListingBanner } from "./UserListingBanner";
import { useAirportTravellersDashboard } from "@/hooks/useAirportTravellersDashboard";

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
  const [sortBy, setSortBy] = useState<"distance" | "wait_time">(
    CONSTANTS.VALUES.DISTANCE,
  );
  const [filterGender, setFilterGender] = useState<string[]>([
    CONSTANTS.VALUES.MALE,
    CONSTANTS.VALUES.FEMALE,
  ]);
  const [filterTerminal, setFilterTerminal] = useState<string[]>([]);
  const [isWaitlistModalOpen, setIsWaitlistModalOpen] = useState(false);
  const {
    travellers,
    groups,
    terminals,
    isFetchingList,
    initialDataFetchCompleted,
    isUserInGroup,
    userGroupId,
    userDestination,
    selectedEntity,
    setSelectedEntity,
    clearModalParamsFromUrl,
    handleConnectionResponded,
    handleLeaveGroup,
    handleJoinRequestSuccess,
    handleWaitlistSuccess,
    handleRevokeListing,
    revokeListingLoading,
    handleVerifyAtTerminal,
    verifyAtTerminalLoading,
    userReadyToOnboard,
    refreshAirportData,
    fetchTravellerDetail,
  } = useAirportTravellersDashboard(selectedAirport);

  const effectiveTerminals = useMemo(() => terminals, [terminals]);
  const effectiveFilterTerminal = useMemo(() => filterTerminal, [filterTerminal]);

  const hasInitializedTerminalFilter = useRef(false);
  useEffect(() => {
    if (terminals.length > 0 && !hasInitializedTerminalFilter.current) {
      hasInitializedTerminalFilter.current = true;
      setFilterTerminal(terminals.map((t) => t.id));
    }
  }, [terminals]);

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

  const handleOpenTraveller = useCallback(
    (t: Traveller) => {
      setSelectedEntity({ type: ENTITY_TYPE.TRAVELLER, data: t });
    },
    [setSelectedEntity],
  );

  const handleOpenGroup = useCallback(
    (g: Group) => {
      setSelectedEntity({ type: ENTITY_TYPE.GROUP, data: g });
    },
    [setSelectedEntity],
  );

  const listSectionContent = useMemo(() => {
    const isIndividual = viewMode === VIEW_MODE.INDIVIDUAL;
    const isTerminalVisible = (terminal: string) => {
      return (
        effectiveFilterTerminal.includes(terminal) ||
        !effectiveTerminals.some((t) => t.id === terminal)
      );
    };

    const ownListing = travellers.find((t) => t.isOwnListing);

    let processedTravellers = [...travellers].filter(
      (t) =>
        !t.isOwnListing &&
        filterGender.includes(t.gender) &&
        isTerminalVisible(t.terminal),
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
      const otherTravellers = processedTravellers;
      otherTravellers.sort(sortFn);
      processedTravellers = ownListing
        ? [ownListing, ...otherTravellers]
        : otherTravellers;
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
                onClick={() => handleOpenTraveller(t)}
                hasListing={!!userDestination}
              />
            ))
          : processedGroups.map((g, index) => (
              <GroupCard
                key={`${g.id}-${index}`}
                group={g}
                onClick={() => handleOpenGroup(g)}
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
    handleOpenTraveller,
    handleOpenGroup,
  ]);

  return (
    <>
      <div className="flex items-start sm:items-center justify-center min-h-[85vh] p-2 sm:p-6 w-full max-w-7xl mx-auto">
        <Card
          className={cn(
            "w-full border-border shadow-2xl transition-all duration-700 ease-out",
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
              <TravellerFilters
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                sortBy={sortBy}
                onSortByChange={(val) => setSortBy(val)}
                genderFilter={filterGender}
                onToggleGender={(gender) =>
                  handleFilterToggle(setFilterGender, gender)
                }
                terminals={effectiveTerminals}
                terminalFilter={effectiveFilterTerminal}
                onToggleTerminal={(id) =>
                  handleFilterToggle(setFilterTerminal, id)
                }
                showTerminalFilters={viewMode === VIEW_MODE.INDIVIDUAL}
              />

              <div className="h-px bg-border" />

              {/* USER STATUS / ACTION */}
              <div className="flex justify-center">
                <UserListingBanner
                  userDestination={userDestination}
                  isUserInGroup={isUserInGroup}
                  userGroupId={userGroupId}
                  userReadyToOnboard={userReadyToOnboard}
                  initialDataFetchCompleted={initialDataFetchCompleted}
                  joinWaitlistLabel={CONSTANTS.LABELS.JOIN_WAITLIST}
                  onOpenWaitlist={() => setIsWaitlistModalOpen(true)}
                  onVerifyAtTerminal={handleVerifyAtTerminal}
                  verifyAtTerminalLoading={verifyAtTerminalLoading}
                />
              </div>

              {/* MAIN LIST */}
              <div className="min-h-[300px]">{listSectionContent}</div>
            </div>

            {/* MODALS */}
            <Dialog
              open={selectedEntity !== null}
              onOpenChange={(open) => {
                if (!open) {
                  setSelectedEntity(null);
                  clearModalParamsFromUrl();
                }
              }}
            >
              <DialogContent
                className="w-[95vw] max-w-xl rounded-3xl border-border bg-card/95 backdrop-blur-xl p-0 shadow-2xl [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                onInteractOutside={(e) => e.preventDefault()}
                onEscapeKeyDown={(e) => e.preventDefault()}
              >
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
                    onFetchTravellerDetail={fetchTravellerDetail}
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
                      userReadyToOnboard={userReadyToOnboard}
                      onOpenChat={() => {
                        setSelectedEntity(null);
                        clearModalParamsFromUrl();
                      }}
                      onLeaveGroup={handleLeaveGroup}
                      onJoinRequestSuccess={handleJoinRequestSuccess}
                      onGroupNameUpdated={refreshAirportData}
                      onVerifyAtTerminal={handleVerifyAtTerminal}
                      verifyAtTerminalLoading={verifyAtTerminalLoading}
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

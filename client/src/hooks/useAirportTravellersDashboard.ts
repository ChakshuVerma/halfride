import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useGetTravellerApi } from "@/hooks/useGetTravellerApi";
import { useGetAirportsApi, type Airport } from "@/hooks/useGetAirportApi";
import {
  type Traveller,
  type Group,
  type SelectedEntity,
  ENTITY_TYPE,
} from "@/components/traveller/types";

export type UseAirportTravellersDashboardResult = {
  travellers: Traveller[];
  groups: Group[];
  terminals: { id: string; name: string }[];
  isFetchingList: boolean;
  initialDataFetchCompleted: boolean;
  isUserInGroup: boolean;
  userGroupId: string | null;
  userDestination: string | null;
  hasActiveListingAnywhere: boolean;
  selectedEntity: SelectedEntity;
  setSelectedEntity: (entity: SelectedEntity) => void;
  clearModalParamsFromUrl: () => void;
  handleConnectionResponded: () => Promise<void>;
  handleLeaveGroup: () => Promise<void>;
  handleJoinRequestSuccess: () => Promise<void>;
  handleWaitlistSuccess: () => Promise<void>;
  handleRevokeListing: (closeModalAfter?: boolean) => Promise<boolean>;
  revokeListingLoading: boolean;
  handleVerifyAtTerminal: () => Promise<void>;
  verifyAtTerminalLoading: boolean;
  userReadyToOnboard: boolean;
  refreshAirportData: () => Promise<{
    travellers: Traveller[];
    groups: Group[];
  }>;
  fetchTravellerDetail: (userId: string) => Promise<Traveller | null>;
};

export function useAirportTravellersDashboard(
  selectedAirport: Airport,
): UseAirportTravellersDashboardResult {
  const [travellers, setTravellers] = useState<Traveller[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [terminals, setTerminals] = useState<{ id: string; name: string }[]>([]);
  const [initialDataFetchCompleted, setInitialDataFetchCompleted] =
    useState(false);
  const [isUserInGroup, setIsUserInGroup] = useState(false);
  const [userGroupId, setUserGroupId] = useState<string | null>(null);
  const [userReadyToOnboard, setUserReadyToOnboard] = useState(false);
  const [userDestination, setUserDestination] = useState<string | null>(null);
  const [hasActiveListingAnywhere, setHasActiveListingAnywhere] =
    useState(false);
  const [selectedEntity, setSelectedEntity] = useState<SelectedEntity>(null);
  const lastRefetchedEntityRef = useRef<{
    type: "traveller" | "group";
    id: string;
  } | null>(null);

  const [searchParams, setSearchParams] = useSearchParams();

  const clearModalParamsFromUrl = useCallback(() => {
    const next = new URLSearchParams(searchParams);
    next.delete("group");
    next.delete("traveller");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const {
    fetchTravellers,
    fetchGroups,
    fetchGroupById,
    fetchTravellerByAirportAndUser,
    fetchUserDestination,
    fetchHasActiveListing,
    revokeListing,
    verifyAtTerminal,
    fetchTravellersLoading,
    fetchGroupsLoading,
    revokeListingLoading,
    verifyAtTerminalLoading,
  } = useGetTravellerApi();
  const { fetchTerminals } = useGetAirportsApi();

  const isFetchingList = fetchTravellersLoading || fetchGroupsLoading;

  useEffect(() => {
    const code = selectedAirport.airportCode;
    const name = selectedAirport.airportName;
    let cancelled = false;

    const loadData = async () => {
      try {
        const [
          fetchedTerminals,
          travellersResult,
          fetchedGroups,
          destination,
          hasActiveAnywhere,
        ] = await Promise.all([
          fetchTerminals(code),
          fetchTravellers(code),
          fetchGroups(code, name),
          fetchUserDestination(code),
          fetchHasActiveListing(),
        ]);

        if (cancelled) return;

        setTerminals(fetchedTerminals);
        setTravellers(travellersResult.travellers);
        setIsUserInGroup(travellersResult.isUserInGroup);
        setUserGroupId(travellersResult.userGroupId);
        setUserReadyToOnboard(travellersResult.userReadyToOnboard ?? false);
        setGroups(fetchedGroups);
        setUserDestination(destination);
        setHasActiveListingAnywhere(hasActiveAnywhere);
        setInitialDataFetchCompleted(true);
      } catch {
        if (!cancelled) {
          // Loading and error states are handled by hooks / consumers.
        }
      }
    };

    void loadData();
    return () => {
      cancelled = true;
    };
  }, [selectedAirport, fetchTerminals, fetchTravellers, fetchGroups, fetchUserDestination, fetchHasActiveListing]);

  useEffect(() => {
    if (!selectedEntity) {
      lastRefetchedEntityRef.current = null;
      return;
    }

    if (selectedEntity.type === ENTITY_TYPE.GROUP) {
      const airportName = selectedAirport.airportName;
      const id = selectedEntity.data.id;

      if (
        lastRefetchedEntityRef.current?.type === "group" &&
        lastRefetchedEntityRef.current?.id === id
      ) {
        return;
      }

      lastRefetchedEntityRef.current = { type: "group", id };
      fetchGroupById(id, airportName).then((fresh) => {
        if (!fresh) return;
        setSelectedEntity((prev) =>
          prev?.type === ENTITY_TYPE.GROUP && prev.data.id === id
            ? { type: ENTITY_TYPE.GROUP, data: fresh }
            : prev,
        );
      });
    }
  }, [selectedEntity, selectedAirport.airportName, fetchGroupById]);

  const refreshAirportData = useCallback(async () => {
    const code = selectedAirport.airportCode;
    const [travellersResult, fetchedGroups] = await Promise.all([
      fetchTravellers(code),
      fetchGroups(code, selectedAirport.airportName),
    ]);

    setTravellers(travellersResult.travellers);
    setIsUserInGroup(travellersResult.isUserInGroup);
    setUserGroupId(travellersResult.userGroupId);
    setUserReadyToOnboard(travellersResult.userReadyToOnboard ?? false);
    setGroups(fetchedGroups);

    return {
      travellers: travellersResult.travellers,
      groups: fetchedGroups,
    };
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
    const [destination, travellersResult, hasActiveAnywhere] = await Promise.all([
      fetchUserDestination(code),
      fetchTravellers(code),
      fetchHasActiveListing(),
    ]);
    setUserDestination(destination);
    setTravellers(travellersResult.travellers);
    setIsUserInGroup(travellersResult.isUserInGroup);
    setUserGroupId(travellersResult.userGroupId);
    setUserReadyToOnboard(travellersResult.userReadyToOnboard ?? false);
    setHasActiveListingAnywhere(hasActiveAnywhere);
  }, [selectedAirport, fetchUserDestination, fetchTravellers, fetchHasActiveListing]);

  const handleRevokeListing = useCallback(
    async (closeModalAfter?: boolean): Promise<boolean> => {
      if (!selectedAirport?.airportCode || revokeListingLoading) return false;
      const result = await revokeListing(selectedAirport.airportCode);
      if (result.ok) {
        setUserDestination(null);
        setIsUserInGroup(false);
        setUserGroupId(null);
        const code = selectedAirport.airportCode;
        const [travellersResult, fetchedGroups, hasActiveAnywhere] =
          await Promise.all([
            fetchTravellers(code),
            fetchGroups(selectedAirport.airportCode, selectedAirport.airportName),
            fetchHasActiveListing(),
          ]);
        setTravellers(travellersResult.travellers);
        setGroups(fetchedGroups);
        setHasActiveListingAnywhere(hasActiveAnywhere);
        if (closeModalAfter) setSelectedEntity(null);
        toast.success("Listing removed");
        return true;
      }
      toast.error(result.error ?? "Failed to remove listing");
      return false;
    },
    [
      selectedAirport,
      revokeListing,
      revokeListingLoading,
      fetchTravellers,
      fetchGroups,
      fetchHasActiveListing,
    ],
  );

  const fetchTravellerDetail = useCallback(
    (userId: string) =>
      fetchTravellerByAirportAndUser(
        selectedAirport.airportCode,
        userId,
        selectedAirport.airportName,
      ),
    [fetchTravellerByAirportAndUser, selectedAirport],
  );

  const handleVerifyAtTerminal = useCallback(async () => {
    if (!userGroupId || verifyAtTerminalLoading) return;
    if (!navigator.geolocation) {
      toast.error("Location access is not available");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const result = await verifyAtTerminal(userGroupId!, latitude, longitude);
        if (result.ok) {
          toast.success("You're marked as ready to onboard");
          setUserReadyToOnboard(true);
          await refreshAirportData();
        } else {
          toast.error(result.error ?? "Failed to verify");
        }
      },
      () => {
        toast.error("Location access denied or unavailable");
      },
      { enableHighAccuracy: true },
    );
  }, [userGroupId, verifyAtTerminal, verifyAtTerminalLoading, refreshAirportData]);

  return {
    travellers,
    groups,
    terminals,
    isFetchingList,
    initialDataFetchCompleted,
    isUserInGroup,
    userGroupId,
    userDestination,
    hasActiveListingAnywhere,
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
  };
}


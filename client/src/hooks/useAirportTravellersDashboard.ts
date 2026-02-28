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
  selectedEntity: SelectedEntity;
  setSelectedEntity: (entity: SelectedEntity) => void;
  clearModalParamsFromUrl: () => void;
  handleConnectionResponded: () => Promise<void>;
  handleLeaveGroup: () => Promise<void>;
  handleJoinRequestSuccess: () => Promise<void>;
  handleWaitlistSuccess: () => Promise<void>;
  handleRevokeListing: (closeModalAfter?: boolean) => Promise<boolean>;
  revokeListingLoading: boolean;
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
  const [userDestination, setUserDestination] = useState<string | null>(null);
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
    revokeListing,
    fetchTravellersLoading,
    fetchGroupsLoading,
    revokeListingLoading,
  } = useGetTravellerApi();
  const { fetchTerminals } = useGetAirportsApi();

  const isFetchingList = fetchTravellersLoading || fetchGroupsLoading;

  useEffect(() => {
    const code = selectedAirport.airportCode;
    const loadData = async () => {
      const fetchedTerminals = await fetchTerminals(code);
      setTerminals(fetchedTerminals);
    };
    void loadData();
  }, [selectedAirport, fetchTerminals]);

  useEffect(() => {
    const code = selectedAirport.airportCode;
    const loadData = async () => {
      try {
        const {
          travellers: fetchedTravellers,
          isUserInGroup: userInGroup,
          userGroupId: gid,
        } = await fetchTravellers(code);

        setTravellers(fetchedTravellers);
        setIsUserInGroup(userInGroup);
        setUserGroupId(gid);

        const fetchedGroups = await fetchGroups(
          selectedAirport.airportCode,
          selectedAirport.airportName,
        );
        setGroups(fetchedGroups);

        setInitialDataFetchCompleted(true);
      } catch {
        // Loading and error states are handled by hooks / consumers.
      }
    };
    void loadData();
  }, [selectedAirport, fetchTravellers, fetchGroups]);

  useEffect(() => {
    const checkUserListing = async () => {
      const result = await fetchUserDestination(selectedAirport.airportCode);
      setUserDestination(result);
    };
    void checkUserListing();
  }, [selectedAirport, fetchUserDestination]);

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

  return {
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
    refreshAirportData,
    fetchTravellerDetail,
  };
}


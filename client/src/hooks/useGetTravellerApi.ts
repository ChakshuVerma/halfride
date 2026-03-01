import { useCallback, useState } from "react";
import { useApi } from "./useApi";
import { API_ROUTES } from "@/lib/apiRoutes";
import type { Traveller, Group } from "@/components/traveller/types";

export function useGetTravellerApi() {
  const { sessionRequest } = useApi();
  const [fetchTravellersLoading, setFetchTravellersLoading] = useState(false);
  const [fetchGroupsLoading, setFetchGroupsLoading] = useState(false);
  const [fetchGroupMembersLoading, setFetchGroupMembersLoading] =
    useState(false);
  const [fetchGroupJoinRequestsLoading, setFetchGroupJoinRequestsLoading] =
    useState(false);
  const [leaveGroupLoading, setLeaveGroupLoading] = useState(false);
  const [verifyAtTerminalLoading, setVerifyAtTerminalLoading] = useState(false);
  const [revokeListingLoading, setRevokeListingLoading] = useState(false);
  const [requestJoinGroupLoading, setRequestJoinGroupLoading] = useState(false);
  const [respondToJoinRequestLoading, setRespondToJoinRequestLoading] =
    useState(false);
  const [updateGroupNameLoading, setUpdateGroupNameLoading] = useState(false);

  const fetchTravellers = useCallback(
    async (
      airportCode?: string,
    ): Promise<{
      travellers: Traveller[];
      isUserInGroup: boolean;
      userGroupId: string | null;
      userReadyToOnboard: boolean;
    }> => {
      if (!airportCode)
        return {
          travellers: [],
          isUserInGroup: false,
          userGroupId: null,
          userReadyToOnboard: false,
        };
      setFetchTravellersLoading(true);
      try {
        const url = `${API_ROUTES.TRAVELLERS_BY_AIRPORT}/${airportCode}`;
        const response = await sessionRequest<{
          ok: boolean;
          data: Traveller[];
          isUserInGroup?: boolean;
          userGroupId?: string;
          userReadyToOnboard?: boolean;
        }>(url);
        const data = response.data || [];
        const isUserInGroup = response.isUserInGroup || false;
        const userGroupId = response.userGroupId ?? null;
        const userReadyToOnboard = response.userReadyToOnboard ?? false;
        return {
          travellers: data,
          isUserInGroup,
          userGroupId,
          userReadyToOnboard,
        };
      } catch (error) {
        console.error("Failed to fetch travellers:", error);
        return {
          travellers: [],
          isUserInGroup: false,
          userGroupId: null,
          userReadyToOnboard: false,
        };
      } finally {
        setFetchTravellersLoading(false);
      }
    },
    [sessionRequest],
  );

  const fetchGroups = useCallback(
    async (airportCode: string, airportName?: string): Promise<Group[]> => {
      if (!airportCode) return [];
      setFetchGroupsLoading(true);
      try {
        const url = `${API_ROUTES.GROUPS_BY_AIRPORT}/${encodeURIComponent(airportCode)}`;
        const response = await sessionRequest<{
          ok: boolean;
          data: Array<{
            id: string;
            name: string;
            airportCode: string;
            destinations: string[];
            groupSize: number;
            maxUsers: number;
            genderBreakdown: { male: number; female: number };
            createdAt: string;
            hasPendingJoinRequest?: boolean;
          }>;
        }>(url);
        const data = response.data || [];
        const name = airportName ?? airportCode;
        return data.map((g) => ({
          ...g,
          airportName: name,
          createdAt:
            typeof g.createdAt === "string"
              ? g.createdAt
              : new Date(g.createdAt).toISOString(),
          hasPendingJoinRequest: g.hasPendingJoinRequest ?? false,
        })) as Group[];
      } catch (error) {
        console.error("Failed to fetch groups:", error);
        return [];
      } finally {
        setFetchGroupsLoading(false);
      }
    },
    [sessionRequest],
  );

  const fetchGroupById = useCallback(
    async (groupId: string, airportName?: string): Promise<Group | null> => {
      if (!groupId) return null;
      try {
        const url = `${API_ROUTES.GROUP}/${encodeURIComponent(groupId)}`;
        const response = await sessionRequest<{
          ok: boolean;
          data: {
            id: string;
            name: string;
            airportCode: string;
            destinations: string[];
            groupSize: number;
            maxUsers: number;
            genderBreakdown: { male: number; female: number };
            createdAt: string;
            hasPendingJoinRequest?: boolean;
            isCurrentUserMember?: boolean;
          };
        }>(url);
        if (!response.ok || !response.data) return null;
        const g = response.data;
        return {
          ...g,
          airportName: airportName ?? g.airportCode,
          createdAt:
            typeof g.createdAt === "string"
              ? g.createdAt
              : new Date(g.createdAt).toISOString(),
          hasPendingJoinRequest: g.hasPendingJoinRequest ?? false,
          isCurrentUserMember: g.isCurrentUserMember ?? false,
        } as Group;
      } catch (error) {
        console.error("Failed to fetch group by ID:", error);
        return null;
      }
    },
    [sessionRequest],
  );

  const fetchTravellerByAirportAndUser = useCallback(
    async (
      airportCode: string,
      userId: string,
      airportName?: string,
    ): Promise<Traveller | null> => {
      if (!airportCode || !userId) return null;
      try {
        const url = `${API_ROUTES.TRAVELLER_BY_AIRPORT}/${encodeURIComponent(airportCode)}/${encodeURIComponent(userId)}`;
        const response = await sessionRequest<{
          ok: boolean;
          data: {
            id: string;
            name: string;
            gender: "Male" | "Female" | "Other";
            username?: string;
            photoURL?: string | null;
            destination: string;
            flightDateTime: string | null;
            flightDepartureTime?: string | null;
            terminal: string;
            flightNumber: string;
            flightCarrier?: string;
            flightNumberRaw?: string;
            distanceFromUserKm: number;
            bio?: string;
            tags?: string[];
            isVerified?: boolean;
            connectionStatus?: string;
            isOwnListing?: boolean;
          };
        }>(url);
        if (!response.ok || !response.data) return null;
        const t = response.data;
        return {
          id: t.id,
          name: t.name,
          gender: t.gender,
          username: t.username ?? "",
          photoURL: t.photoURL ?? undefined,
          destination: t.destination,
          airportName: airportName ?? airportCode,
          flightDateTime: t.flightDateTime ? new Date(t.flightDateTime) : new Date(),
          flightDepartureTime: t.flightDepartureTime ?? undefined,
          terminal: t.terminal,
          flightNumber: t.flightNumber,
          flightCarrier: t.flightCarrier,
          flightNumberRaw: t.flightNumberRaw,
          distanceFromUserKm: t.distanceFromUserKm ?? 0,
          bio: t.bio,
          tags: t.tags,
          isVerified: t.isVerified,
          connectionStatus: t.connectionStatus as Traveller["connectionStatus"],
          isOwnListing: t.isOwnListing,
        } as Traveller;
      } catch (error) {
        console.error("Failed to fetch traveller by airport and user:", error);
        return null;
      }
    },
    [sessionRequest],
  );

  const fetchUserDestination = useCallback(
    async (airportCode: string): Promise<string | null> => {
      try {
        const url = `${API_ROUTES.CHECK_LISTING}?airportCode=${airportCode}`;
        const response = await sessionRequest<{
          ok: boolean;
          destinationAddress: string | null;
        }>(url);
        return response.ok ? response.destinationAddress : null;
      } catch (error) {
        console.error("Failed to check listing:", error);
        return null;
      }
    },
    [sessionRequest],
  );

  const fetchHasActiveListing = useCallback(
    async (): Promise<boolean> => {
      try {
        const response = await sessionRequest<{
          ok: boolean;
          hasActiveListing: boolean;
        }>(API_ROUTES.HAS_ACTIVE_LISTING);
        return response.ok && response.hasActiveListing === true;
      } catch (error) {
        console.error("Failed to check has active listing:", error);
        return false;
      }
    },
    [sessionRequest],
  );

  const fetchGroupMembers = useCallback(
    async (groupId: string): Promise<Traveller[]> => {
      if (!groupId) return [];
      setFetchGroupMembersLoading(true);
      try {
        const url = `${API_ROUTES.GROUP_MEMBERS}/${encodeURIComponent(groupId)}`;
        const response = await sessionRequest<{
          ok: boolean;
          data: Array<{
            id: string;
            name: string;
            gender: "Male" | "Female" | "Other";
            photoURL?: string | null;
            username?: string | null;
            destination: string;
            terminal: string;
            flightNumber: string;
            readyToOnboard?: boolean;
          }>;
        }>(url);
        const data = response.data ?? [];
        return data.map((m) => ({
          id: m.id,
          name: m.name,
          gender: m.gender,
          photoURL: m.photoURL ?? undefined,
          username: m.username ?? "",
          destination: m.destination,
          terminal: m.terminal,
          flightNumber: m.flightNumber,
          airportName: "",
          flightDateTime: new Date(),
          distanceFromUserKm: 0,
          readyToOnboard: m.readyToOnboard ?? false,
        })) as Traveller[];
      } catch (error) {
        console.error("Failed to fetch group members:", error);
        return [];
      } finally {
        setFetchGroupMembersLoading(false);
      }
    },
    [sessionRequest],
  );

  const leaveGroup = useCallback(
    async (groupId: string): Promise<{ ok: boolean; error?: string }> => {
      setLeaveGroupLoading(true);
      try {
        const response = await sessionRequest<{
          ok: boolean;
          message?: string;
          error?: string;
        }>(API_ROUTES.LEAVE_GROUP, {
          method: "POST",
          body: JSON.stringify({ groupId }),
        });
        if (!response.ok) {
          return {
            ok: false,
            error: response.error ?? "Failed to leave group",
          };
        }
        return { ok: true };
      } catch (error) {
        console.error("Leave group error:", error);
        return {
          ok: false,
          error:
            error instanceof Error ? error.message : "Failed to leave group",
        };
      } finally {
        setLeaveGroupLoading(false);
      }
    },
    [sessionRequest],
  );

  const verifyAtTerminal = useCallback(
    async (
      groupId: string,
      latitude: number,
      longitude: number,
    ): Promise<{
      ok: boolean;
      error?: string;
      userCoordinates?: { latitude: number; longitude: number };
      terminalCoordinates?: { airportCode: string; lat: number; lng: number };
      distanceMeters?: number;
    }> => {
      setVerifyAtTerminalLoading(true);
      try {
        const response = await sessionRequest<{
          ok: boolean;
          error?: string;
          userCoordinates?: { latitude: number; longitude: number };
          terminalCoordinates?: { airportCode: string; lat: number; lng: number };
          distanceMeters?: number;
        }>(API_ROUTES.VERIFY_AT_TERMINAL, {
          method: "POST",
          body: JSON.stringify({ groupId, latitude, longitude }),
        });
        if (!response.ok) {
          return {
            ok: false,
            error: response.error ?? "Failed to verify at terminal",
          };
        }
        return {
          ok: true,
          userCoordinates: response.userCoordinates,
          terminalCoordinates: response.terminalCoordinates,
          distanceMeters: response.distanceMeters,
        };
      } catch (error) {
        console.error("Verify at terminal error:", error);
        return {
          ok: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to verify at terminal",
        };
      } finally {
        setVerifyAtTerminalLoading(false);
      }
    },
    [sessionRequest],
  );

  const revokeListing = useCallback(
    async (airportCode: string): Promise<{ ok: boolean; error?: string }> => {
      setRevokeListingLoading(true);
      try {
        const response = await sessionRequest<{
          ok: boolean;
          message?: string;
          error?: string;
        }>(API_ROUTES.REVOKE_LISTING, {
          method: "POST",
          body: JSON.stringify({ airportCode }),
        });
        if (!response.ok) {
          return {
            ok: false,
            error: response.error ?? "Failed to revoke listing",
          };
        }
        return { ok: true };
      } catch (error) {
        console.error("Revoke listing error:", error);
        return {
          ok: false,
          error:
            error instanceof Error ? error.message : "Failed to revoke listing",
        };
      } finally {
        setRevokeListingLoading(false);
      }
    },
    [sessionRequest],
  );

  const requestJoinGroup = useCallback(
    async (groupId: string): Promise<{ ok: boolean; error?: string }> => {
      setRequestJoinGroupLoading(true);
      try {
        const response = await sessionRequest<{
          ok: boolean;
          message?: string;
          error?: string;
        }>(API_ROUTES.REQUEST_JOIN_GROUP, {
          method: "POST",
          body: JSON.stringify({ groupId }),
        });
        if (!response.ok) {
          return {
            ok: false,
            error: response.error ?? "Failed to send join request",
          };
        }
        return { ok: true };
      } catch (error) {
        console.error("Request join group error:", error);
        return {
          ok: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to send join request",
        };
      } finally {
        setRequestJoinGroupLoading(false);
      }
    },
    [sessionRequest],
  );

  type JoinRequestUser = {
    id: string;
    name: string;
    gender: string;
    destination: string;
    terminal: string;
    flightNumber: string;
  };

  const fetchGroupJoinRequests = useCallback(
    async (groupId: string): Promise<JoinRequestUser[]> => {
      if (!groupId) return [];
      setFetchGroupJoinRequestsLoading(true);
      try {
        const url = `${API_ROUTES.GROUP_JOIN_REQUESTS}/${encodeURIComponent(groupId)}`;
        const response = await sessionRequest<{
          ok: boolean;
          data: JoinRequestUser[];
        }>(url);
        return response.data ?? [];
      } catch (error) {
        console.error("Fetch group join requests error:", error);
        return [];
      } finally {
        setFetchGroupJoinRequestsLoading(false);
      }
    },
    [sessionRequest],
  );

  const respondToJoinRequest = useCallback(
    async (
      groupId: string,
      requesterUserId: string,
      action: "accept" | "reject",
    ): Promise<{ ok: boolean; error?: string }> => {
      setRespondToJoinRequestLoading(true);
      try {
        const response = await sessionRequest<{
          ok: boolean;
          message?: string;
          error?: string;
        }>(API_ROUTES.RESPOND_TO_JOIN_REQUEST, {
          method: "POST",
          body: JSON.stringify({ groupId, requesterUserId, action }),
        });
        if (!response.ok) {
          return { ok: false, error: response.error ?? "Action failed" };
        }
        return { ok: true };
      } catch (error) {
        console.error("Respond to join request error:", error);
        return {
          ok: false,
          error: error instanceof Error ? error.message : "Action failed",
        };
      } finally {
        setRespondToJoinRequestLoading(false);
      }
    },
    [sessionRequest],
  );

  const updateGroupName = useCallback(
    async (
      groupId: string,
      name: string,
    ): Promise<{ ok: boolean; error?: string; name?: string }> => {
      setUpdateGroupNameLoading(true);
      try {
        const response = await sessionRequest<{
          ok: boolean;
          message?: string;
          error?: string;
          name?: string;
        }>(API_ROUTES.UPDATE_GROUP_NAME, {
          method: "POST",
          body: JSON.stringify({ groupId, name }),
        });
        if (!response.ok) {
          return {
            ok: false,
            error: response.error ?? "Failed to update group name",
          };
        }
        return { ok: true, name: response.name };
      } catch (error) {
        console.error("Update group name error:", error);
        return {
          ok: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to update group name",
        };
      } finally {
        setUpdateGroupNameLoading(false);
      }
    },
    [sessionRequest],
  );

  return {
    fetchTravellers,
    fetchGroups,
    fetchGroupById,
    fetchTravellerByAirportAndUser,
    fetchGroupMembers,
    fetchUserDestination,
    fetchHasActiveListing,
    leaveGroup,
    revokeListing,
    requestJoinGroup,
    fetchGroupJoinRequests,
    respondToJoinRequest,
    updateGroupName,
    verifyAtTerminal,
    fetchTravellersLoading,
    fetchGroupsLoading,
    fetchGroupMembersLoading,
    fetchGroupJoinRequestsLoading,
    leaveGroupLoading,
    verifyAtTerminalLoading,
    revokeListingLoading,
    requestJoinGroupLoading,
    respondToJoinRequestLoading,
    updateGroupNameLoading,
  };
}

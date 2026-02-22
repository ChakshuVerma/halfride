import { useCallback, useState } from "react";
import { useApi } from "./useApi";
import { API_ROUTES } from "@/lib/apiRoutes";
import type { Traveller, Group } from "@/components/traveller/types";

export function useGetTravellerApi() {
  const { sessionRequest } = useApi();
  const [fetchTravellersLoading, setFetchTravellersLoading] = useState(false);
  const [fetchGroupsLoading, setFetchGroupsLoading] = useState(false);
  const [fetchUserDestinationLoading, setFetchUserDestinationLoading] =
    useState(false);
  const [fetchGroupMembersLoading, setFetchGroupMembersLoading] =
    useState(false);
  const [fetchGroupJoinRequestsLoading, setFetchGroupJoinRequestsLoading] =
    useState(false);
  const [leaveGroupLoading, setLeaveGroupLoading] = useState(false);
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
    }> => {
      if (!airportCode)
        return { travellers: [], isUserInGroup: false, userGroupId: null };
      setFetchTravellersLoading(true);
      try {
        const url = `${API_ROUTES.TRAVELLERS_BY_AIRPORT}/${airportCode}`;
        const response = await sessionRequest<{
          ok: boolean;
          data: Traveller[];
          isUserInGroup?: boolean;
          userGroupId?: string;
        }>(url);
        const data = response.data || [];
        const isUserInGroup = response.isUserInGroup || false;
        const userGroupId = response.userGroupId ?? null;
        return { travellers: data, isUserInGroup, userGroupId };
      } catch (error) {
        console.error("Failed to fetch travellers:", error);
        return { travellers: [], isUserInGroup: false, userGroupId: null };
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

  const fetchUserDestination = useCallback(
    async (airportCode: string): Promise<string | null> => {
      setFetchUserDestinationLoading(true);
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
      } finally {
        setFetchUserDestinationLoading(false);
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
    fetchGroupMembers,
    fetchUserDestination,
    leaveGroup,
    revokeListing,
    requestJoinGroup,
    fetchGroupJoinRequests,
    respondToJoinRequest,
    updateGroupName,
    fetchTravellersLoading,
    fetchGroupsLoading,
    fetchUserDestinationLoading,
    fetchGroupMembersLoading,
    fetchGroupJoinRequestsLoading,
    leaveGroupLoading,
    revokeListingLoading,
    requestJoinGroupLoading,
    respondToJoinRequestLoading,
    updateGroupNameLoading,
  };
}

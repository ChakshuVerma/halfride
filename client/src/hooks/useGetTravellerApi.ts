import { useCallback } from "react";
import { useApi } from "./useApi";
import { API_ROUTES } from "@/lib/apiRoutes";
import type { Traveller, Group } from "@/components/traveller/types";

export function useGetTravellerApi() {
  const { sessionRequest, loading } = useApi();

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
      }
    },
    [sessionRequest],
  );

  const fetchGroups = useCallback(
    async (airportCode: string, airportName?: string): Promise<Group[]> => {
      if (!airportCode) return [];

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
        })) as Group[];
      } catch (error) {
        console.error("Failed to fetch groups:", error);
        return [];
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

  const fetchGroupMembers = useCallback(
    async (groupId: string): Promise<Traveller[]> => {
      if (!groupId) return [];
      try {
        const url = `${API_ROUTES.GROUP_MEMBERS}/${encodeURIComponent(groupId)}`;
        const response = await sessionRequest<{
          ok: boolean;
          data: Array<{
            id: string;
            name: string;
            gender: "Male" | "Female" | "Other";
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
          destination: m.destination,
          terminal: m.terminal,
          flightNumber: m.flightNumber,
          airportName: "",
          flightDateTime: new Date(),
          distanceFromUserKm: 0,
          username: "",
        })) as Traveller[];
      } catch (error) {
        console.error("Failed to fetch group members:", error);
        return [];
      }
    },
    [sessionRequest],
  );

  const leaveGroup = useCallback(
    async (groupId: string): Promise<{ ok: boolean; error?: string }> => {
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
          return { ok: false, error: response.error ?? "Failed to leave group" };
        }
        return { ok: true };
      } catch (error) {
        console.error("Leave group error:", error);
        return {
          ok: false,
          error: error instanceof Error ? error.message : "Failed to leave group",
        };
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
    loading,
  };
}

import { useCallback } from "react";
import { useApi } from "./useApi";
import { API_ROUTES } from "@/lib/apiRoutes";
import type { Traveller, Group } from "@/components/traveller/types";
import { dummyTravellers } from "@/data/mockTravellerData";

export function useGetTravellerApi() {
  const { sessionRequest, loading } = useApi();

  const fetchTravellers = useCallback(
    async (
      airportCode?: string,
    ): Promise<{ travellers: Traveller[]; isUserInGroup: boolean }> => {
      if (!airportCode) return { travellers: [], isUserInGroup: false };

      try {
        const url = `${API_ROUTES.TRAVELLERS_BY_AIRPORT}/${airportCode}`;
        const response = await sessionRequest<{
          ok: boolean;
          data: Traveller[];
          isUserInGroup?: boolean;
        }>(url);

        const data = response.data || [];
        const isUserInGroup = response.isUserInGroup || false;
        return { travellers: data, isUserInGroup };
      } catch (error) {
        console.error("Failed to fetch travellers:", error);
        return { travellers: [], isUserInGroup: false };
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
    async (groupId: string, count?: number): Promise<Traveller[]> => {
      // TODO: Replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 600)); // Fake delay
      // Return a subset of travellers as group members matching the requested count
      const requestedCount = count || Math.floor(Math.random() * 3) + 2;

      // If we need more members than we have dummy data for, repeat the list
      const result: Traveller[] = [];
      while (result.length < requestedCount) {
        const remaining = requestedCount - result.length;
        const slice = dummyTravellers.slice(
          0,
          Math.min(remaining, dummyTravellers.length),
        );

        // Deep clone to provide unique IDs for repeated items
        const clonedSlice = slice.map((t, idx) => ({
          ...t,
          id: `${t.id}_${result.length + idx}`,
        }));

        result.push(...clonedSlice);
      }
      return result;
    },
    [],
  );

  return {
    fetchTravellers,
    fetchGroups,
    fetchGroupMembers,
    fetchUserDestination,
    loading,
  };
}

import { useCallback } from "react";
import { useApi } from "./useApi";
import { API_ROUTES } from "@/lib/apiRoutes";
import type { Traveller, Group } from "@/components/traveller/types";
import { dummyTravellers, dummyGroups } from "@/data/mockTravellerData";

export function useGetTravellerApi() {
  const { sessionRequest, loading, dummyReq } = useApi();

  const fetchTravellers = useCallback(
    async (airportCode?: string): Promise<Traveller[]> => {
      if (!airportCode) return [];

      try {
        const url = `${API_ROUTES.TRAVELLERS_BY_AIRPORT}/${airportCode}`;
        const response = await sessionRequest<{
          ok: boolean;
          data: Traveller[];
        }>(url);

        const data = response.data || [];
        return data;
      } catch (error) {
        console.error("Failed to fetch travellers:", error);
        return [];
      }
    },
    [sessionRequest],
  );

  const fetchGroups = useCallback(
    async (airportName?: string): Promise<Group[]> => {
      // TODO: Replace with actual API call
      // return sessionRequest<Group[]>(API_ROUTES.GROUPS, { params: { airportName } })

      // Note: Since we are using useApi, we don't manually control loading here.
      // This dummy delay won't trigger the global loading state from useApi.
      await dummyReq();
      let data = dummyGroups;
      // if (airportName) {
      //   data = data.filter((g) => g.airportName === airportName);
      // }
      console.log(data);
      return data;
    },
    [],
  );

  const checkListing = useCallback(
    async (airportCode: string): Promise<boolean> => {
      try {
        const url = `${API_ROUTES.CHECK_LISTING}?airportCode=${airportCode}`;
        const response = await sessionRequest<{
          ok: boolean;
          hasListing: boolean;
        }>(url);
        return response.ok && response.hasListing;
      } catch (error) {
        console.error("Failed to check listing:", error);
        return false;
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
    checkListing,
    loading,
  };
}

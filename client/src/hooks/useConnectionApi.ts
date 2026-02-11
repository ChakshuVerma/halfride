import { useState, useCallback } from "react";
import { useApi } from "./useApi";
import { API_ROUTES } from "@/lib/apiRoutes";

interface RequestConnectionPayload {
  travellerUid: string;
  flightCarrier: string;
  flightNumber: string;
}

interface RequestConnectionResponse {
  ok: boolean;
  message?: string;
  error?: string;
  groupId?: string;
}

export function useConnectionApi() {
  const { sessionRequest, loading } = useApi();
  const [error, setError] = useState<string | null>(null);

  const requestConnection = useCallback(
    async (
      payload: RequestConnectionPayload,
    ): Promise<RequestConnectionResponse> => {
      setError(null);
      try {
        const response = await sessionRequest<RequestConnectionResponse>(
          API_ROUTES.REQUEST_CONNECTION,
          {
            method: "POST",
            body: JSON.stringify(payload),
          },
        );

        if (!response.ok) {
          throw new Error(
            response.error || "Failed to send connection request",
          );
        }

        return response;
      } catch (err: any) {
        const message = err.message || "An unexpected error occurred";
        setError(message);
        return { ok: false, error: message };
      }
    },
    [sessionRequest],
  );

  return {
    requestConnection,
    loading,
    error,
  };
}

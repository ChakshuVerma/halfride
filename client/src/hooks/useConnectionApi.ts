import { useState, useCallback } from "react";
import { useApi } from "./useApi";
import { API_ROUTES } from "@/lib/apiRoutes";

/** Actions when responding to a connection request. Matches server enum. */
export const ConnectionResponseAction = {
  ACCEPT: "accept",
  REJECT: "reject",
} as const;

export type ConnectionResponseActionType =
  (typeof ConnectionResponseAction)[keyof typeof ConnectionResponseAction];

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

interface RespondToConnectionPayload {
  requesterUserId: string;
  action: ConnectionResponseActionType;
}

interface RespondToConnectionResponse {
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
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "An unexpected error occurred";
        setError(message);
        return { ok: false, error: message };
      }
    },
    [sessionRequest],
  );

  const respondToConnection = useCallback(
    async (
      payload: RespondToConnectionPayload,
    ): Promise<RespondToConnectionResponse> => {
      setError(null);
      try {
        const response = await sessionRequest<RespondToConnectionResponse>(
          API_ROUTES.RESPOND_TO_CONNECTION,
          {
            method: "POST",
            body: JSON.stringify(payload),
          },
        );

        if (!response.ok) {
          throw new Error(
            response.error || "Failed to respond to connection request",
          );
        }

        return response;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "An unexpected error occurred";
        setError(message);
        return { ok: false, error: message };
      }
    },
    [sessionRequest],
  );

  return {
    requestConnection,
    respondToConnection,
    loading,
    error,
  };
}

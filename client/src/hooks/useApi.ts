import { useCallback } from "react";
import {
  publicRequest as rawPublicRequest,
  sessionRequest as rawSessionRequest,
} from "../lib/api";

/**
 * Low-level API hook. Does not expose loading state so that each consumer
 * can track loading per action (e.g. requestConnectionLoading vs respondLoading)
 * and avoid blocking unrelated UI when different requests are in flight.
 */
export function useApi() {
  const publicRequest = useCallback(
    async <T>(endpoint: string, options?: RequestInit): Promise<T> => {
      return rawPublicRequest<T>(endpoint, options);
    },
    [],
  );

  const sessionRequest = useCallback(
    async <T>(endpoint: string, options?: RequestInit): Promise<T> => {
      return rawSessionRequest<T>(endpoint, options);
    },
    [],
  );

  const dummyReq = useCallback(async () => {
    await new Promise((resolve) => setTimeout(resolve, 600));
  }, []);

  return {
    publicRequest,
    sessionRequest,
    dummyReq,
  };
}

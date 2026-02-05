import { useCallback, useState } from "react";
import {
  publicRequest as rawPublicRequest,
  sessionRequest as rawSessionRequest,
} from "../lib/api";

export function useApi() {
  const [loading, setLoading] = useState(false);

  const publicRequest = useCallback(
    async <T>(endpoint: string, options?: RequestInit): Promise<T> => {
      setLoading(true);
      try {
        return await rawPublicRequest<T>(endpoint, options);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const sessionRequest = useCallback(
    async <T>(endpoint: string, options?: RequestInit): Promise<T> => {
      setLoading(true);
      try {
        return await rawSessionRequest<T>(endpoint, options);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const dummyReq = useCallback(async () => {
    setLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 600));
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    publicRequest,
    sessionRequest,
    dummyReq,
  };
}

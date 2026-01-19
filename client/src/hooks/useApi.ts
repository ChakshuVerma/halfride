import { useCallback, useState } from "react"
import { publicRequest as rawPublicRequest, sessionRequest as rawSessionRequest } from "../lib/api"

type HttpError = Error | null

export function useApi() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<HttpError>(null)

  const publicRequest = useCallback(
    async <T>(endpoint: string, options?: RequestInit): Promise<T> => {
      setLoading(true)
      setError(null)
      try {
        return await rawPublicRequest<T>(endpoint, options)
      } catch (e) {
        setError(e as Error)
        throw e
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const sessionRequest = useCallback(
    async <T>(endpoint: string, options?: RequestInit): Promise<T> => {
      setLoading(true)
      setError(null)
      try {
        return await rawSessionRequest<T>(endpoint, options)
      } catch (e) {
        setError(e as Error)
        throw e
      } finally {
        setLoading(false)
      }
    },
    []
  )

  return {
    loading,
    error,
    publicRequest,
    sessionRequest,
  }
}


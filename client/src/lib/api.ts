const API_BASE_URL = "/api"

const ERROR_NOT_AUTHENTICATED = "Not authenticated. Please log in."
const ERROR_AUTH_FAILED = "Authentication failed. Please log in again."
const ERROR_REQUEST_FAILED = (status: number) => `Request failed with status ${status}`
const ERROR_HTTP_ERROR = (status: number) => `HTTP error! status: ${status}`
const ERROR_UNKNOWN = "Unknown error"

export async function authenticatedRequest<T>(
  endpoint: string,
  getIdToken: () => Promise<string | null>,
  options: RequestInit = {},
  retryOnExpired: boolean = true
): Promise<T> {
  const token = await getIdToken()
  
  if (!token) {
    throw new Error(ERROR_NOT_AUTHENTICATED)
  }

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    ...options.headers,
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ 
      message: ERROR_HTTP_ERROR(response.status),
      error: ERROR_UNKNOWN
    }))
    
    if (response.status === 401) {
      if (retryOnExpired && errorData.message?.toLowerCase().includes('expired')) {
        const freshToken = await getIdToken()
        
        if (freshToken) {
          const retryHeaders: HeadersInit = {
            "Content-Type": "application/json",
            Authorization: `Bearer ${freshToken}`,
            ...options.headers,
          }
          
          const retryResponse = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers: retryHeaders,
          })
          
          if (!retryResponse.ok) {
            const retryError = await retryResponse.json().catch(() => ({ 
              message: ERROR_HTTP_ERROR(retryResponse.status)
            }))
            throw new Error(retryError.message || ERROR_REQUEST_FAILED(retryResponse.status))
          }
          
          return retryResponse.json()
        }
      }
      
      throw new Error(errorData.message || ERROR_AUTH_FAILED)
    }
    
    throw new Error(errorData.message || ERROR_REQUEST_FAILED(response.status))
  }

  return response.json()
}

export async function publicRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ 
      message: ERROR_HTTP_ERROR(response.status)
    }))
    throw new Error(error.message || ERROR_REQUEST_FAILED(response.status))
  }

  return response.json()
}

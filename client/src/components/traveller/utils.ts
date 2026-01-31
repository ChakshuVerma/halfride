function formatWaitTime(flightDateTime: Date | string) {
  const date = new Date(flightDateTime)
  const now = new Date()
  const diffMs = date.getTime() - now.getTime()

  if (diffMs <= 0) return "Departed"

  const diffMinutes = Math.round(diffMs / 60000)
  const hours = Math.floor(diffMinutes / 60)
  const minutes = diffMinutes % 60

  if (hours === 0) return `${minutes} min`
  if (minutes === 0) return `${hours}h`

  return `${hours}h ${minutes}m`
}

function formatFlightDateTime(flightDateTime: Date | string) {
  const date = new Date(flightDateTime)
  return date.toLocaleString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

const formatTime = (dateInput: Date | string) => {
  const date = new Date(dateInput)
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

const formatDateAndTime = (dateInput: Date | string) => {
  const date = new Date(dateInput)
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

const calculateWaitText = (flightDateTime: Date | string | undefined) => {
  if (!flightDateTime) return "--"
  
  const date = new Date(flightDateTime)
  const now = new Date()
  const diff = date.getTime() - now.getTime()
  
  if (diff <= 0) return "Arrived"
  
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export { formatWaitTime, formatFlightDateTime, formatTime, formatDateAndTime, calculateWaitText }

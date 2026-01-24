function formatWaitTime(flightDateTime: Date) {
  const now = new Date()
  const diffMs = flightDateTime.getTime() - now.getTime()

  if (diffMs <= 0) return "Departed"

  const diffMinutes = Math.round(diffMs / 60000)
  const hours = Math.floor(diffMinutes / 60)
  const minutes = diffMinutes % 60

  if (hours === 0) return `${minutes} min`
  if (minutes === 0) return `${hours}h`

  return `${hours}h ${minutes}m`
}

function formatFlightDateTime(flightDateTime: Date) {
  return flightDateTime.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export { formatWaitTime, formatFlightDateTime }

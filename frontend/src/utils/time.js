export function formatTs(ts) {
  if (!ts) return ''
  const date = new Date(ts)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()
  const isThisYear = date.getFullYear() === now.getFullYear()

  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  if (isThisYear) {
    return date.toLocaleDateString([], { day: 'numeric', month: 'short' })
  }

  return date.toLocaleDateString([], { day: 'numeric', month: 'short', year: '2-digit' })
}

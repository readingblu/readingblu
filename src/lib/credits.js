// Balances are stored in pages. 10 pages = 1 credit.
export const PAGES_PER_CREDIT = 10
export const DAILY_CREDITS = 2

// Pages at the start of every book that never use credits.
// This number must match the free_pages() function in the database.
export const FREE_PAGES = 8

export function formatCredits(pages) {
  const credits = (Number(pages) || 0) / PAGES_PER_CREDIT
  return Number.isInteger(credits) ? String(credits) : credits.toFixed(1)
}

export function formatReset(iso) {
  if (!iso) return 'soon'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'soon'
  return date.toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' })
}
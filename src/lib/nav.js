const ALLOWED_PREFIXES = ['/book/', '/read/', '/home', '/upgrade', '/saved', '/library', '/account']

// Only allows safe, on-site paths, so a sign-in link can never send someone to another website
export function safeNext(value) {
  if (typeof value !== 'string') return ''
  if (value.length > 200) return ''
  if (!value.startsWith('/') || value.startsWith('//')) return ''
  if (value.includes('\\') || value.includes('://')) return ''
  return ALLOWED_PREFIXES.some((p) => value === p || value.startsWith(p)) ? value : ''
}

export function authUrl(next, mode) {
  const params = new URLSearchParams()
  if (mode === 'signup') params.set('mode', 'signup')
  const target = safeNext(next)
  if (target) params.set('next', target)
  const qs = params.toString()
  return `/auth${qs ? `?${qs}` : ''}`
}
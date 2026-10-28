// Serves the normal app page with the book's title, description and cover in the page head.
// Only search engines and link-preview bots are sent here (see vercel.json).
const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

function shorten(text, max) {
  const t = String(text ?? '').replace(/\s+/g, ' ').trim()
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t
}

function originOf(req) {
  const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim()
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim()
  return `${proto}://${host}`
}

async function fetchBook(slug) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null
  const url =
    `${SUPABASE_URL}/rest/v1/books?slug=eq.${encodeURIComponent(slug)}` +
    '&is_published=eq.true&select=title,description,cover_url,author&limit=1'
  const r = await fetch(url, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } })
  if (!r.ok) return null
  const rows = await r.json()
  return rows[0] || null
}

async function fetchShell(origin) {
  try {
    const r = await fetch(`${origin}/index.html`)
    if (!r.ok) return null
    const text = await r.text()
    return text.includes('</head>') ? text : null
  } catch {
    return null
  }
}

function inject(shell, title, tags) {
  const cleaned = shell
    .replace(/<title>[\s\S]*?<\/title>/i, '')
    .replace(/<meta\s+name="description"[^>]*>/gi, '')
    .replace(/<meta\s+property="og:[^"]*"[^>]*>/gi, '')
    .replace(/<meta\s+name="twitter:[^"]*"[^>]*>/gi, '')
  return cleaned.replace(/<\/head>/i, `<title>${esc(title)}</title>\n${tags.join('\n')}\n</head>`)
}

export default async function handler(req, res) {
  const slug = String(req.query.slug || '')
  const origin = originOf(req)

  const shell =
    (await fetchShell(origin)) ||
    '<!doctype html><html lang="en"><head><meta charset="UTF-8" /></head><body><p>ReadingBlu</p></body></html>'

  res.setHeader('Content-Type', 'text/html; charset=utf-8')

  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || slug.length > 100) {
    res.setHeader('Cache-Control', 'public, s-maxage=60')
    res.status(404).send(shell)
    return
  }

  let book = null
  try {
    book = await fetchBook(slug)
  } catch {
    book = null
  }

  if (!book) {
    res.setHeader('Cache-Control', 'public, s-maxage=60')
    res.status(404).send(shell)
    return
  }

  const title = `${book.title} · ReadingBlu`
  const description = shorten(
    book.description || `Read “${book.title}” by ${book.author} on ReadingBlu, a library of AI-generated e-books for readers of all ages.`,
    200,
  )
  const pageUrl = `${origin}/book/${slug}`

  const tags = [
    `<meta name="description" content="${esc(description)}" />`,
    `<link rel="canonical" href="${esc(pageUrl)}" />`,
    '<meta property="og:type" content="book" />',
    '<meta property="og:site_name" content="ReadingBlu" />',
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
    `<meta property="og:url" content="${esc(pageUrl)}" />`,
    `<meta name="twitter:card" content="${book.cover_url ? 'summary_large_image' : 'summary'}" />`,
  ]
  if (book.cover_url) tags.push(`<meta property="og:image" content="${esc(book.cover_url)}" />`)

  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')
  res.status(200).send(inject(shell, title, tags))
}
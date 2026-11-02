// Cloudflare Worker for ReadingBlu.
// It answers /robots.txt and /sitemap.xml, and gives search engines and link-preview bots
// (WhatsApp, Telegram, Facebook, Google...) a book's title, description and cover.
// Everyone else gets the normal app.

const BOTS = /bot|crawl|spider|slurp|facebookexternalhit|whatsapp|telegram|discord|linkedin|twitter|slack|embedly|pinterest|skype|preview/i
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/

const POLICY_SLUGS = [
  'terms',
  'privacy',
  'payments-refunds',
  'credits',
  'digital-content',
  'cookies',
  'acceptable-use',
  'copyright-takedown',
  'ai-content',
  'subscription',
  'children-privacy',
  'account-deletion',
]

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

async function supabaseGet(env, path) {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) return null
  try {
    const r = await fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, {
      headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: `Bearer ${env.SUPABASE_ANON_KEY}` },
    })
    if (!r.ok) return null
    return await r.json()
  } catch {
    return null
  }
}

function robots(url) {
  const body = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /home',
    'Disallow: /read/',
    'Disallow: /saved',
    'Disallow: /library',
    'Disallow: /account',
    'Disallow: /admin',
    'Disallow: /upgrade',
    'Disallow: /streak',
    'Disallow: /finished',
    'Disallow: /auth',
    'Disallow: /continue',
    '',
    `Sitemap: ${url.origin}/sitemap.xml`,
    '',
  ].join('\n')

  return new Response(body, {
    headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=3600' },
  })
}

async function sitemap(url, env) {
  const books = (await supabaseGet(env, 'books?is_published=eq.true&select=slug&order=created_at.desc&limit=1000')) || []

  const urls = [
    `${url.origin}/`,
    `${url.origin}/policies`,
    ...POLICY_SLUGS.map((s) => `${url.origin}/policies/${s}`),
    `${url.origin}/contact`,
    ...books.filter((b) => SLUG.test(b.slug)).map((b) => `${url.origin}/book/${b.slug}`),
  ]

  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map((u) => `  <url><loc>${esc(u)}</loc></url>`).join('\n') +
    '\n</urlset>\n'

  return new Response(xml, {
    headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=3600' },
  })
}

function inject(shell, title, tags) {
  const cleaned = shell
    .replace(/<title>[\s\S]*?<\/title>/i, '')
    .replace(/<meta\s+name="description"[^>]*>/gi, '')
    .replace(/<meta\s+property="og:[^"]*"[^>]*>/gi, '')
    .replace(/<meta\s+name="twitter:[^"]*"[^>]*>/gi, '')
  return cleaned.replace(/<\/head>/i, `<title>${esc(title)}</title>\n${tags.join('\n')}\n</head>`)
}

async function bookForBots(request, env, url, slug) {
  const shellRes = await env.ASSETS.fetch(new Request(new URL('/', url), { headers: { accept: 'text/html' } }))
  if (!shellRes.ok) return env.ASSETS.fetch(request)
  const shell = await shellRes.text()
  if (!shell.includes('</head>')) return env.ASSETS.fetch(request)

  const rows = await supabaseGet(
    env,
    `books?slug=eq.${encodeURIComponent(slug)}&is_published=eq.true&select=title,description,cover_url,author&limit=1`,
  )
  const book = rows && rows[0]

  const headers = { 'content-type': 'text/html; charset=utf-8' }

  if (!book) {
    headers['cache-control'] = 'public, max-age=60'
    return new Response(shell, { status: 404, headers })
  }

  const title = `${book.title} · ReadingBlu`
  const description = shorten(
    book.description || `Read “${book.title}” by ${book.author} on ReadingBlu, a library of AI-generated e-books for readers of all ages.`,
    200,
  )
  const pageUrl = `${url.origin}/book/${slug}`

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

  headers['cache-control'] = 'public, max-age=300'
  return new Response(inject(shell, title, tags), { status: 200, headers })
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const isRead = request.method === 'GET' || request.method === 'HEAD'

    if (isRead && url.pathname === '/robots.txt') return robots(url)
    if (isRead && url.pathname === '/sitemap.xml') return sitemap(url, env)

    if (isRead) {
      const match = url.pathname.match(/^\/book\/([^/]+)\/?$/)
      if (match && BOTS.test(request.headers.get('user-agent') || '')) {
        let slug = ''
        try {
          slug = decodeURIComponent(match[1])
        } catch {
          slug = ''
        }
        if (SLUG.test(slug) && slug.length <= 100) return bookForBots(request, env, url, slug)
      }
    }

    // Everyone else: the normal app
    return env.ASSETS.fetch(request)
  },
}
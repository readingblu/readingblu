export default function handler(req, res) {
  const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim()
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim()

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
    'Disallow: /auth',
    'Disallow: /continue',
    '',
    `Sitemap: ${proto}://${host}/sitemap.xml`,
    '',
  ].join('\n')

  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.setHeader('Cache-Control', 'public, s-maxage=3600')
  res.status(200).send(body)
}
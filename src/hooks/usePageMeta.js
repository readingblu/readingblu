import { useEffect } from 'react'

function metaEl(attr, key) {
  return document.head.querySelector(`meta[${attr}="${key}"]`)
}

// Sets the page title, description and sharing details while a page is open, then puts the old ones back
export function usePageMeta({ title, description, image, path }) {
  useEffect(() => {
    if (!title) return undefined

    const previousTitle = document.title
    const touched = []

    const setMeta = (attr, key, content) => {
      if (!content) return
      let el = metaEl(attr, key)
      let created = false
      if (!el) {
        el = document.createElement('meta')
        el.setAttribute(attr, key)
        document.head.appendChild(el)
        created = true
      }
      touched.push({ el, created, previous: el.getAttribute('content') })
      el.setAttribute('content', content)
    }

    document.title = title
    setMeta('name', 'description', description)
    setMeta('property', 'og:title', title)
    setMeta('property', 'og:description', description)
    setMeta('property', 'og:image', image)

    let canonical = null
    let canonicalCreated = false
    let canonicalPrevious = null
    if (path) {
      canonical = document.head.querySelector('link[rel="canonical"]')
      if (!canonical) {
        canonical = document.createElement('link')
        canonical.setAttribute('rel', 'canonical')
        document.head.appendChild(canonical)
        canonicalCreated = true
      }
      canonicalPrevious = canonical.getAttribute('href')
      canonical.setAttribute('href', `${window.location.origin}${path}`)
    }

    return () => {
      document.title = previousTitle
      touched.forEach(({ el, created, previous }) => {
        if (created) el.remove()
        else if (previous != null) el.setAttribute('content', previous)
      })
      if (canonical) {
        if (canonicalCreated) canonical.remove()
        else if (canonicalPrevious != null) canonical.setAttribute('href', canonicalPrevious)
      }
    }
  }, [title, description, image, path])
}
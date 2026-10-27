import { supabase } from './supabase'

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_IMAGE_MB = 15
const MAX_PDF_MB = 150
export const MAX_PAGES = 400
const PAGE_WIDTH = 1400
const PREVIEW_WIDTH = 1200

export function sortFiles(fileList) {
  return Array.from(fileList).sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }),
  )
}

export function validateImages(files, max) {
  if (files.length === 0) return 'Please choose at least one image.'
  if (files.length > max) return `Please choose at most ${max} image${max === 1 ? '' : 's'}.`
  const wrongType = files.find((f) => !IMAGE_TYPES.includes(f.type))
  if (wrongType) return `"${wrongType.name}" is not a JPG, PNG or WebP image.`
  const tooBig = files.find((f) => f.size > MAX_IMAGE_MB * 1024 * 1024)
  if (tooBig) return `"${tooBig.name}" is larger than ${MAX_IMAGE_MB} MB.`
  return ''
}

// ---------- PDF support (runs in the browser) ----------
let pdfjsPromise = null
function getPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url')])
      .then(([lib, worker]) => {
        lib.GlobalWorkerOptions.workerSrc = worker.default
        return lib
      })
      .catch((err) => {
        pdfjsPromise = null
        throw err
      })
  }
  return pdfjsPromise
}

function canvasToBlob(canvas, quality = 0.85) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not create a page image.'))), 'image/jpeg', quality)
  })
}

// Resizes and converts an image file to JPEG to save storage space
export async function compressImage(file, maxWidth, quality = 0.85) {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxWidth / bitmap.width)
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)
  ctx.drawImage(bitmap, 0, 0, width, height)
  if (bitmap.close) bitmap.close()

  const blob = await canvasToBlob(canvas, quality)
  canvas.width = 0
  return blob
}

// The "whole book": either one PDF, or several page images (not both)
export async function readBookSource(fileList) {
  const files = sortFiles(fileList)
  if (files.length === 0) throw new Error('Please choose the book file.')

  const pdfs = files.filter((f) => f.type === 'application/pdf' || /\.pdf$/i.test(f.name))
  if (pdfs.length > 0) {
    if (files.length > 1) throw new Error('Please choose one PDF file, or several page images, but not both.')
    const file = pdfs[0]
    if (file.size > MAX_PDF_MB * 1024 * 1024) throw new Error(`This PDF is larger than ${MAX_PDF_MB} MB.`)

    const pdfjs = await getPdfjs()
    let doc
    try {
      doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise
    } catch {
      throw new Error('This PDF could not be opened. It may be damaged or password-protected.')
    }
    const count = doc.numPages
    await doc.destroy()
    if (count > MAX_PAGES) throw new Error(`This PDF has ${count} pages. The limit is ${MAX_PAGES} pages.`)
    return { kind: 'pdf', file, count }
  }

  const problem = validateImages(files, MAX_PAGES)
  if (problem) throw new Error(problem)
  return { kind: 'images', files, count: files.length }
}

async function openRenderer(source) {
  if (source.kind === 'images') {
    return {
      count: source.count,
      get: (i, maxWidth) => compressImage(source.files[i], maxWidth),
      close: async () => {},
    }
  }

  const pdfjs = await getPdfjs()
  const doc = await pdfjs.getDocument({ data: await source.file.arrayBuffer() }).promise
  return {
    count: doc.numPages,
    get: async (i, maxWidth) => {
      const page = await doc.getPage(i + 1)
      const base = page.getViewport({ scale: 1 })
      const scale = Math.min(3, maxWidth / base.width)
      const viewport = page.getViewport({ scale })
      const canvas = document.createElement('canvas')
      canvas.width = Math.ceil(viewport.width)
      canvas.height = Math.ceil(viewport.height)
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      await page.render({ canvasContext: ctx, viewport }).promise
      page.cleanup()
      const blob = await canvasToBlob(canvas)
      canvas.width = 0
      return blob
    },
    close: () => doc.destroy(),
  }
}

// ---------- Storage helpers ----------
async function withRetry(fn, tries = 3) {
  let last
  for (let i = 0; i < tries; i += 1) {
    try {
      return await fn()
    } catch (err) {
      last = err
      await new Promise((r) => setTimeout(r, 600 * (i + 1)))
    }
  }
  throw last
}

async function putFile(bucket, path, blob) {
  await withRetry(async () => {
    const { error } = await supabase.storage
      .from(bucket)
      .upload(path, blob, { contentType: 'image/jpeg', cacheControl: '31536000', upsert: true })
    if (error) throw error
  })
}

async function removeFiles(bucket, paths) {
  if (!paths || paths.length === 0) return
  await supabase.storage.from(bucket).remove(paths)
}

function publicUrl(bucket, path) {
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
}

export function pathFromPublicUrl(url, bucket) {
  if (!url) return null
  const marker = `/storage/v1/object/public/${bucket}/`
  const i = url.indexOf(marker)
  if (i === -1) return null
  return decodeURIComponent(url.slice(i + marker.length).split('?')[0])
}

async function insertInChunks(table, rows) {
  for (let i = 0; i < rows.length; i += 100) {
    const { error } = await supabase.from(table).insert(rows.slice(i, i + 100))
    if (error) throw error
  }
}

// ---------- Create a whole book in one go ----------
// Uploads everything first, then creates the book as UNPUBLISHED.
// If anything fails, every uploaded file is removed and no book is created.
export async function createBookFull({ details, coverFile, previewMode, previewFiles, source }, onProgress) {
  const { data: taken, error: slugErr } = await supabase.from('books').select('id').eq('slug', details.slug).maybeSingle()
  if (slugErr) throw slugErr
  if (taken) throw new Error('Another book already uses this web address. Please change it.')

  const bookId = crypto.randomUUID()
  const batch = Date.now()
  const uploaded = { covers: [], previews: [], 'book-pages': [] }
  const total = 1 + source.count + (previewMode === 'own' ? previewFiles.length : 0)
  let done = 0
  const tick = (label) => {
    done += 1
    if (onProgress) onProgress(done, total, label)
  }

  let renderer = null
  let rowInserted = false

  try {
    const coverPath = `${bookId}/${batch}.jpg`
    await putFile('covers', coverPath, await compressImage(coverFile, 900))
    uploaded.covers.push(coverPath)
    tick('Cover')

    const previewRows = []
    if (previewMode === 'own') {
      for (let i = 0; i < previewFiles.length; i += 1) {
        const path = `${bookId}/${batch}/page-${i + 1}.jpg`
        await putFile('previews', path, await compressImage(previewFiles[i], PREVIEW_WIDTH))
        uploaded.previews.push(path)
        previewRows.push({ book_id: bookId, page_number: i + 1, image_url: publicUrl('previews', path) })
        tick(`Preview ${i + 1} of ${previewFiles.length}`)
      }
    }

    renderer = await openRenderer(source)
    const pageRows = []
    for (let i = 0; i < renderer.count; i += 1) {
      const blob = await renderer.get(i, PAGE_WIDTH)
      const path = `${bookId}/${batch}/${String(i + 1).padStart(4, '0')}.jpg`
      await putFile('book-pages', path, blob)
      uploaded['book-pages'].push(path)
      pageRows.push({ book_id: bookId, page_number: i + 1, storage_path: path })

      if (previewMode === 'first' && i < 5) {
        const previewPath = `${bookId}/${batch}/page-${i + 1}.jpg`
        await putFile('previews', previewPath, blob)
        uploaded.previews.push(previewPath)
        previewRows.push({ book_id: bookId, page_number: i + 1, image_url: publicUrl('previews', previewPath) })
      }
      tick(`Page ${i + 1} of ${renderer.count}`)
    }

    const { error: bookErr } = await supabase.from('books').insert({
      id: bookId,
      title: details.title,
      slug: details.slug,
      author: details.author,
      description: details.description,
      category_id: details.category_id,
      cover_url: publicUrl('covers', coverPath),
      page_count: pageRows.length,
      is_published: false,
    })
    if (bookErr) throw bookErr
    rowInserted = true

    await insertInChunks('book_pages', pageRows)
    await insertInChunks('book_previews', previewRows)
  } catch (err) {
    if (rowInserted) await supabase.from('books').delete().eq('id', bookId)
    await Promise.allSettled([
      removeFiles('covers', uploaded.covers),
      removeFiles('previews', uploaded.previews),
      removeFiles('book-pages', uploaded['book-pages']),
    ])
    throw err
  } finally {
    if (renderer) await renderer.close()
  }

  return bookId
}

// ---------- Replace parts of an existing book ----------
export async function replaceCover(bookId, file, oldUrl) {
  const blob = await compressImage(file, 900)
  const path = `${bookId}/${Date.now()}.jpg`
  await putFile('covers', path, blob)

  const url = publicUrl('covers', path)
  const { error } = await supabase.from('books').update({ cover_url: url }).eq('id', bookId)
  if (error) {
    await removeFiles('covers', [path])
    throw error
  }

  const oldPath = pathFromPublicUrl(oldUrl, 'covers')
  if (oldPath) await removeFiles('covers', [oldPath])
  return url
}

export async function replacePreviews(bookId, files, onProgress) {
  const batch = Date.now()
  const paths = []
  try {
    for (let i = 0; i < files.length; i += 1) {
      const path = `${bookId}/${batch}/page-${i + 1}.jpg`
      await putFile('previews', path, await compressImage(files[i], PREVIEW_WIDTH))
      paths.push(path)
      if (onProgress) onProgress(i + 1, files.length)
    }
  } catch (err) {
    await removeFiles('previews', paths)
    throw err
  }

  const { data: old } = await supabase.from('book_previews').select('image_url').eq('book_id', bookId)
  const rows = paths.map((p, i) => ({ book_id: bookId, page_number: i + 1, image_url: publicUrl('previews', p) }))

  const { error } = await supabase.from('book_previews').upsert(rows, { onConflict: 'book_id,page_number' })
  if (error) {
    await removeFiles('previews', paths)
    throw error
  }

  await supabase.from('book_previews').delete().eq('book_id', bookId).gt('page_number', paths.length)

  const keep = new Set(paths)
  const stale = (old || []).map((r) => pathFromPublicUrl(r.image_url, 'previews')).filter((p) => p && !keep.has(p))
  await removeFiles('previews', stale)
  return paths.length
}

export async function replaceBookPages(bookId, source, onProgress) {
  const batch = Date.now()
  const paths = []
  let renderer = null
  try {
    renderer = await openRenderer(source)
    for (let i = 0; i < renderer.count; i += 1) {
      const blob = await renderer.get(i, PAGE_WIDTH)
      const path = `${bookId}/${batch}/${String(i + 1).padStart(4, '0')}.jpg`
      await putFile('book-pages', path, blob)
      paths.push(path)
      if (onProgress) onProgress(i + 1, renderer.count)
    }
  } catch (err) {
    await removeFiles('book-pages', paths)
    throw err
  } finally {
    if (renderer) await renderer.close()
  }

  const { data: old } = await supabase.from('book_pages').select('storage_path').eq('book_id', bookId)

  const rows = paths.map((p, i) => ({ book_id: bookId, page_number: i + 1, storage_path: p }))
  const { error } = await supabase.from('book_pages').upsert(rows, { onConflict: 'book_id,page_number' })
  if (error) {
    await removeFiles('book-pages', paths)
    throw error
  }

  await supabase.from('book_pages').delete().eq('book_id', bookId).gt('page_number', paths.length)
  await supabase.from('books').update({ page_count: paths.length }).eq('id', bookId)

  const keep = new Set(paths)
  const stale = (old || []).map((r) => r.storage_path).filter((p) => !keep.has(p))
  await removeFiles('book-pages', stale)
  return paths.length
}

export async function deleteBookCompletely(bookId) {
  const [pagesRes, previewsRes, bookRes] = await Promise.all([
    supabase.from('book_pages').select('storage_path').eq('book_id', bookId),
    supabase.from('book_previews').select('image_url').eq('book_id', bookId),
    supabase.from('books').select('cover_url').eq('id', bookId).maybeSingle(),
  ])

  const pagePaths = (pagesRes.data || []).map((p) => p.storage_path)
  const previewPaths = (previewsRes.data || []).map((p) => pathFromPublicUrl(p.image_url, 'previews')).filter(Boolean)
  const coverPath = pathFromPublicUrl(bookRes.data?.cover_url, 'covers')

  const { error } = await supabase.from('books').delete().eq('id', bookId)
  if (error) throw error

  await Promise.allSettled([
    removeFiles('book-pages', pagePaths),
    removeFiles('previews', previewPaths),
    removeFiles('covers', coverPath ? [coverPath] : []),
  ])
}
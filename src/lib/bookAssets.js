import { supabase } from './supabase'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_INPUT_MB = 15

export function sortFiles(fileList) {
  return Array.from(fileList).sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }),
  )
}

export function validateImages(files, max) {
  if (files.length === 0) return 'Please choose at least one image.'
  if (files.length > max) return `Please choose at most ${max} image${max === 1 ? '' : 's'}.`
  const wrongType = files.find((f) => !ALLOWED_TYPES.includes(f.type))
  if (wrongType) return `"${wrongType.name}" is not a JPG, PNG or WebP image.`
  const tooBig = files.find((f) => f.size > MAX_INPUT_MB * 1024 * 1024)
  if (tooBig) return `"${tooBig.name}" is larger than ${MAX_INPUT_MB} MB.`
  return ''
}

// Resizes and converts to JPEG in the browser to save storage space
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

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
  if (!blob) throw new Error(`Could not process "${file.name}".`)
  return blob
}

export function pathFromPublicUrl(url, bucket) {
  if (!url) return null
  const marker = `/storage/v1/object/public/${bucket}/`
  const i = url.indexOf(marker)
  if (i === -1) return null
  return decodeURIComponent(url.slice(i + marker.length).split('?')[0])
}

async function removeFiles(bucket, paths) {
  if (!paths || paths.length === 0) return
  await supabase.storage.from(bucket).remove(paths)
}

// Uploads every file first. If anything fails, the new files are removed and nothing changes.
async function uploadAll(bucket, bookId, files, maxWidth, onProgress, namer) {
  const batch = Date.now()
  const uploaded = []
  try {
    for (let i = 0; i < files.length; i += 1) {
      const blob = await compressImage(files[i], maxWidth)
      const path = `${bookId}/${batch}/${namer(i + 1)}.jpg`
      const { error } = await supabase.storage
        .from(bucket)
        .upload(path, blob, { contentType: 'image/jpeg', cacheControl: '31536000', upsert: false })
      if (error) throw error
      uploaded.push(path)
      if (onProgress) onProgress(i + 1, files.length)
    }
  } catch (err) {
    await removeFiles(bucket, uploaded)
    throw err
  }
  return uploaded
}

export async function replaceCover(bookId, file, oldUrl) {
  const blob = await compressImage(file, 900)
  const path = `${bookId}/${Date.now()}.jpg`
  const { error: upErr } = await supabase.storage
    .from('covers')
    .upload(path, blob, { contentType: 'image/jpeg', cacheControl: '31536000', upsert: false })
  if (upErr) throw upErr

  const { data } = supabase.storage.from('covers').getPublicUrl(path)
  const { error } = await supabase.from('books').update({ cover_url: data.publicUrl }).eq('id', bookId)
  if (error) {
    await removeFiles('covers', [path])
    throw error
  }

  const oldPath = pathFromPublicUrl(oldUrl, 'covers')
  if (oldPath) await removeFiles('covers', [oldPath])
  return data.publicUrl
}

export async function replacePreviews(bookId, files, onProgress) {
  const paths = await uploadAll('previews', bookId, files, 1200, onProgress, (n) => `page-${n}`)

  const { data: old } = await supabase.from('book_previews').select('image_url').eq('book_id', bookId)

  const rows = paths.map((p, i) => ({
    book_id: bookId,
    page_number: i + 1,
    image_url: supabase.storage.from('previews').getPublicUrl(p).data.publicUrl,
  }))

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

export async function replaceBookPages(bookId, files, onProgress) {
  const paths = await uploadAll('book-pages', bookId, files, 1400, onProgress, (n) => String(n).padStart(4, '0'))

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

  // Best-effort cleanup of the files after the book row is gone
  await Promise.allSettled([
    removeFiles('book-pages', pagePaths),
    removeFiles('previews', previewPaths),
    removeFiles('covers', coverPath ? [coverPath] : []),
  ])
}
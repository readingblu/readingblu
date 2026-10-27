import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AlertCircle, ArrowLeft, BookOpen, Loader2, Save } from 'lucide-react'
import AppLayout from '../components/AppLayout'
import Toast from '../components/Toast'
import AssetUploader from '../components/admin/AssetUploader'
import { useToast } from '../hooks/useToast'
import { supabase } from '../lib/supabase'
import { replaceBookPages, replaceCover, replacePreviews } from '../lib/bookAssets'

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/
const EMPTY = { title: '', slug: '', author: 'Al Joodh', description: '', category_id: '', is_published: false }

function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const inputClass =
  'mt-1 w-full rounded-2xl border-2 border-ink/30 bg-paper px-4 py-3 text-base font-semibold outline-none focus:border-ink focus:bg-white'

export default function AdminBookEditPage() {
  const { id } = useParams()
  const isNew = !id
  const navigate = useNavigate()
  const { message, show } = useToast()

  const [categories, setCategories] = useState([])
  const [form, setForm] = useState(EMPTY)
  const [slugTouched, setSlugTouched] = useState(false)
  const [book, setBook] = useState(null)
  const [pageCount, setPageCount] = useState(0)
  const [previewCount, setPreviewCount] = useState(0)
  const [loading, setLoading] = useState(!isNew)
  const [loadError, setLoadError] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [coverFailed, setCoverFailed] = useState(false)

  useEffect(() => {
    let active = true

    supabase
      .from('categories')
      .select('id, name, group_name')
      .order('sort_order')
      .then(({ data }) => {
        if (active && data) setCategories(data)
      })

    if (!id) {
      setBook(null)
      setForm(EMPTY)
      setSlugTouched(false)
      setPageCount(0)
      setPreviewCount(0)
      setLoadError('')
      setLoading(false)
      return () => {
        active = false
      }
    }

    setLoading(true)
    setLoadError('')

    Promise.all([
      supabase
        .from('books')
        .select('id, title, slug, author, description, cover_url, category_id, page_count, is_published')
        .eq('id', id)
        .maybeSingle(),
      supabase.from('book_pages').select('id', { count: 'exact', head: true }).eq('book_id', id),
      supabase.from('book_previews').select('id', { count: 'exact', head: true }).eq('book_id', id),
    ]).then(([b, p, pv]) => {
      if (!active) return
      if (b.error || p.error || pv.error) {
        setLoadError('We could not load this book. Please refresh the page.')
      } else if (!b.data) {
        setLoadError('Book not found.')
      } else {
        setBook(b.data)
        setCoverFailed(false)
        setForm({
          title: b.data.title,
          slug: b.data.slug,
          author: b.data.author,
          description: b.data.description || '',
          category_id: b.data.category_id || '',
          is_published: b.data.is_published,
        })
        setSlugTouched(true)
        setPageCount(p.count ?? 0)
        setPreviewCount(pv.count ?? 0)
      }
      setLoading(false)
    })

    return () => {
      active = false
    }
  }, [id])

  const setField = (name, value) => setForm((f) => ({ ...f, [name]: value }))

  const onTitle = (value) =>
    setForm((f) => ({ ...f, title: value, slug: slugTouched ? f.slug : slugify(value) }))

  const save = async (e) => {
    e.preventDefault()
    setFormError('')

    const title = form.title.trim()
    const slug = form.slug.trim()
    if (!title) {
      setFormError('Please enter a title.')
      return
    }
    if (!SLUG_RE.test(slug)) {
      setFormError('The web address can only use lowercase letters, numbers and single dashes, for example the-moon-rabbit.')
      return
    }

    const payload = {
      title,
      slug,
      author: form.author.trim() || 'Al Joodh',
      description: form.description.trim() || null,
      category_id: form.category_id || null,
      is_published: form.is_published,
    }

    setSaving(true)
    if (isNew) {
      const { data, error } = await supabase.from('books').insert(payload).select('id').single()
      if (error) {
        setFormError(error.code === '23505' ? 'Another book already uses this web address. Please change it.' : error.message)
      } else {
        show('Book created. Now add the cover, preview and pages.')
        navigate(`/admin/books/${data.id}`, { replace: true })
      }
    } else {
      const { error } = await supabase.from('books').update(payload).eq('id', id)
      if (error) {
        setFormError(error.code === '23505' ? 'Another book already uses this web address. Please change it.' : error.message)
      } else {
        setBook((b) => (b ? { ...b, ...payload } : b))
        show('Details saved')
      }
    }
    setSaving(false)
  }

  const uploadCover = async (files) => {
    const url = await replaceCover(id, files[0], book?.cover_url)
    setBook((b) => (b ? { ...b, cover_url: url } : b))
    setCoverFailed(false)
  }

  const uploadPreviews = async (files, onProgress) => {
    const n = await replacePreviews(id, files, onProgress)
    setPreviewCount(n)
  }

  const uploadPages = async (files, onProgress) => {
    const n = await replaceBookPages(id, files, onProgress)
    setPageCount(n)
  }

  const slugChanged = !isNew && book && form.slug !== book.slug

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-5 sm:py-10">
        <Link to="/admin" className="inline-flex items-center gap-1 text-sm font-extrabold hover:underline">
          <ArrowLeft className="h-4 w-4" /> All books
        </Link>

        <h1 className="mt-3 text-2xl font-extrabold sm:text-3xl">{isNew ? 'New book' : 'Edit book'}</h1>

        {loading && (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin" aria-label="Loading" />
          </div>
        )}

        {!loading && loadError && (
          <div role="alert" className="mt-6 rounded-3xl border-2 border-ink bg-white p-8 text-center">
            <AlertCircle className="mx-auto h-10 w-10 text-blush" />
            <p className="mt-3 font-bold">{loadError}</p>
          </div>
        )}

        {!loading && !loadError && (
          <div className="mt-6 space-y-6">
            <form onSubmit={save} className="rounded-3xl border-2 border-ink bg-white p-5 sm:p-6">
              <h2 className="text-xl font-extrabold">Details</h2>

              <label className="mt-4 block text-sm font-extrabold">
                Title
                <input
                  value={form.title}
                  onChange={(e) => onTitle(e.target.value)}
                  maxLength={150}
                  className={inputClass}
                  placeholder="The Moon Rabbit"
                />
              </label>

              <label className="mt-4 block text-sm font-extrabold">
                Web address (slug)
                <input
                  value={form.slug}
                  onChange={(e) => {
                    setSlugTouched(true)
                    setField('slug', e.target.value.toLowerCase())
                  }}
                  maxLength={100}
                  className={inputClass}
                  placeholder="the-moon-rabbit"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                />
              </label>
              {slugChanged && (
                <p className="mt-1 text-xs font-bold text-ink-soft">
                  Changing the web address changes the book’s link. Old links will stop working.
                </p>
              )}

              <label className="mt-4 block text-sm font-extrabold">
                Author
                <input value={form.author} onChange={(e) => setField('author', e.target.value)} maxLength={100} className={inputClass} />
              </label>

              <label className="mt-4 block text-sm font-extrabold">
                Category
                <select value={form.category_id} onChange={(e) => setField('category_id', e.target.value)} className={inputClass}>
                  <option value="">No category</option>
                  {['Fiction', 'Non Fiction'].map((group) => (
                    <optgroup key={group} label={group}>
                      {categories
                        .filter((c) => c.group_name === group)
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                    </optgroup>
                  ))}
                </select>
              </label>

              <label className="mt-4 block text-sm font-extrabold">
                Description
                <textarea
                  value={form.description}
                  onChange={(e) => setField('description', e.target.value)}
                  rows={6}
                  maxLength={3000}
                  className={`${inputClass} resize-y`}
                  placeholder="Write a short description of the book."
                />
              </label>

              <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm font-extrabold">
                <input
                  type="checkbox"
                  checked={form.is_published}
                  onChange={(e) => setField('is_published', e.target.checked)}
                  className="mt-0.5 h-5 w-5 shrink-0 accent-lime-deep"
                />
                <span>
                  Published
                  <span className="block font-semibold text-ink-soft">Readers can only see published books.</span>
                </span>
              </label>

              {form.is_published && !isNew && pageCount === 0 && (
                <p className="mt-3 rounded-xl bg-blush/25 p-3 text-sm font-bold">
                  This book has no pages yet. Upload its pages below before publishing, or readers will see an empty reader.
                </p>
              )}

              {formError && (
                <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">
                  {formError}
                </p>
              )}

              <button
                type="submit"
                disabled={saving}
                className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-lime px-6 font-extrabold shadow-[0_4px_0_0_var(--color-ink)] transition hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none disabled:opacity-60 sm:w-auto"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {isNew ? 'Create book' : 'Save details'}
              </button>
            </form>

            {isNew && (
              <p className="rounded-2xl bg-sky p-4 text-sm font-bold">
                After you create the book, the cover, preview and page uploads appear here.
              </p>
            )}

            {!isNew && book && (
              <>
                <div className="flex flex-wrap gap-3">
                  <Link
                    to={`/book/${book.slug}`}
                    className="inline-flex h-10 items-center rounded-full border-2 border-ink bg-white px-4 text-sm font-extrabold hover:bg-sky"
                  >
                    Open book page
                  </Link>
                  <Link
                    to={`/read/${book.slug}`}
                    className="inline-flex h-10 items-center rounded-full border-2 border-ink bg-white px-4 text-sm font-extrabold hover:bg-sky"
                  >
                    Test the reader
                  </Link>
                </div>

                <div className="rounded-3xl border-2 border-ink bg-white p-5 sm:p-6">
                  <div className="flex gap-4">
                    {book.cover_url && !coverFailed ? (
                      <img
                        src={book.cover_url}
                        alt="Current cover"
                        onError={() => setCoverFailed(true)}
                        className="h-36 w-24 shrink-0 rounded-xl border-2 border-ink bg-sky object-cover"
                      />
                    ) : (
                      <div className="flex h-36 w-24 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-ink to-ink-soft text-lime">
                        <BookOpen className="h-8 w-8" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <h2 className="text-xl font-extrabold">Cover</h2>
                      <p className="mt-1 text-sm font-semibold text-ink-soft">
                        One portrait image (2:3 shape works best). It is resized to 900 px wide.
                      </p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <AssetUploaderInline onUpload={uploadCover} notify={show} />
                  </div>
                </div>

                <AssetUploader
                  title="Preview pages"
                  help="Up to 5 images shown in the Preview button. Select them together; they are ordered by file name."
                  max={5}
                  status={`${previewCount} of 5 preview pages uploaded`}
                  onUpload={uploadPreviews}
                  notify={show}
                />

                <AssetUploader
                  title="Book pages"
                  help="All pages of the e-book as images, up to 400. Name them so they sort in order (page-001.jpg, page-002.jpg …). Pages are resized to 1400 px wide and kept private."
                  max={400}
                  status={`${pageCount} ${pageCount === 1 ? 'page' : 'pages'} uploaded`}
                  onUpload={uploadPages}
                  notify={show}
                />
              </>
            )}
          </div>
        )}
      </div>

      <Toast message={message} />
    </AppLayout>
  )
}

// Compact single-image uploader used inside the cover card
function AssetUploaderInline({ onUpload, notify }) {
  return (
    <AssetUploader
      title="Cover"
      help="Choose the new cover, then upload."
      max={1}
      status="Replaces the current cover"
      onUpload={(files) => onUpload(files)}
      notify={notify}
    />
  )
}
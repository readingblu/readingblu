import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AlertCircle, ArrowLeft, BookOpen, CheckCircle2, Circle, Eye, EyeOff, Loader2, Save } from 'lucide-react'
import AppLayout from '../components/AppLayout'
import Toast from '../components/Toast'
import FileField from '../components/admin/FileField'
import ReplaceBlock from '../components/admin/ReplaceBlock'
import { useToast } from '../hooks/useToast'
import { supabase } from '../lib/supabase'
import {
  MAX_PAGES,
  createBookFull,
  readBookSource,
  replaceBookPages,
  replaceCover,
  replacePreviews,
  sortFiles,
  validateImages,
} from '../lib/bookAssets'

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/
const EMPTY = { title: '', slug: '', author: 'Al Joodh', description: '', category_id: '' }
const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp'
const BOOK_ACCEPT = 'application/pdf,.pdf,image/jpeg,image/png,image/webp'

const inputClass =
  'mt-1 w-full rounded-2xl border-2 border-ink/30 bg-paper px-4 py-3 text-base font-semibold outline-none focus:border-ink focus:bg-white'

function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function useCategories() {
  const [categories, setCategories] = useState([])
  useEffect(() => {
    let active = true
    supabase
      .from('categories')
      .select('id, name, group_name')
      .order('sort_order')
      .then(({ data }) => {
        if (active && data) setCategories(data)
      })
    return () => {
      active = false
    }
  }, [])
  return categories
}

function DetailsFields({ form, categories, disabled, onTitle, onSlug, onField, slugWarning }) {
  return (
    <>
      <label className="mt-4 block text-sm font-extrabold">
        Title
        <input
          value={form.title}
          onChange={(e) => onTitle(e.target.value)}
          maxLength={150}
          disabled={disabled}
          className={inputClass}
          placeholder="The Moon Rabbit"
        />
      </label>

      <label className="mt-4 block text-sm font-extrabold">
        Web address (slug)
        <input
          value={form.slug}
          onChange={(e) => onSlug(e.target.value.toLowerCase())}
          maxLength={100}
          disabled={disabled}
          className={inputClass}
          placeholder="the-moon-rabbit"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
        />
      </label>
      {slugWarning && (
        <p className="mt-1 text-xs font-bold text-ink-soft">
          Changing the web address changes the book’s link. Old links will stop working.
        </p>
      )}

      <label className="mt-4 block text-sm font-extrabold">
        Author
        <input value={form.author} onChange={(e) => onField('author', e.target.value)} maxLength={100} disabled={disabled} className={inputClass} />
      </label>

      <label className="mt-4 block text-sm font-extrabold">
        Category
        <select value={form.category_id} onChange={(e) => onField('category_id', e.target.value)} disabled={disabled} className={inputClass}>
          <option value="">Choose a category</option>
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
          onChange={(e) => onField('description', e.target.value)}
          rows={6}
          maxLength={3000}
          disabled={disabled}
          className={`${inputClass} resize-y`}
          placeholder="Write a short description of the book."
        />
      </label>
    </>
  )
}

/* ---------------------------- NEW BOOK (one page) ---------------------------- */

function NewBook() {
  const navigate = useNavigate()
  const categories = useCategories()

  const [form, setForm] = useState(EMPTY)
  const [slugTouched, setSlugTouched] = useState(false)
  const [coverFile, setCoverFile] = useState(null)
  const [coverError, setCoverError] = useState('')
  const [previewMode, setPreviewMode] = useState('first')
  const [previewFiles, setPreviewFiles] = useState([])
  const [previewError, setPreviewError] = useState('')
  const [source, setSource] = useState(null)
  const [sourceError, setSourceError] = useState('')
  const [reading, setReading] = useState(false)
  const [progress, setProgress] = useState(null)
  const [error, setError] = useState('')

  const busy = progress !== null

  useEffect(() => {
    if (!busy) return undefined
    const warn = (e) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [busy])

  const onTitle = (value) => setForm((f) => ({ ...f, title: value, slug: slugTouched ? f.slug : slugify(value) }))
  const onSlug = (value) => {
    setSlugTouched(true)
    setForm((f) => ({ ...f, slug: value }))
  }
  const onField = (name, value) => setForm((f) => ({ ...f, [name]: value }))

  const chooseCover = (files) => {
    const list = sortFiles(files)
    const problem = validateImages(list, 1)
    if (problem) {
      setCoverError(problem)
      setCoverFile(null)
      return
    }
    setCoverError('')
    setCoverFile(list[0])
  }

  const choosePreviews = (files) => {
    const list = sortFiles(files)
    const problem = validateImages(list, 5)
    if (problem) {
      setPreviewError(problem)
      setPreviewFiles([])
      return
    }
    setPreviewError('')
    setPreviewFiles(list)
  }

  const chooseBook = async (files) => {
    setSourceError('')
    setReading(true)
    try {
      setSource(await readBookSource(files))
    } catch (err) {
      setSource(null)
      setSourceError(err?.message || 'This book file cannot be used.')
    }
    setReading(false)
  }

  const missing = []
  if (!form.title.trim()) missing.push('Title')
  if (!SLUG_RE.test(form.slug.trim())) missing.push('Valid web address')
  if (!form.category_id) missing.push('Category')
  if (!form.description.trim()) missing.push('Description')
  if (!coverFile) missing.push('Cover image')
  if (!source) missing.push('Book file')
  if (previewMode === 'own' && previewFiles.length === 0) missing.push('Preview images')

  const create = async () => {
    if (missing.length > 0 || busy) return
    setError('')
    setProgress({ done: 0, total: 1, label: 'Starting' })
    try {
      await createBookFull(
        {
          details: {
            title: form.title.trim(),
            slug: form.slug.trim(),
            author: form.author.trim() || 'Al Joodh',
            description: form.description.trim(),
            category_id: form.category_id,
          },
          coverFile,
          previewMode,
          previewFiles,
          source,
        },
        (done, total, label) => setProgress({ done, total, label }),
      )
      navigate('/admin', {
        replace: true,
        state: { notice: `“${form.title.trim()}” was created. Click Publish when you are ready.` },
      })
    } catch (err) {
      setError(err?.message || 'The book could not be created. Nothing was saved. Please try again.')
      setProgress(null)
    }
  }

  const pct = progress ? Math.round((progress.done / progress.total) * 100) : 0

  return (
    <div className="mt-6 space-y-6">
      <section className="rounded-3xl border-2 border-ink bg-white p-5 sm:p-6">
        <h2 className="text-xl font-extrabold">1. Details</h2>
        <DetailsFields
          form={form}
          categories={categories}
          disabled={busy}
          onTitle={onTitle}
          onSlug={onSlug}
          onField={onField}
          slugWarning={false}
        />
      </section>

      <section className="rounded-3xl border-2 border-ink bg-white p-5 sm:p-6">
        <h2 className="text-xl font-extrabold">2. Cover</h2>
        <div className="mt-3">
          <FileField
            label="Cover image"
            help="One portrait image (2:3 shape works best). It is resized to 900 px wide."
            accept={IMAGE_ACCEPT}
            disabled={busy}
            summary={coverFile ? coverFile.name : ''}
            error={coverError}
            onFiles={chooseCover}
          />
        </div>
      </section>

      <section className="rounded-3xl border-2 border-ink bg-white p-5 sm:p-6">
        <h2 className="text-xl font-extrabold">3. The whole book</h2>
        <div className="mt-3">
          <FileField
            label="Book file"
            help={`One PDF of the whole book, or all the page images together. Up to ${MAX_PAGES} pages. A PDF is turned into page images in your browser, and your PDF is not stored.`}
            accept={BOOK_ACCEPT}
            multiple
            disabled={busy || reading}
            summary={
              reading
                ? 'Checking the file…'
                : source
                  ? source.kind === 'pdf'
                    ? `${source.file.name} · ${source.count} pages`
                    : `${source.count} page images · ${source.files[0].name} → ${source.files[source.files.length - 1].name}`
                  : ''
            }
            error={sourceError}
            onFiles={chooseBook}
          />
        </div>
      </section>

      <section className="rounded-3xl border-2 border-ink bg-white p-5 sm:p-6">
        <h2 className="text-xl font-extrabold">4. Preview pages</h2>
        <p className="mt-1 text-sm font-semibold text-ink-soft">Shown to everyone before they read. Preview pages are public.</p>

        <div className="mt-3 space-y-2 text-sm font-extrabold">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="radio"
              name="preview-mode"
              checked={previewMode === 'first'}
              onChange={() => setPreviewMode('first')}
              disabled={busy}
              className="mt-0.5 h-5 w-5 shrink-0 accent-lime-deep"
            />
            <span>
              Use the first 5 pages of the book
              <span className="block font-semibold text-ink-soft">The easiest option. Fewer pages are used if the book is shorter.</span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="radio"
              name="preview-mode"
              checked={previewMode === 'own'}
              onChange={() => setPreviewMode('own')}
              disabled={busy}
              className="mt-0.5 h-5 w-5 shrink-0 accent-lime-deep"
            />
            <span>
              Upload my own preview images
              <span className="block font-semibold text-ink-soft">Up to 5 images.</span>
            </span>
          </label>
        </div>

        {previewMode === 'own' && (
          <div className="mt-4">
            <FileField
              label="Preview images"
              accept={IMAGE_ACCEPT}
              multiple
              disabled={busy}
              summary={previewFiles.length > 0 ? `${previewFiles.length} selected` : ''}
              error={previewError}
              onFiles={choosePreviews}
            />
          </div>
        )}
      </section>

      <section className="rounded-3xl border-2 border-ink bg-white p-5 sm:p-6">
        <h2 className="text-xl font-extrabold">5. Create</h2>

        <ul className="mt-3 space-y-1.5 text-sm font-bold">
          {[
            ['Title', form.title.trim()],
            ['Valid web address', SLUG_RE.test(form.slug.trim())],
            ['Category', form.category_id],
            ['Description', form.description.trim()],
            ['Cover image', coverFile],
            ['Book file', source],
            ['Preview pages', previewMode === 'first' || previewFiles.length > 0],
          ].map(([label, ok]) => (
            <li key={label} className="flex items-center gap-2">
              {ok ? <CheckCircle2 className="h-4 w-4 text-lime-deep" /> : <Circle className="h-4 w-4 text-ink/30" />}
              <span className={ok ? '' : 'text-ink-soft'}>{label}</span>
            </li>
          ))}
        </ul>

        <p className="mt-3 text-sm font-semibold text-ink-soft">
          The book is created as hidden. After that you can Publish, Unpublish or Edit it from the books list.
        </p>

        {error && (
          <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">
            {error}
          </p>
        )}

        {busy && (
          <div className="mt-4" role="status" aria-live="polite">
            <div className="h-3 overflow-hidden rounded-full bg-sky">
              <div className="h-full rounded-full bg-lime-deep transition-all" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-2 text-sm font-bold">
              {progress.label}. Please keep this tab open until it finishes.
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={create}
          disabled={missing.length > 0 || busy || reading}
          className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-lime px-6 font-extrabold shadow-[0_4px_0_0_var(--color-ink)] transition hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {busy ? 'Creating…' : 'Create book'}
        </button>
        {missing.length > 0 && !busy && (
          <p className="mt-2 text-sm font-bold text-ink-soft">Still needed: {missing.join(', ')}.</p>
        )}
      </section>
    </div>
  )
}

/* ------------------------------- EDIT BOOK -------------------------------- */

function EditBook({ id }) {
  const categories = useCategories()
  const { message, show } = useToast()

  const [form, setForm] = useState(EMPTY)
  const [book, setBook] = useState(null)
  const [pageCount, setPageCount] = useState(0)
  const [previewCount, setPreviewCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [coverFailed, setCoverFailed] = useState(false)
  const [publishing, setPublishing] = useState(false)

  useEffect(() => {
    let active = true
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
        })
        setPageCount(p.count ?? 0)
        setPreviewCount(pv.count ?? 0)
      }
      setLoading(false)
    })

    return () => {
      active = false
    }
  }, [id])

  const onField = (name, value) => setForm((f) => ({ ...f, [name]: value }))

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
    if (!form.description.trim()) {
      setFormError('Please write a description.')
      return
    }

    const payload = {
      title,
      slug,
      author: form.author.trim() || 'Al Joodh',
      description: form.description.trim(),
      category_id: form.category_id || null,
    }

    setSaving(true)
    const { error } = await supabase.from('books').update(payload).eq('id', id)
    if (error) {
      setFormError(error.code === '23505' ? 'Another book already uses this web address. Please change it.' : error.message)
    } else {
      setBook((b) => (b ? { ...b, ...payload } : b))
      show('Details saved')
    }
    setSaving(false)
  }

  const togglePublish = async () => {
    if (!book.is_published && pageCount === 0) {
      show('Upload the book pages before publishing.')
      return
    }
    setPublishing(true)
    const next = !book.is_published
    const { error } = await supabase.from('books').update({ is_published: next }).eq('id', id)
    if (error) show('Could not change the status. Please try again.')
    else {
      setBook((b) => (b ? { ...b, is_published: next } : b))
      show(next ? 'Book published' : 'Book hidden from readers')
    }
    setPublishing(false)
  }

  const prepareCover = async (files) => {
    const list = sortFiles(files)
    const problem = validateImages(list, 1)
    if (problem) throw new Error(problem)
    return { payload: list[0], summary: list[0].name }
  }

  const preparePreviews = async (files) => {
    const list = sortFiles(files)
    const problem = validateImages(list, 5)
    if (problem) throw new Error(problem)
    return { payload: list, summary: `${list.length} image${list.length === 1 ? '' : 's'} selected` }
  }

  const prepareBook = async (files) => {
    const src = await readBookSource(files)
    return {
      payload: src,
      summary: src.kind === 'pdf' ? `${src.file.name} · ${src.count} pages` : `${src.count} page images selected`,
    }
  }

  const slugChanged = book && form.slug !== book.slug

  return (
    <div className="mt-6 space-y-6">
      {loading && (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin" aria-label="Loading" />
        </div>
      )}

      {!loading && loadError && (
        <div role="alert" className="rounded-3xl border-2 border-ink bg-white p-8 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-blush" />
          <p className="mt-3 font-bold">{loadError}</p>
        </div>
      )}

      {!loading && !loadError && book && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <span className={`rounded-full px-3 py-1.5 text-sm font-extrabold ${book.is_published ? 'bg-lime' : 'bg-blush/40'}`}>
              {book.is_published ? 'Published' : 'Hidden'}
            </span>
            <button
              type="button"
              onClick={togglePublish}
              disabled={publishing}
              className="inline-flex h-10 items-center gap-2 rounded-full border-2 border-ink bg-white px-4 text-sm font-extrabold hover:bg-sky disabled:opacity-60"
            >
              {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : book.is_published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {book.is_published ? 'Unpublish' : 'Publish'}
            </button>
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

          <form onSubmit={save} className="rounded-3xl border-2 border-ink bg-white p-5 sm:p-6">
            <h2 className="text-xl font-extrabold">Details</h2>
            <DetailsFields
              form={form}
              categories={categories}
              disabled={saving}
              onTitle={(v) => onField('title', v)}
              onSlug={(v) => onField('slug', v)}
              onField={onField}
              slugWarning={Boolean(slugChanged)}
            />

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
              Save details
            </button>
          </form>

          <div className="flex gap-4 rounded-3xl border-2 border-ink bg-white p-5 sm:p-6">
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
              <h2 className="text-xl font-extrabold">Current cover</h2>
              <p className="mt-1 text-sm font-semibold text-ink-soft">Use the Cover block below to replace it.</p>
            </div>
          </div>

          <ReplaceBlock
            title="Cover"
            help="One portrait image (2:3 shape works best). It is resized to 900 px wide."
            accept={IMAGE_ACCEPT}
            multiple={false}
            prepare={prepareCover}
            onUpload={async (file) => {
              const url = await replaceCover(id, file, book.cover_url)
              setBook((b) => (b ? { ...b, cover_url: url } : b))
              setCoverFailed(false)
            }}
            status="Replaces the current cover"
            notify={show}
          />

          <ReplaceBlock
            title="Preview pages"
            help="Up to 5 images shown in the Preview button. Select them together; they are ordered by file name."
            accept={IMAGE_ACCEPT}
            multiple
            prepare={preparePreviews}
            onUpload={async (files, onProgress) => {
              setPreviewCount(await replacePreviews(id, files, onProgress))
            }}
            status={`${previewCount} of 5 preview pages uploaded`}
            notify={show}
          />

          <ReplaceBlock
            title="Book file"
            help={`Replace the whole book with one PDF, or with all the page images together. Up to ${MAX_PAGES} pages.`}
            accept={BOOK_ACCEPT}
            multiple
            prepare={prepareBook}
            onUpload={async (src, onProgress) => {
              const n = await replaceBookPages(id, src, onProgress)
              setPageCount(n)
              setBook((b) => (b ? { ...b, page_count: n } : b))
            }}
            status={`${pageCount} ${pageCount === 1 ? 'page' : 'pages'} uploaded`}
            notify={show}
          />
        </>
      )}

      <Toast message={message} />
    </div>
  )
}

export default function AdminBookEditPage() {
  const { id } = useParams()

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-5 sm:py-10">
        <Link to="/admin" className="inline-flex items-center gap-1 text-sm font-extrabold hover:underline">
          <ArrowLeft className="h-4 w-4" /> All books
        </Link>

        <h1 className="mt-3 text-2xl font-extrabold sm:text-3xl">{id ? 'Edit book' : 'New book'}</h1>
        {!id && (
          <p className="mt-1 text-sm font-semibold text-ink-soft">
            Fill in everything below, then click Create book. Nothing is saved until all uploads finish.
          </p>
        )}

        {id ? <EditBook id={id} /> : <NewBook />}
      </div>
    </AppLayout>
  )
}
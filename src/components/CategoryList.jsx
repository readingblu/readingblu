import { LayoutGrid } from 'lucide-react'

export default function CategoryList({ categories, active, onSelect }) {
  const groups = categories.reduce((acc, c) => {
    if (!acc[c.group_name]) acc[c.group_name] = []
    acc[c.group_name].push(c)
    return acc
  }, {})

  const itemClass = (isActive) =>
    `flex w-full items-center rounded-2xl px-4 py-2.5 text-left text-sm font-bold transition ${
      isActive ? 'bg-lime text-ink' : 'text-ink-soft hover:bg-sky'
    }`

  return (
    <nav aria-label="Categories" className="space-y-5">
      <button type="button" onClick={() => onSelect('')} aria-current={!active ? 'true' : undefined} className={itemClass(!active)}>
        <LayoutGrid className="mr-2 h-4 w-4" /> All books
      </button>

      {Object.entries(groups).map(([group, list]) => (
        <div key={group}>
          <h2 className="px-4 text-xs font-extrabold uppercase tracking-wide text-ink-soft/80">{group}</h2>
          <ul className="mt-1 space-y-1">
            {list.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => onSelect(c.slug)}
                  aria-current={active === c.slug ? 'true' : undefined}
                  className={itemClass(active === c.slug)}
                >
                  {c.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  )
}
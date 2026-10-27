import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useFavorites(userId) {
  const [ids, setIds] = useState(() => new Set())

  useEffect(() => {
    if (!userId) return undefined
    let active = true

    supabase
      .from('favorites')
      .select('book_id')
      .eq('user_id', userId)
      .then(({ data, error }) => {
        if (!active || error || !data) return
        setIds(new Set(data.map((row) => row.book_id)))
      })

    return () => {
      active = false
    }
  }, [userId])

  // Returns true when saved correctly, false when it failed (and was undone)
  const toggle = useCallback(
    async (bookId) => {
      if (!userId) return false
      const wasSaved = ids.has(bookId)

      setIds((prev) => {
        const next = new Set(prev)
        if (wasSaved) next.delete(bookId)
        else next.add(bookId)
        return next
      })

      const { error } = wasSaved
        ? await supabase.from('favorites').delete().eq('user_id', userId).eq('book_id', bookId)
        : await supabase.from('favorites').insert({ user_id: userId, book_id: bookId })

      if (error) {
        setIds((prev) => {
          const next = new Set(prev)
          if (wasSaved) next.add(bookId)
          else next.delete(bookId)
          return next
        })
        return false
      }
      return true
    },
    [ids, userId],
  )

  return { ids, toggle }
}
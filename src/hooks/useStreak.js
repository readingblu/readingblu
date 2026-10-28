import { useCallback, useEffect, useState } from 'react'
import { fetchStreak } from '../lib/streak'

export function useStreak(userId) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return undefined
    }
    let active = true
    setLoading(true)
    fetchStreak(userId)
      .then((d) => {
        if (!active) return
        setData(d)
        setFailed(false)
        setLoading(false)
      })
      .catch(() => {
        if (!active) return
        setFailed(true)
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [userId])

  const refresh = useCallback(async () => {
    try {
      setData(await fetchStreak(userId, true))
      setFailed(false)
    } catch {
      setFailed(true)
    }
  }, [userId])

  return { data, loading, failed, refresh }
}
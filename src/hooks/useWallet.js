import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useWallet(userId) {
  const [wallet, setWallet] = useState(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const alive = useRef(true)

  const refresh = useCallback(async () => {
    if (!userId) {
      setLoading(false)
      return
    }
    const { data, error } = await supabase.rpc('get_wallet')
    if (!alive.current) return
    if (error || !data) {
      setFailed(true)
    } else {
      setWallet(data)
      setFailed(false)
    }
    setLoading(false)
  }, [userId])

  useEffect(() => {
    alive.current = true
    refresh()
    return () => {
      alive.current = false
    }
  }, [refresh])

  return { wallet, loading, failed, refresh }
}
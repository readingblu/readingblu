import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useProfile(userId) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return undefined
    }

    let active = true
    setLoading(true)

    supabase
      .from('profiles')
      .select('display_name, avatar_url, credits, is_pro, is_admin')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return
        setProfile(data)
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [userId])

  return { profile, loading }
}
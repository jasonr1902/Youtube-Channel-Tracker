import { useState, useEffect, useCallback } from 'react'
import type { Goal, GoalCreate, GoalUpdate } from '../../../shared/types'

export function useGoals() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const all = await window.api.goals.getAll()
    setGoals(all)
    setLoading(false)
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const create = useCallback(async (data: GoalCreate) => {
    const g = await window.api.goals.create(data)
    setGoals(prev => [g, ...prev])
    return g
  }, [])

  const update = useCallback(async (data: GoalUpdate) => {
    const updated = await window.api.goals.update(data)
    setGoals(prev => prev.map(g => g.id === updated.id ? updated : g))
    return updated
  }, [])

  const remove = useCallback(async (id: number) => {
    await window.api.goals.delete(id)
    setGoals(prev => prev.filter(g => g.id !== id))
  }, [])

  return { goals, loading, create, update, remove, refresh }
}

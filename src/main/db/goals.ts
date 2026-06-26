import { getDb } from './database'
import type { Goal, GoalCreate, GoalUpdate } from '../../shared/types'

export function getAllGoals(): Goal[] {
  return getDb().prepare('SELECT * FROM goals ORDER BY created_at DESC').all() as Goal[]
}

export function getGoal(id: number): Goal | undefined {
  return getDb().prepare('SELECT * FROM goals WHERE id = ?').get(id) as Goal | undefined
}

export function createGoal(data: GoalCreate): Goal {
  const result = getDb().prepare(`
    INSERT INTO goals (title, goal_type, target_value, current_value, deadline)
    VALUES (@title, @goal_type, @target_value, @current_value, @deadline)
  `).run(data)
  return getGoal(result.lastInsertRowid as number)!
}

export function updateGoal(data: GoalUpdate): Goal {
  const current = getGoal(data.id)
  if (!current) throw new Error(`Goal ${data.id} not found`)
  const merged = { ...current, ...data }
  getDb().prepare(`
    UPDATE goals SET
      title = @title, goal_type = @goal_type,
      target_value = @target_value, current_value = @current_value,
      deadline = @deadline
    WHERE id = @id
  `).run(merged)
  return getGoal(data.id)!
}

export function deleteGoal(id: number): void {
  getDb().prepare('DELETE FROM goals WHERE id = ?').run(id)
}

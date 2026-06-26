import { ipcMain } from 'electron'
import { getAllGoals, createGoal, updateGoal, deleteGoal } from '../db/goals'
import type { GoalCreate, GoalUpdate } from '../../shared/types'

export function registerGoalHandlers(): void {
  ipcMain.handle('goals:getAll', () => getAllGoals())
  ipcMain.handle('goals:create', (_e, data: GoalCreate) => createGoal(data))
  ipcMain.handle('goals:update', (_e, data: GoalUpdate) => updateGoal(data))
  ipcMain.handle('goals:delete', (_e, id: number) => deleteGoal(id))
}

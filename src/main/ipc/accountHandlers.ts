import { ipcMain, BrowserWindow } from 'electron'
import {
  getAccounts, getActiveAccountId, setActiveAccountId,
  createAccount, renameAccount, deleteAccount
} from '../db/accounts'
import { closeDb } from '../db/database'

export function registerAccountHandlers(): void {
  ipcMain.handle('accounts:getAll',    () => getAccounts())
  ipcMain.handle('accounts:getActive', () => getActiveAccountId())

  ipcMain.handle('accounts:create', (_e, name: string) => createAccount(name))

  ipcMain.handle('accounts:rename', (_e, id: string, name: string) => {
    renameAccount(id, name)
    return getAccounts()
  })

  ipcMain.handle('accounts:delete', (_e, id: string) => {
    deleteAccount(id)
    return getAccounts()
  })

  ipcMain.handle('accounts:switch', (_e, id: string) => {
    closeDb()
    setActiveAccountId(id)
    // Reload the renderer so all React state resets with the new DB
    BrowserWindow.getAllWindows()[0]?.webContents.reload()
  })
}

import { ipcMain } from 'electron'
import { getAuthState, startOAuthFlow, disconnectOAuth, cancelOAuthFlow } from '../services/auth'

export function registerAuthHandlers(): void {
  ipcMain.handle('auth:getState', () => getAuthState())

  ipcMain.handle('auth:connect', async (_e, clientId: string, clientSecret: string) => {
    return startOAuthFlow(clientId, clientSecret)
  })

  ipcMain.handle('auth:cancelConnect', () => cancelOAuthFlow())

  ipcMain.handle('auth:disconnect', () => {
    disconnectOAuth()
    return getAuthState()
  })
}

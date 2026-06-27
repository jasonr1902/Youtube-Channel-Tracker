import { app } from 'electron'
import { join } from 'path'
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'fs'

export interface Account {
  id: string
  name: string
  createdAt: string
}

interface AccountsFile {
  accounts: Account[]
  activeAccountId: string
}

function filePath(): string {
  return join(app.getPath('userData'), 'accounts.json')
}

function read(): AccountsFile {
  const p = filePath()
  if (!existsSync(p)) {
    const defaults: AccountsFile = {
      accounts: [{ id: 'default', name: 'My Channel', createdAt: new Date().toISOString() }],
      activeAccountId: 'default'
    }
    writeFileSync(p, JSON.stringify(defaults, null, 2))
    return defaults
  }
  return JSON.parse(readFileSync(p, 'utf8')) as AccountsFile
}

function write(data: AccountsFile): void {
  writeFileSync(filePath(), JSON.stringify(data, null, 2))
}

export function getAccounts(): Account[] {
  return read().accounts
}

export function getActiveAccountId(): string {
  return read().activeAccountId
}

export function setActiveAccountId(id: string): void {
  const data = read()
  data.activeAccountId = id
  write(data)
}

export function getAccountDbPath(accountId: string): string {
  const userDataPath = app.getPath('userData')
  // Keep legacy path for the default account so existing data is preserved
  if (accountId === 'default') return join(userDataPath, 'tracker.db')
  return join(userDataPath, `tracker-${accountId}.db`)
}

export function createAccount(name: string): Account {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2)
  const account: Account = { id, name: name.trim(), createdAt: new Date().toISOString() }
  const data = read()
  data.accounts.push(account)
  write(data)
  return account
}

export function renameAccount(id: string, name: string): void {
  const data = read()
  data.accounts = data.accounts.map(a => a.id === id ? { ...a, name: name.trim() } : a)
  write(data)
}

export function deleteAccount(id: string): void {
  const data = read()
  if (data.accounts.length <= 1) throw new Error('Cannot delete the last account')
  data.accounts = data.accounts.filter(a => a.id !== id)
  if (data.activeAccountId === id) data.activeAccountId = data.accounts[0].id
  write(data)
  try { unlinkSync(getAccountDbPath(id)) } catch {}
}

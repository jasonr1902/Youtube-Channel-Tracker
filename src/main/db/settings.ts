import { safeStorage } from 'electron'
import { getDb } from './database'

export function getSetting(key: string): string | null {
  const row = getDb().prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined
  return row?.value ?? null
}

export function setSetting(key: string, value: string): void {
  getDb().prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value)
}

export function deleteSetting(key: string): void {
  getDb().prepare('DELETE FROM settings WHERE key = ?').run(key)
}

// Encrypted helpers — uses OS keychain via Electron safeStorage
export function setSecure(key: string, value: string): void {
  if (safeStorage.isEncryptionAvailable()) {
    const enc = safeStorage.encryptString(value).toString('base64')
    setSetting(key, `enc:${enc}`)
  } else {
    setSetting(key, value)
  }
}

export function getSecure(key: string): string | null {
  const raw = getSetting(key)
  if (!raw) return null
  if (raw.startsWith('enc:')) {
    try {
      const buf = Buffer.from(raw.slice(4), 'base64')
      return safeStorage.decryptString(buf)
    } catch {
      return null
    }
  }
  return raw
}

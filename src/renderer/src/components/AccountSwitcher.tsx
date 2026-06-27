import React, { useState, useEffect, useRef } from 'react'
import type { Account } from '../../../shared/types'

export default function AccountSwitcher(): React.ReactElement {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [activeId, setActiveId]  = useState<string>('')
  const [open, setOpen]          = useState(false)
  const [adding, setAdding]      = useState(false)
  const [newName, setNewName]    = useState('')
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameVal, setRenameVal]   = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const addRef = useRef<HTMLInputElement>(null)
  const renameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    Promise.all([window.api.accounts.getAll(), window.api.accounts.getActive()])
      .then(([all, id]) => { setAccounts(all); setActiveId(id) })
  }, [])

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  useEffect(() => { if (adding) addRef.current?.focus() }, [adding])
  useEffect(() => { if (renamingId) renameRef.current?.select() }, [renamingId])

  const active = accounts.find(a => a.id === activeId)

  const handleSwitch = async (id: string) => {
    if (id === activeId) { setOpen(false); return }
    setOpen(false)
    await window.api.accounts.switch(id)
    // renderer reloads via main process
  }

  const handleAdd = async () => {
    const name = newName.trim()
    if (!name) { setAdding(false); return }
    const account = await window.api.accounts.create(name)
    setAccounts(prev => [...prev, account])
    setNewName('')
    setAdding(false)
    // Switch to the new account
    await window.api.accounts.switch(account.id)
  }

  const handleRename = async (id: string) => {
    const name = renameVal.trim()
    if (name) {
      const updated = await window.api.accounts.rename(id, name)
      setAccounts(updated)
    }
    setRenamingId(null)
  }

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete "${name}"?\n\nAll data for this account will be permanently deleted.`)) return
    const updated = await window.api.accounts.delete(id)
    setAccounts(updated)
    if (id === activeId) {
      // main process already switched; renderer reloads
      await window.api.accounts.switch(updated[0].id)
    }
  }

  return (
    <div ref={ref} className="relative px-4 pb-3">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between gap-1 text-left group"
      >
        <span className="text-xs text-yt-muted truncate group-hover:text-yt-text transition-colors">
          {active?.name ?? '…'}
        </span>
        <span className={`text-yt-muted text-xs transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>

      {open && (
        <div className="absolute left-2 right-2 top-full mt-1 bg-yt-elevated border border-yt-border rounded-xl shadow-xl z-50 py-1 overflow-hidden">
          {accounts.map(account => (
            <div
              key={account.id}
              className="group/row flex items-center gap-2 px-3 py-2 hover:bg-yt-surface transition-colors"
            >
              {renamingId === account.id ? (
                <input
                  ref={renameRef}
                  value={renameVal}
                  onChange={e => setRenameVal(e.target.value)}
                  onBlur={() => handleRename(account.id)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleRename(account.id)
                    if (e.key === 'Escape') setRenamingId(null)
                  }}
                  className="flex-1 bg-transparent text-sm text-yt-text border-b border-yt-red focus:outline-none"
                  onClick={e => e.stopPropagation()}
                />
              ) : (
                <button
                  onClick={() => handleSwitch(account.id)}
                  className="flex-1 text-left text-sm text-yt-text flex items-center gap-2"
                >
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${account.id === activeId ? 'bg-yt-red' : 'bg-transparent'}`} />
                  <span className={account.id === activeId ? 'font-medium' : ''}>{account.name}</span>
                </button>
              )}

              {renamingId !== account.id && (
                <div className="flex items-center gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
                  <button
                    onClick={e => { e.stopPropagation(); setRenamingId(account.id); setRenameVal(account.name) }}
                    className="text-yt-muted hover:text-yt-text text-xs p-0.5"
                    title="Rename"
                  >✎</button>
                  {accounts.length > 1 && (
                    <button
                      onClick={e => { e.stopPropagation(); handleDelete(account.id, account.name) }}
                      className="text-yt-muted hover:text-red-400 text-xs p-0.5"
                      title="Delete account"
                    >✕</button>
                  )}
                </div>
              )}
            </div>
          ))}

          <div className="border-t border-yt-border mt-1 pt-1">
            {adding ? (
              <div className="flex items-center gap-2 px-3 py-2">
                <span className="text-yt-muted text-sm">+</span>
                <input
                  ref={addRef}
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleAdd()
                    if (e.key === 'Escape') { setAdding(false); setNewName('') }
                  }}
                  onBlur={() => { if (!newName.trim()) setAdding(false) }}
                  placeholder="Account name…"
                  className="flex-1 bg-transparent text-sm text-yt-text border-b border-yt-red focus:outline-none placeholder-yt-muted/50"
                />
              </div>
            ) : (
              <button
                onClick={() => setAdding(true)}
                className="w-full text-left px-3 py-2 text-sm text-yt-muted hover:text-yt-text hover:bg-yt-surface transition-colors flex items-center gap-2"
              >
                <span>+</span> Add account
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

import React, { useState, useEffect } from 'react'

type UpdateState =
  | { phase: 'idle' }
  | { phase: 'downloading'; version: string; pct: number }
  | { phase: 'ready'; version: string }
  | { phase: 'installing'; version: string }
  | { phase: 'error'; message: string }

export default function UpdateBanner(): React.ReactElement | null {
  const [state, setState] = useState<UpdateState>({ phase: 'idle' })

  useEffect(() => {
    const offAvailable = window.api.update.onAvailable(({ version }) =>
      setState({ phase: 'downloading', version, pct: 0 })
    )
    const offProgress = window.api.update.onProgress(pct =>
      setState(prev => prev.phase === 'downloading' ? { ...prev, pct } : prev)
    )
    const offDownloaded = window.api.update.onDownloaded(({ version }) =>
      setState({ phase: 'ready', version })
    )
    const offError = window.api.update.onError(message =>
      setState({ phase: 'error', message })
    )
    return () => { offAvailable(); offProgress(); offDownloaded(); offError() }
  }, [])

  if (state.phase === 'idle') return null

  const handleInstall = async () => {
    if (state.phase !== 'ready') return
    setState({ phase: 'installing', version: state.version })
    await window.api.update.install()
  }

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-yt-elevated border-b border-yt-border text-sm flex-shrink-0"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
      {state.phase === 'downloading' && (
        <>
          <span className="text-yt-muted">Downloading update v{state.version}…</span>
          <div className="w-32 h-1.5 bg-yt-border rounded-full overflow-hidden">
            <div className="h-full bg-yt-red transition-all duration-300" style={{ width: `${state.pct}%` }} />
          </div>
        </>
      )}
      {state.phase === 'ready' && (
        <>
          <span className="text-yt-text">Update v{state.version} ready to install</span>
          <button
            onClick={handleInstall}
            className="bg-yt-red hover:bg-red-600 text-white text-xs px-3 py-1 rounded transition-colors"
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          >
            Restart &amp; Install
          </button>
        </>
      )}
      {state.phase === 'installing' && (
        <span className="text-yt-muted">Restarting to install v{state.version}…</span>
      )}
      {state.phase === 'error' && (
        <>
          <span className="text-red-400 text-xs truncate">Update error: {state.message}</span>
          <button
            onClick={() => setState({ phase: 'idle' })}
            className="text-yt-muted hover:text-yt-text ml-4 flex-shrink-0"
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          >✕</button>
        </>
      )}
    </div>
  )
}

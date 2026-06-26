import React, { useState, useEffect } from 'react'

type UpdateState =
  | { phase: 'idle' }
  | { phase: 'downloading'; version: string; pct: number }
  | { phase: 'ready'; version: string }

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
    return () => { offAvailable(); offProgress(); offDownloaded() }
  }, [])

  if (state.phase === 'idle') return null

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-yt-elevated border-b border-yt-border text-sm">
      {state.phase === 'downloading' ? (
        <>
          <span className="text-yt-muted">
            Downloading update v{state.version}…
          </span>
          <div className="w-32 h-1.5 bg-yt-border rounded-full overflow-hidden">
            <div
              className="h-full bg-yt-red transition-all duration-300"
              style={{ width: `${state.pct}%` }}
            />
          </div>
        </>
      ) : (
        <>
          <span className="text-yt-text">
            Update v{state.version} is ready
          </span>
          <button
            onClick={() => window.api.update.install()}
            className="bg-yt-red hover:bg-red-600 text-white text-xs px-3 py-1 rounded transition-colors"
          >
            Restart &amp; Install
          </button>
        </>
      )}
    </div>
  )
}

import React, { useState, useEffect } from 'react'
import type { AuthState } from '../../../shared/types'

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-yt-elevated border border-yt-border flex items-center justify-center text-xs font-bold text-yt-muted">
        {n}
      </div>
      <div className="flex-1 pb-6">
        <p className="text-sm font-medium text-yt-text mb-1">{title}</p>
        <div className="text-sm text-yt-muted leading-relaxed">{children}</div>
      </div>
    </div>
  )
}

export default function SettingsPage(): React.ReactElement {
  const [auth, setAuth] = useState<AuthState | null>(null)
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showGuide, setShowGuide] = useState(false)

  useEffect(() => {
    window.api.auth.getState().then(setAuth)
    window.api.youtube.getClientId().then(setClientId)
  }, [])

  const handleConnect = async () => {
    if (!clientId.trim() || !clientSecret.trim()) {
      setError('Both Client ID and Client Secret are required.')
      return
    }
    setError(null)
    setConnecting(true)
    try {
      const state = await window.api.auth.connect(clientId.trim(), clientSecret.trim())
      setAuth(state)
    } catch (e: any) {
      if (e.message !== 'cancelled') {
        setError(e.message ?? 'Connection failed')
      }
    } finally {
      setConnecting(false)
    }
  }

  const handleCancel = async () => {
    await window.api.auth.cancelConnect()
  }

  const handleDisconnect = async () => {
    if (!window.confirm('Disconnect your YouTube account? Cached analytics will be preserved.')) return
    const state = await window.api.auth.disconnect()
    setAuth(state)
    setClientId('')
    setClientSecret('')
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto px-6 pt-6 pb-12">
        <h1 className="text-2xl font-bold text-yt-text mb-1">Settings</h1>
        <p className="text-yt-muted text-sm mb-8">Connect your YouTube channel to enable sync and analytics.</p>

        {/* Connection status card */}
        {auth?.connected ? (
          <div className="bg-yt-surface border border-green-800/50 rounded-xl p-5 mb-8">
            <div className="flex items-center gap-4">
              {auth.channelThumb && (
                <img src={auth.channelThumb} alt="" className="w-12 h-12 rounded-full" />
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
                  <span className="text-sm font-semibold text-yt-text">Connected</span>
                </div>
                <p className="text-sm text-yt-text mt-0.5">{auth.channelName}</p>
                {auth.lastSyncAt && (
                  <p className="text-xs text-yt-muted mt-0.5">
                    Last sync: {new Date(auth.lastSyncAt).toLocaleString()}
                  </p>
                )}
              </div>
              <button onClick={handleDisconnect}
                className="text-xs text-yt-muted border border-yt-border hover:border-yt-red/40 hover:text-yt-red px-3 py-1.5 rounded-lg transition-colors">
                Disconnect
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-yt-surface border border-yt-border rounded-xl p-5 mb-8">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-yt-muted flex-shrink-0" />
              <span className="text-sm font-semibold text-yt-text">Not connected</span>
            </div>
            <p className="text-xs text-yt-muted">Connect your YouTube account to sync videos and view analytics.</p>
          </div>
        )}

        {/* Credentials form */}
        <div className="bg-yt-surface border border-yt-border rounded-xl p-5 mb-6">
          <h2 className="text-sm font-semibold text-yt-text mb-4">Google OAuth Credentials</h2>

          <div className="space-y-3 mb-4">
            <div>
              <label className="block text-xs text-yt-muted mb-1">Client ID</label>
              <input value={clientId} onChange={e => setClientId(e.target.value)}
                placeholder="xxxxxxxxxxxxxxxx.apps.googleusercontent.com"
                className="w-full bg-yt-elevated border border-yt-border rounded-lg px-3 py-2 text-sm text-yt-text placeholder-yt-muted focus:outline-none focus:border-yt-red font-mono" />
            </div>
            <div>
              <label className="block text-xs text-yt-muted mb-1">Client Secret</label>
              <input type="password" value={clientSecret} onChange={e => setClientSecret(e.target.value)}
                placeholder="GOCSPX-…"
                className="w-full bg-yt-elevated border border-yt-border rounded-lg px-3 py-2 text-sm text-yt-text placeholder-yt-muted focus:outline-none focus:border-yt-red font-mono" />
            </div>
          </div>

          {error && (
            <div className="mb-4 px-3 py-2 bg-red-900/30 border border-red-700/40 rounded-lg text-xs text-red-300">
              {error}
            </div>
          )}

          {connecting && (
            <div className="mb-4 px-3 py-2 bg-yt-elevated rounded-lg text-xs text-yt-muted flex items-center justify-between">
              <span>Waiting for browser authorization… complete the sign-in in your browser.</span>
              <button
                type="button"
                onClick={handleCancel}
                className="ml-4 flex-shrink-0 text-yt-red hover:text-red-400 font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          )}

          <button onClick={handleConnect} disabled={connecting || !clientId || !clientSecret}
            className="w-full py-2.5 bg-yt-red hover:bg-red-600 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors">
            {connecting ? 'Waiting for authorization…' : auth?.connected ? 'Re-connect YouTube' : 'Connect YouTube Account'}
          </button>
        </div>

        {/* Video sync */}
        {auth?.connected && (
          <div className="bg-yt-surface border border-yt-border rounded-xl p-5 mb-6">
            <h2 className="text-sm font-semibold text-yt-text mb-1">Sync YouTube Videos</h2>
            <p className="text-xs text-yt-muted mb-4">
              Pull your published videos into the Pipeline. New videos get a Published card; existing videos get matched by title.
            </p>
            {syncResult && (
              <div className="mb-3 px-3 py-2 bg-yt-elevated rounded-lg text-xs text-yt-muted">{syncResult}</div>
            )}
            <button onClick={async () => {
              setSyncing(true); setSyncResult(null)
              try {
                const r = await window.api.youtube.syncVideos()
                setSyncResult(`Done — ${r.created} new card${r.created !== 1 ? 's' : ''} created, ${r.matched} matched, ${r.total} total videos.`)
                setAuth(await window.api.auth.getState())
              } catch (e: any) { setSyncResult(`Error: ${e.message}`) }
              finally { setSyncing(false) }
            }} disabled={syncing}
              className="w-full py-2.5 bg-yt-elevated hover:bg-yt-border disabled:opacity-40 text-yt-text text-sm font-medium rounded-lg transition-colors border border-yt-border">
              {syncing ? '⟳ Syncing videos…' : '⟳ Sync Videos from YouTube'}
            </button>
          </div>
        )}

        {/* Setup guide */}
        <div className="bg-yt-surface border border-yt-border rounded-xl overflow-hidden">
          <button onClick={() => setShowGuide(v => !v)}
            className="w-full flex items-center justify-between px-5 py-4 text-sm font-semibold text-yt-text hover:bg-yt-elevated/40 transition-colors">
            <span>How to get OAuth credentials</span>
            <span className="text-yt-muted">{showGuide ? '▾' : '▸'}</span>
          </button>

          {showGuide && (
            <div className="px-5 pb-5 border-t border-yt-border pt-4">
              <Step n={1} title="Create a Google Cloud project">
                Go to <span className="text-yt-red font-mono text-xs">console.cloud.google.com</span> → New Project.
                Name it anything (e.g. "YT Tracker").
              </Step>
              <Step n={2} title="Enable the YouTube APIs">
                In the project: <strong>APIs &amp; Services → Enable APIs</strong>.
                Search and enable both <em>YouTube Data API v3</em> and <em>YouTube Analytics API</em>.
              </Step>
              <Step n={3} title="Configure the OAuth consent screen">
                Go to <strong>APIs &amp; Services → OAuth consent screen</strong>.
                Choose <em>External</em>, fill in the App name and your email.
                Add these scopes: <span className="text-xs font-mono text-yt-muted">youtube.readonly</span>, <span className="text-xs font-mono text-yt-muted">yt-analytics.readonly</span>, and <span className="text-xs font-mono text-yt-muted">youtube.upload</span>.
                Then scroll to <strong>Test users</strong> and click <em>+ ADD USERS</em> — add the Google
                account email you'll sign in with. <strong>You must do this even for your own account</strong>,
                otherwise Google will block the login with an "access blocked" error.
              </Step>
              <Step n={4} title="Create OAuth 2.0 credentials">
                Go to <strong>Credentials → Create Credentials → OAuth client ID</strong>.
                Choose <em>Desktop app</em>. Copy the Client ID and Client Secret into the fields above.
                No redirect URI setup is needed — Google automatically allows loopback addresses
                (<span className="font-mono text-xs text-yt-muted">127.0.0.1</span>) for Desktop app credentials.
              </Step>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

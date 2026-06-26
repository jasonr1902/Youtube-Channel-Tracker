import { shell } from 'electron'
import { createServer, IncomingMessage, ServerResponse } from 'http'
import { google } from 'googleapis'
import { getSetting, setSetting, setSecure, getSecure, deleteSetting } from '../db/settings'

const SCOPES = [
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/yt-analytics.readonly',
  'https://www.googleapis.com/auth/youtube.upload'
]

export interface AuthState {
  connected: boolean
  channelId: string | null
  channelName: string | null
  channelThumb: string | null
  lastSyncAt: string | null
}

export function getAuthState(): AuthState {
  const channelId = getSetting('youtube_channel_id')
  return {
    connected: !!getSecure('oauth_refresh_token'),
    channelId,
    channelName: getSetting('youtube_channel_name'),
    channelThumb: getSetting('youtube_channel_thumb'),
    lastSyncAt: getSetting('last_sync_at')
  }
}

export function getOAuth2Client(clientId?: string, clientSecret?: string) {
  const id = clientId ?? getSetting('oauth_client_id') ?? ''
  const secret = clientSecret ?? getSetting('oauth_client_secret') ?? ''
  const client = new google.auth.OAuth2(id, secret, 'http://127.0.0.1:4242')

  const accessToken = getSecure('oauth_access_token')
  const refreshToken = getSecure('oauth_refresh_token')
  const expiry = getSetting('oauth_token_expiry')

  if (refreshToken) {
    client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
      expiry_date: expiry ? Number(expiry) : undefined
    })
    // Persist new tokens whenever they are refreshed
    client.on('tokens', (tokens) => {
      if (tokens.access_token) setSecure('oauth_access_token', tokens.access_token)
      if (tokens.refresh_token) setSecure('oauth_refresh_token', tokens.refresh_token)
      if (tokens.expiry_date) setSetting('oauth_token_expiry', String(tokens.expiry_date))
    })
  }
  return client
}

export async function startOAuthFlow(clientId: string, clientSecret: string): Promise<AuthState> {
  // Save credentials first
  setSetting('oauth_client_id', clientId)
  setSetting('oauth_client_secret', clientSecret)

  const client = new google.auth.OAuth2(clientId, clientSecret, 'http://127.0.0.1:4242')

  const authUrl = client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES
  })

  const code = await openBrowserAndWaitForCode(authUrl)
  const { tokens } = await client.getToken(code)

  if (!tokens.refresh_token) throw new Error('No refresh token received. Try revoking app access and reconnecting.')

  setSecure('oauth_access_token', tokens.access_token ?? '')
  setSecure('oauth_refresh_token', tokens.refresh_token)
  if (tokens.expiry_date) setSetting('oauth_token_expiry', String(tokens.expiry_date))

  client.setCredentials(tokens)

  // Fetch channel info immediately
  const youtube = google.youtube({ version: 'v3', auth: client })
  const res = await youtube.channels.list({ part: ['snippet', 'statistics'], mine: true })
  const channel = res.data.items?.[0]
  if (channel) {
    setSetting('youtube_channel_id', channel.id ?? '')
    setSetting('youtube_channel_name', channel.snippet?.title ?? '')
    setSetting('youtube_channel_thumb', channel.snippet?.thumbnails?.default?.url ?? '')
  }

  return getAuthState()
}

export function disconnectOAuth(): void {
  deleteSetting('oauth_access_token')
  deleteSetting('oauth_refresh_token')
  deleteSetting('oauth_token_expiry')
  deleteSetting('youtube_channel_id')
  deleteSetting('youtube_channel_name')
  deleteSetting('youtube_channel_thumb')
  deleteSetting('last_sync_at')
}

let _cancelOAuth: (() => void) | null = null

export function cancelOAuthFlow(): void {
  if (_cancelOAuth) {
    _cancelOAuth()
    _cancelOAuth = null
  }
}

function openBrowserAndWaitForCode(authUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      server.close()
      reject(new Error('OAuth timed out — check that the browser completed sign-in and retry.'))
    }, 2 * 60 * 1000)

    _cancelOAuth = () => {
      clearTimeout(timeout)
      server.close()
      reject(new Error('cancelled'))
    }

    const server = createServer((req: IncomingMessage, res: ServerResponse) => {
      const url = new URL(req.url ?? '/', 'http://127.0.0.1:4242')
      const code = url.searchParams.get('code')
      const error = url.searchParams.get('error')

      const html = (msg: string, ok: boolean) =>
        `<html><head><style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#0f0f0f;color:${ok ? '#aaa' : '#f55'}}h2{font-size:1.1rem}</style></head><body><h2>${msg}</h2></body></html>`

      if (error) {
        res.writeHead(200, { 'Content-Type': 'text/html' })
        res.end(html(`Authorization failed: ${error}`, false))
        clearTimeout(timeout)
        server.close()
        reject(new Error(error))
        return
      }

      if (code) {
        res.writeHead(200, { 'Content-Type': 'text/html' })
        res.end(html('✓ YouTube connected! You can close this tab.', true))
        clearTimeout(timeout)
        _cancelOAuth = null
        server.close()
        resolve(code)
      }
    })

    server.listen(4242, '127.0.0.1', () => {
      shell.openExternal(authUrl)
    })

    server.on('error', (err) => {
      clearTimeout(timeout)
      _cancelOAuth = null
      reject(err)
    })
  })
}

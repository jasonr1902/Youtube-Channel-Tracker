import React, { useState, useEffect, useCallback } from 'react'

function xpToNextLevel(level: number): number {
  return Math.round(100 * Math.pow(level + 1, 1.8))
}

export default function GlobalProgressBar(): React.ReactElement {
  const [profile, setProfile] = useState({ current_xp: 0, current_level: 0, total_xp_earned: 0 })

  const load = useCallback(async () => {
    const prof = await window.api.profile.get()
    setProfile(prof)
  }, [])

  useEffect(() => {
    load()
    const handler = () => load()
    window.addEventListener('gamification:updated', handler)
    return () => window.removeEventListener('gamification:updated', handler)
  }, [load])

  const xpNeeded = xpToNextLevel(profile.current_level)
  const xpPct = Math.min(100, Math.round((profile.current_xp / xpNeeded) * 100))

  return (
    <div className="border-t border-yt-border bg-yt-surface px-3 py-2">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs text-yt-muted shrink-0 font-medium">Lv.{profile.current_level}</span>
        <div className="flex-1 h-1.5 bg-yt-elevated rounded-full overflow-hidden">
          <div
            className="h-full bg-yt-red rounded-full transition-all duration-700"
            style={{ width: `${xpPct}%` }}
          />
        </div>
      </div>
      <p className="text-xs text-yt-muted/50 text-right tabular-nums">
        {profile.current_xp} / {xpNeeded} XP
      </p>
    </div>
  )
}

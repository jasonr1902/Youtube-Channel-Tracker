import React from 'react'
import type { Page } from '../App'

interface SidebarProps {
  currentPage: Page
  onNavigate: (page: Page) => void
}

const mainNav: { id: Page; label: string; icon: string }[] = [
  { id: 'thisweek',  label: 'This Week',   icon: '📋' },
  { id: 'ideas',     label: 'Idea Vault',  icon: '💡' },
  { id: 'pipeline',  label: 'Pipeline',    icon: '🎬' },
  { id: 'series',    label: 'Series',      icon: '📚' },
  { id: 'calendar',  label: 'Calendar',    icon: '📅' },
  { id: 'goals',     label: 'Goals',       icon: '🎯' },
  { id: 'queue',     label: 'Publish Queue', icon: '📤' }
]

const bottomNav: { id: Page; label: string; icon: string }[] = [
  { id: 'analytics', label: 'Analytics',  icon: '📊' },
  { id: 'settings',  label: 'Settings',   icon: '⚙️' }
]

function NavButton({ item, active, onClick }: { item: { id: Page; label: string; icon: string }; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
        active
          ? 'bg-yt-elevated text-yt-text font-medium'
          : 'text-yt-muted hover:bg-yt-elevated/60 hover:text-yt-text'
      }`}
    >
      <span className="text-base">{item.icon}</span>
      <span>{item.label}</span>
      {active && <span className="ml-auto w-1 h-4 bg-yt-red rounded-full" />}
    </button>
  )
}

export default function Sidebar({ currentPage, onNavigate }: SidebarProps): React.ReactElement {
  return (
    <aside className="w-56 bg-yt-surface border-r border-yt-border flex flex-col flex-shrink-0">
      <div className="px-4 pt-10 pb-5">
        <div className="flex items-center gap-2">
          <span className="text-yt-red text-lg font-bold">▶</span>
          <div>
            <div className="font-semibold text-sm text-yt-text leading-none">YT Tracker</div>
            <div className="text-xs text-yt-muted mt-0.5">Channel Dashboard</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-2 space-y-0.5">
        {mainNav.map(item => (
          <NavButton key={item.id} item={item} active={currentPage === item.id} onClick={() => onNavigate(item.id)} />
        ))}
      </nav>

      <div className="px-2 pb-2 space-y-0.5 border-t border-yt-border pt-2">
        {bottomNav.map(item => (
          <NavButton key={item.id} item={item} active={currentPage === item.id} onClick={() => onNavigate(item.id)} />
        ))}
      </div>

      <div className="px-4 py-3 border-t border-yt-border">
        <p className="text-xs text-yt-muted/40">⌘N — new item</p>
      </div>
    </aside>
  )
}

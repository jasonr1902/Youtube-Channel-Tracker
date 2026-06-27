import React, { useState, useEffect, useCallback } from 'react'
import Sidebar from './components/Sidebar'
import UpdateBanner from './components/UpdateBanner'
import GlobalProgressBar from './components/GlobalProgressBar'
import IdeaVault from './pages/IdeaVault'
import Pipeline from './pages/Pipeline'
import SeriesTracker from './pages/SeriesTracker'
import CalendarPage from './pages/Calendar'
import GoalsPage from './pages/Goals'
import ThisWeek from './pages/ThisWeek'
import AnalyticsPage from './pages/Analytics'
import SettingsPage from './pages/Settings'
import PublishQueuePage from './pages/PublishQueue'
import ProfilePage from './pages/Profile'
import ProductionAnalyticsPage from './pages/ProductionAnalytics'

export type Page = 'thisweek' | 'ideas' | 'pipeline' | 'series' | 'calendar' | 'goals' | 'analytics' | 'production' | 'queue' | 'settings' | 'profile'

export default function App(): React.ReactElement {
  const [currentPage, setCurrentPage] = useState<Page>('thisweek')
  const [triggerNew, setTriggerNew] = useState(0)

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
      e.preventDefault()
      setTriggerNew(n => n + 1)
    }
  }, [])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return (
    <div className="flex flex-col h-full bg-yt-dark text-yt-text">
      <UpdateBanner />
      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-col w-56 flex-shrink-0">
          <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
          <GlobalProgressBar />
        </div>
        <main className="flex-1 overflow-hidden">
          {currentPage === 'thisweek'  && <ThisWeek />}
          {currentPage === 'ideas'     && <IdeaVault triggerNew={triggerNew} />}
          {currentPage === 'pipeline'  && <Pipeline triggerNew={triggerNew} />}
          {currentPage === 'series'    && <SeriesTracker triggerNew={triggerNew} />}
          {currentPage === 'calendar'  && <CalendarPage triggerNew={triggerNew} />}
          {currentPage === 'goals'     && <GoalsPage triggerNew={triggerNew} />}
          {currentPage === 'analytics'   && <AnalyticsPage />}
          {currentPage === 'production'  && <ProductionAnalyticsPage />}
          {currentPage === 'queue'     && <PublishQueuePage />}
          {currentPage === 'settings'  && <SettingsPage />}
          {currentPage === 'profile'   && <ProfilePage />}
        </main>
      </div>
    </div>
  )
}

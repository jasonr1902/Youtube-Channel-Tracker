import { ipcMain, dialog, shell } from 'electron'
import { writeFileSync } from 'fs'
import { getAllQueueItems, addToQueue, removeQueueItem, executeUpload, getStageHistory } from '../services/upload'
import { getDb } from '../db/database'
import type { QueueItemCreate } from '../../shared/types'

export function registerUploadHandlers(): void {
  ipcMain.handle('youtube:getQueue', () => getAllQueueItems())

  ipcMain.handle('youtube:addToQueue', (_e, data: QueueItemCreate) => addToQueue(data))

  ipcMain.handle('youtube:removeFromQueue', (_e, id: number) => removeQueueItem(id))

  ipcMain.handle('youtube:startUpload', (_e, queueItemId: number) => {
    executeUpload(queueItemId).catch(console.error)
    return { started: true }
  })

  ipcMain.handle('videos:getStageHistory', (_e, videoId: number) => getStageHistory(videoId))

  ipcMain.handle('dialog:openFile', async (_e, options: Electron.OpenDialogOptions) => {
    return dialog.showOpenDialog(options)
  })

  ipcMain.handle('dialog:openFolder', async () => {
    return dialog.showOpenDialog({ properties: ['openDirectory'] })
  })

  ipcMain.handle('dialog:saveFile', async (_e, options: Electron.SaveDialogOptions) => {
    return dialog.showSaveDialog(options)
  })

  ipcMain.handle('shell:openPath', (_e, path: string) => shell.openPath(path))

  ipcMain.handle('export:channelReport', async () => {
    const result = await dialog.showSaveDialog({
      title: 'Export Channel Report',
      defaultPath: `yt-channel-report-${new Date().toISOString().slice(0, 10)}.csv`,
      filters: [{ name: 'CSV', extensions: ['csv'] }]
    })
    if (result.canceled || !result.filePath) return { saved: false }

    const db = getDb()
    const rows = db.prepare(`
      SELECT v.id, v.title, v.stage, v.priority, v.tags, v.scheduled_date,
             v.youtube_video_id, v.created_at, v.updated_at,
             COALESCE(s.views, 0)        AS views,
             COALESCE(s.likes, 0)        AS likes,
             COALESCE(s.comments, 0)     AS comments,
             COALESCE(s.watch_minutes, 0) AS watch_minutes
      FROM videos v
      LEFT JOIN youtube_video_stats s ON s.youtube_video_id = v.youtube_video_id
      ORDER BY v.updated_at DESC
    `).all() as Record<string, unknown>[]

    const escape = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`

    const headers = ['Title','Stage','Priority','Tags','Scheduled Date','YouTube ID','Views','Likes','Comments','Watch Minutes (total)','Created','Updated']
    const lines = [headers.join(',')]
    for (const r of rows) {
      lines.push([
        escape(r.title), r.stage, r.priority,
        escape(r.tags), r.scheduled_date ?? '',
        r.youtube_video_id ?? '',
        r.views, r.likes, r.comments, r.watch_minutes,
        r.created_at, r.updated_at
      ].join(','))
    }

    writeFileSync(result.filePath as string, lines.join('\n'), 'utf8')
    return { saved: true, path: result.filePath }
  })
}

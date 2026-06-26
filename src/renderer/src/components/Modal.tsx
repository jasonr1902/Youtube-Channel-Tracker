import React, { useEffect } from 'react'

interface ModalProps {
  title: string
  onClose: () => void
  children: React.ReactNode
  wide?: boolean
}

export default function Modal({ title, onClose, children, wide }: ModalProps): React.ReactElement {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className={`bg-yt-surface border border-yt-border rounded-xl w-full shadow-2xl ${wide ? 'max-w-2xl' : 'max-w-lg'}`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-yt-border">
          <h2 className="font-semibold text-yt-text">{title}</h2>
          <button
            onClick={onClose}
            className="text-yt-muted hover:text-yt-text text-xl leading-none"
          >
            ×
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

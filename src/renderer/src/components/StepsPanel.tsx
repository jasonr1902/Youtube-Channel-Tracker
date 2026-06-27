import React, { useState, useEffect, useRef, useCallback } from 'react'
import confetti from 'canvas-confetti'
import type { Step, Substep, XPResult } from '../../../shared/types'

function xpToNextLevel(level: number): number {
  return Math.round(100 * Math.pow(level + 1, 1.8))
}

function XPBurst({ amount, onDone }: { amount: number; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1200)
    return () => clearTimeout(t)
  }, [onDone])
  return (
    <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-yellow-400 text-xs font-bold animate-bounce pointer-events-none select-none">
      +{amount} XP
    </span>
  )
}

function LevelUpToast({ level, onDone }: { level: number; onDone: () => void }) {
  useEffect(() => {
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } })
    const t = setTimeout(onDone, 3000)
    return () => clearTimeout(t)
  }, [onDone])
  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-yellow-400 text-black font-bold px-6 py-3 rounded-xl shadow-xl text-base animate-bounce">
      Level up! You reached level {level}!
    </div>
  )
}

interface SubstepRowProps {
  sub: Substep
  onToggle: (id: number, done: boolean) => void
  onDelete: (id: number) => void
  onRename: (id: number, title: string) => void
}

function SubstepRow({ sub, onToggle, onDelete, onRename }: SubstepRowProps) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(sub.title)
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => { if (editing) ref.current?.select() }, [editing])

  const commit = async () => {
    setEditing(false)
    if (val.trim() && val.trim() !== sub.title) await onRename(sub.id, val.trim())
    else setVal(sub.title)
  }

  return (
    <div className="flex items-center gap-2 pl-6 group/sub">
      <input
        type="checkbox"
        checked={!!sub.completed_at}
        onChange={e => onToggle(sub.id, e.target.checked)}
        className="w-3.5 h-3.5 accent-yt-red flex-shrink-0"
      />
      {editing ? (
        <input
          ref={ref}
          value={val}
          onChange={e => setVal(e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setEditing(false); setVal(sub.title) } }}
          className="flex-1 bg-transparent text-xs text-yt-text border-b border-yt-red focus:outline-none"
        />
      ) : (
        <span
          onDoubleClick={() => setEditing(true)}
          className={`flex-1 text-xs cursor-text ${sub.completed_at ? 'line-through text-yt-muted' : 'text-yt-text'}`}
        >
          {sub.title}
        </span>
      )}
      <button
        onClick={() => onDelete(sub.id)}
        className="opacity-0 group-hover/sub:opacity-100 text-yt-muted hover:text-red-400 transition-opacity text-xs px-1"
      >✕</button>
    </div>
  )
}

interface StepRowProps {
  step: Step
  onToggleStep: (id: number, done: boolean) => void
  onDeleteStep: (id: number) => void
  onRenameStep: (id: number, title: string) => void
  onAddSubstep: (stepId: number, title: string) => void
  onToggleSub: (id: number, done: boolean) => void
  onDeleteSub: (id: number) => void
  onRenameSub: (id: number, title: string) => void
  xpBurstId: number | null
}

function StepRow({ step, onToggleStep, onDeleteStep, onRenameStep, onAddSubstep, onToggleSub, onDeleteSub, onRenameSub, xpBurstId }: StepRowProps) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(step.title)
  const [subInput, setSubInput] = useState('')
  const [showSubInput, setShowSubInput] = useState(false)
  const ref = useRef<HTMLInputElement>(null)
  const subRef = useRef<HTMLInputElement>(null)
  const [showBurst, setShowBurst] = useState(false)
  const hasSubs = step.substeps.length > 0
  const canCheck = !hasSubs
  const isDone = !!step.completed_at

  useEffect(() => { if (editing) ref.current?.select() }, [editing])
  useEffect(() => { if (showSubInput) subRef.current?.focus() }, [showSubInput])
  useEffect(() => { if (xpBurstId === step.id) setShowBurst(true) }, [xpBurstId, step.id])

  const commitRename = async () => {
    setEditing(false)
    if (val.trim() && val.trim() !== step.title) await onRenameStep(step.id, val.trim())
    else setVal(step.title)
  }

  const submitSub = async () => {
    const t = subInput.trim()
    if (!t) { setShowSubInput(false); return }
    await onAddSubstep(step.id, t)
    setSubInput('')
    setOpen(true)
  }

  return (
    <div className="relative">
      {showBurst && <XPBurst amount={50} onDone={() => setShowBurst(false)} />}
      <div className="flex items-center gap-2 group/step py-1">
        {hasSubs ? (
          <button
            onClick={() => setOpen(v => !v)}
            className="w-3.5 h-3.5 flex-shrink-0 text-yt-muted text-xs flex items-center justify-center"
          >
            <span className={`transition-transform inline-block ${open ? 'rotate-90' : ''}`}>▶</span>
          </button>
        ) : (
          <input
            type="checkbox"
            checked={isDone}
            onChange={e => canCheck && onToggleStep(step.id, e.target.checked)}
            disabled={!canCheck && !isDone}
            className="w-3.5 h-3.5 accent-yt-red flex-shrink-0"
          />
        )}

        {editing ? (
          <input
            ref={ref}
            value={val}
            onChange={e => setVal(e.target.value)}
            onBlur={commitRename}
            onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') { setEditing(false); setVal(step.title) } }}
            className="flex-1 bg-transparent text-sm text-yt-text border-b border-yt-red focus:outline-none"
          />
        ) : (
          <span
            onDoubleClick={() => setEditing(true)}
            className={`flex-1 text-sm cursor-text ${isDone ? 'line-through text-yt-muted' : 'text-yt-text'}`}
          >
            {step.title}
            {hasSubs && (
              <span className="ml-1.5 text-xs text-yt-muted">
                ({step.substeps.filter(s => s.completed_at).length}/{step.substeps.length})
              </span>
            )}
          </span>
        )}

        <div className="flex items-center gap-1 opacity-0 group-hover/step:opacity-100 transition-opacity">
          <button
            onClick={() => { setShowSubInput(v => !v); setOpen(true) }}
            className="text-yt-muted hover:text-yt-text text-xs px-1"
            title="Add substep"
          >+</button>
          <button
            onClick={() => onDeleteStep(step.id)}
            className="text-yt-muted hover:text-red-400 text-xs px-1"
          >✕</button>
        </div>
      </div>

      {(open || showSubInput) && (
        <div className="ml-0 space-y-0.5">
          {open && step.substeps.map(sub => (
            <SubstepRow
              key={sub.id}
              sub={sub}
              onToggle={onToggleSub}
              onDelete={onDeleteSub}
              onRename={onRenameSub}
            />
          ))}
          {showSubInput && (
            <div className="flex items-center gap-2 pl-6">
              <span className="w-3.5 text-yt-muted text-xs">–</span>
              <input
                ref={subRef}
                value={subInput}
                onChange={e => setSubInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') submitSub()
                  if (e.key === 'Escape') { setShowSubInput(false); setSubInput('') }
                }}
                onBlur={() => { if (!subInput.trim()) setShowSubInput(false) }}
                placeholder="Substep title…"
                className="flex-1 bg-transparent text-xs text-yt-text border-b border-yt-border focus:border-yt-red focus:outline-none placeholder-yt-muted/50"
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface Props { ideaId: number }

export default function StepsPanel({ ideaId }: Props): React.ReactElement {
  const [steps, setSteps] = useState<Step[]>([])
  const [newTitle, setNewTitle] = useState('')
  const [xpBurstId, setXpBurstId] = useState<number | null>(null)
  const [levelUp, setLevelUp] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const notify = () => window.dispatchEvent(new CustomEvent('gamification:updated'))

  const load = useCallback(async () => {
    const s = await window.api.steps.getForIdea(ideaId)
    setSteps(s)
  }, [ideaId])

  useEffect(() => { load() }, [load])

  const handleXpResult = (result: XPResult | null | undefined, stepId: number) => {
    if (!result) return
    setXpBurstId(stepId)
    setTimeout(() => setXpBurstId(null), 1400)
    if (result.leveledUp && result.newLevel != null) setLevelUp(result.newLevel)
    notify()
  }

  const addStep = async () => {
    const t = newTitle.trim()
    if (!t) return
    const step = await window.api.steps.create(ideaId, t)
    setSteps(prev => [...prev, step])
    setNewTitle('')
    notify()
  }

  const handleToggleStep = async (id: number, done: boolean) => {
    if (done) {
      const result = await window.api.steps.complete(id)
      handleXpResult(result, id)
      setSteps(prev => prev.map(s => s.id === id ? { ...s, completed_at: new Date().toISOString() } : s))
    } else {
      await window.api.steps.uncomplete(id)
      setSteps(prev => prev.map(s => s.id === id ? { ...s, completed_at: null } : s))
      notify()
    }
  }

  const handleDeleteStep = async (id: number) => {
    await window.api.steps.delete(id)
    setSteps(prev => prev.filter(s => s.id !== id))
    notify()
  }

  const handleRenameStep = async (id: number, title: string) => {
    const updated = await window.api.steps.update(id, title)
    setSteps(prev => prev.map(s => s.id === id ? { ...s, title: updated.title } : s))
  }

  const handleAddSubstep = async (stepId: number, title: string) => {
    const sub = await window.api.substeps.create(stepId, title)
    setSteps(prev => prev.map(s => s.id === stepId ? { ...s, substeps: [...s.substeps, sub] } : s))
    notify()
  }

  const handleToggleSub = async (id: number, done: boolean) => {
    if (done) {
      const result = await window.api.substeps.complete(id)
      if (result.stepAutoCompleted) {
        handleXpResult(result.xpResult ?? null, findStepForSub(id))
        setSteps(prev => prev.map(s => ({
          ...s,
          completed_at: s.substeps.some(sub => sub.id === id) ? new Date().toISOString() : s.completed_at,
          substeps: s.substeps.map(sub => sub.id === id ? result.substep : sub)
        })))
      } else {
        setSteps(prev => prev.map(s => ({
          ...s,
          substeps: s.substeps.map(sub => sub.id === id ? result.substep : sub)
        })))
      }
      notify()
    } else {
      const result = await window.api.substeps.uncomplete(id)
      setSteps(prev => prev.map(s => ({
        ...s,
        completed_at: result.stepAutoUncompleted && s.substeps.some(sub => sub.id === id) ? null : s.completed_at,
        substeps: s.substeps.map(sub => sub.id === id ? result.substep : sub)
      })))
      notify()
    }
  }

  const findStepForSub = (subId: number): number => {
    return steps.find(s => s.substeps.some(sub => sub.id === subId))?.id ?? 0
  }

  const handleDeleteSub = async (id: number) => {
    await window.api.substeps.delete(id)
    setSteps(prev => prev.map(s => ({
      ...s,
      substeps: s.substeps.filter(sub => sub.id !== id)
    })))
    notify()
  }

  const handleRenameSub = async (id: number, title: string) => {
    const updated = await window.api.substeps.update(id, title)
    setSteps(prev => prev.map(s => ({
      ...s,
      substeps: s.substeps.map(sub => sub.id === id ? updated : sub)
    })))
  }

  const completed = steps.filter(s => s.completed_at).length
  const total = steps.length
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100)

  return (
    <div className="mt-4 border-t border-yt-border pt-3">
      {levelUp !== null && <LevelUpToast level={levelUp} onDone={() => setLevelUp(null)} />}

      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-yt-text uppercase tracking-wide">Steps</span>
        {total > 0 && (
          <span className="text-xs text-yt-muted">{completed}/{total} · {pct}%</span>
        )}
      </div>

      {total > 0 && (
        <div className="h-1 bg-yt-elevated rounded-full mb-3 overflow-hidden">
          <div
            className="h-full bg-yt-red rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      <div className="space-y-1 mb-3">
        {steps.map(step => (
          <StepRow
            key={step.id}
            step={step}
            onToggleStep={handleToggleStep}
            onDeleteStep={handleDeleteStep}
            onRenameStep={handleRenameStep}
            onAddSubstep={handleAddSubstep}
            onToggleSub={handleToggleSub}
            onDeleteSub={handleDeleteSub}
            onRenameSub={handleRenameSub}
            xpBurstId={xpBurstId}
          />
        ))}
      </div>

      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') addStep() }}
          placeholder="Add a step…"
          className="flex-1 bg-yt-elevated border border-yt-border rounded-lg px-3 py-1.5 text-sm text-yt-text placeholder-yt-muted/60 focus:outline-none focus:border-yt-red"
        />
        <button
          onClick={addStep}
          disabled={!newTitle.trim()}
          className="px-3 py-1.5 text-sm bg-yt-elevated border border-yt-border rounded-lg text-yt-muted hover:text-yt-text hover:border-yt-red/40 transition-colors disabled:opacity-40"
        >
          Add
        </button>
      </div>
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'

const CYCLE = [
  { type: 'focus', duration: 25 * 60, label: 'Focus' },
  { type: 'rest',  duration:  5 * 60, label: 'Short Break' },
  { type: 'focus', duration: 25 * 60, label: 'Focus' },
  { type: 'rest',  duration:  5 * 60, label: 'Short Break' },
  { type: 'focus', duration: 25 * 60, label: 'Focus' },
  { type: 'rest',  duration:  5 * 60, label: 'Short Break' },
  { type: 'focus', duration: 25 * 60, label: 'Focus' },
  { type: 'rest',  duration: 30 * 60, label: 'Long Break' },
]
const TOTAL_CYCLE_SECONDS = CYCLE.reduce((sum, p) => sum + p.duration, 0)
const LS_KEY = 'deepfocus_timer'

function loadTimerState() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function computePhase(elapsedSeconds) {
  let cumulative = 0
  for (let i = 0; i < CYCLE.length; i++) {
    if (elapsedSeconds < cumulative + CYCLE[i].duration) {
      return { phaseIndex: i, secondsIntoPhase: elapsedSeconds - cumulative }
    }
    cumulative += CYCLE[i].duration
  }
  return { phaseIndex: 0, secondsIntoPhase: 0 }
}

function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.8)
  } catch (_e) { /* requires prior user gesture */ }
}

export default function Timer({ onPomodoroComplete }) {
  const [startTimestamp, setStartTimestamp] = useState(null)
  const [pausedOffset, setPausedOffset] = useState(0)
  const [running, setRunning] = useState(false)
  const [pauseStart, setPauseStart] = useState(null)
  const [display, setDisplay] = useState({
    phaseIndex: 0,
    remaining: CYCLE[0].duration,
    cycleProgress: 0,
  })

  const prevPhaseRef = useRef(0)
  const completedRef = useRef(new Set())

  useEffect(() => {
    const saved = loadTimerState()
    if (!saved || !saved.startTimestamp) return

    setStartTimestamp(saved.startTimestamp)
    setPausedOffset(saved.pausedOffset ?? 0)

    if (saved.running) {
      setRunning(true)
    } else {
      setPauseStart(Date.now())
      const elapsed = (saved.pausedAt - saved.startTimestamp) / 1000 - (saved.pausedOffset ?? 0)
      const { phaseIndex, secondsIntoPhase } = computePhase(Math.max(0, elapsed))
      setDisplay({
        phaseIndex,
        remaining: CYCLE[phaseIndex].duration - secondsIntoPhase,
        cycleProgress: Math.min(elapsed / TOTAL_CYCLE_SECONDS, 1),
      })
      prevPhaseRef.current = phaseIndex
    }
  }, [])

  useEffect(() => {
    if (!running || !startTimestamp) return

    const interval = setInterval(() => {
      const elapsed = (Date.now() - startTimestamp) / 1000 - pausedOffset
      if (elapsed >= TOTAL_CYCLE_SECONDS) {
        localStorage.removeItem(LS_KEY)
        setRunning(false)
        setStartTimestamp(null)
        setPausedOffset(0)
        prevPhaseRef.current = 0
        completedRef.current = new Set()
        setDisplay({ phaseIndex: 0, remaining: CYCLE[0].duration, cycleProgress: 0 })
        return
      }

      const { phaseIndex, secondsIntoPhase } = computePhase(elapsed)
      const remaining = CYCLE[phaseIndex].duration - secondsIntoPhase
      const cycleProgress = elapsed / TOTAL_CYCLE_SECONDS

      setDisplay({ phaseIndex, remaining, cycleProgress })

      if (phaseIndex !== prevPhaseRef.current) {
        const transitionedFrom = prevPhaseRef.current
        prevPhaseRef.current = phaseIndex
        playNotificationSound()

        if (CYCLE[transitionedFrom].type === 'focus' && !completedRef.current.has(transitionedFrom)) {
          completedRef.current.add(transitionedFrom)
          onPomodoroComplete()
        }
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [running, startTimestamp, pausedOffset, onPomodoroComplete])

  const start = () => {
    const now = Date.now()
    const ts = startTimestamp ?? now
    const newOffset = pausedOffset + (pauseStart ? (now - pauseStart) / 1000 : 0)
    setStartTimestamp(ts)
    setPausedOffset(newOffset)
    setRunning(true)
    setPauseStart(null)
    localStorage.setItem(LS_KEY, JSON.stringify({ startTimestamp: ts, running: true, pausedOffset: newOffset }))
  }

  const pause = () => {
    const now = Date.now()
    setRunning(false)
    setPauseStart(now)
    localStorage.setItem(LS_KEY, JSON.stringify({ startTimestamp, running: false, pausedOffset, pausedAt: now }))
  }

  const reset = () => {
    localStorage.removeItem(LS_KEY)
    setStartTimestamp(null)
    setPausedOffset(0)
    setRunning(false)
    setPauseStart(null)
    prevPhaseRef.current = 0
    completedRef.current = new Set()
    setDisplay({ phaseIndex: 0, remaining: CYCLE[0].duration, cycleProgress: 0 })
  }

  const mins = String(Math.floor(display.remaining / 60)).padStart(2, '0')
  const secs = String(Math.floor(display.remaining % 60)).padStart(2, '0')
  const phase = CYCLE[display.phaseIndex]

  return (
    <div className="glass p-8 flex flex-col items-center gap-5">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">
          {phase.label}
        </span>
        <span className="text-xs text-gray-300">·</span>
        <span className="text-xs text-gray-400">
          Phase {display.phaseIndex + 1} of 8
        </span>
      </div>

      <div
        style={{
          fontSize: 72,
          fontWeight: 700,
          color: phase.type === 'focus' ? '#84CC16' : '#6B7280',
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '-2px',
          lineHeight: 1,
          transition: 'color 300ms',
        }}
      >
        {mins}:{secs}
      </div>

      <div className="w-full flex flex-col gap-1">
        <div className="w-full bg-[#ECFCCB] rounded-full h-2 overflow-hidden">
          <div
            className="h-full bg-[#84CC16] rounded-full"
            style={{
              width: `${display.cycleProgress * 100}%`,
              transition: 'width 1s linear',
            }}
          />
        </div>
        <p className="text-xs text-gray-400 text-right">
          {Math.round(display.cycleProgress * 100)}% of cycle
        </p>
      </div>

      <div className="flex gap-3">
        {running ? (
          <button
            onClick={pause}
            className="bg-[#ECFCCB] hover:bg-[#d4f5a0] text-[#65A30D] font-semibold px-8 py-3 rounded-xl transition-colors duration-200 cursor-pointer"
          >
            Pause
          </button>
        ) : (
          <button
            onClick={start}
            className="bg-[#84CC16] hover:bg-[#65A30D] text-white font-semibold px-8 py-3 rounded-xl transition-colors duration-200 cursor-pointer"
          >
            {startTimestamp ? 'Resume' : 'Start'}
          </button>
        )}
        <button
          onClick={reset}
          className="text-gray-400 hover:text-gray-600 px-4 py-3 rounded-xl transition-colors duration-200 text-sm cursor-pointer"
        >
          Reset
        </button>
      </div>
    </div>
  )
}

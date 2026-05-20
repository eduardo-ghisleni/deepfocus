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

function playCompletionSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const times = [0, 0.35, 0.7]
    times.forEach(t => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = 880
      gain.gain.setValueAtTime(0.35, ctx.currentTime + t)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.3)
      osc.start(ctx.currentTime + t)
      osc.stop(ctx.currentTime + t + 0.3)
    })
  } catch (_e) {}
}

function playCountdownBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 660
    gain.gain.setValueAtTime(0.23, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.25)
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
  const countdownRef = useRef(new Set())

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
        playCompletionSound()
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

      // Countdown beeps at 3, 2, 1 seconds before phase ends
      const remainingInt = Math.ceil(remaining)
      const countdownKey = `${phaseIndex}-${remainingInt}`
      if ([3, 2, 1].includes(remainingInt) && !countdownRef.current.has(countdownKey)) {
        countdownRef.current.add(countdownKey)
        playCountdownBeep()
      }

      if (phaseIndex !== prevPhaseRef.current) {
        countdownRef.current = new Set()
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
    countdownRef.current = new Set()
    setDisplay({ phaseIndex: 0, remaining: CYCLE[0].duration, cycleProgress: 0 })
  }

  const mins = String(Math.floor(display.remaining / 60)).padStart(2, '0')
  const secs = String(Math.floor(display.remaining % 60)).padStart(2, '0')
  const phase = CYCLE[display.phaseIndex]
  const isFocus = phase.type === 'focus'

  return (
    <div className="glass p-8 flex flex-col items-center gap-5">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          {phase.label}
        </span>
        <span className="text-xs text-slate-600">·</span>
        <span className="text-xs text-slate-400">
          Phase {display.phaseIndex + 1} of 8
        </span>
      </div>

      <div
        style={{
          fontSize: 108,
          fontWeight: 700,
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '-2px',
          lineHeight: 1,
          transition: 'color 300ms, text-shadow 300ms',
          color: isFocus ? '#FFFFFF' : '#94A3B8',
          textShadow: isFocus
            ? '0 0 40px rgba(59, 130, 246, 0.5), 0 0 80px rgba(59, 130, 246, 0.2)'
            : 'none',
        }}
      >
        {mins}:{secs}
      </div>

      <div className="w-full flex flex-col gap-1">
        <div
          className="w-full rounded-sm h-1.5 overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.06)' }}
        >
          <div
            className="h-full rounded-sm"
            style={{
              width: `${display.cycleProgress * 100}%`,
              background: 'linear-gradient(90deg, #3B82F6, #818CF8)',
              transition: 'width 1s linear',
              boxShadow: '0 0 8px rgba(59,130,246,0.6)',
            }}
          />
        </div>
        <p className="text-xs text-slate-500 text-right">
          {Math.round(display.cycleProgress * 100)}% of cycle
        </p>
      </div>

      <div className="flex gap-3 w-full">
        {running ? (
          <button
            onClick={pause}
            className="flex-1 font-semibold py-3 rounded-md transition-all duration-200 cursor-pointer text-white tracking-wide"
            style={{
              background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
              boxShadow: '0 0 24px rgba(245,158,11,0.35), inset 0 1px 0 rgba(255,255,255,0.2)',
              border: '1px solid rgba(245,158,11,0.5)',
            }}
          >
            Pause
          </button>
        ) : (
          <button
            onClick={start}
            className="flex-1 text-white font-semibold py-3 rounded-md transition-all duration-200 cursor-pointer tracking-wide"
            style={{
              background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
              boxShadow: '0 0 24px rgba(59,130,246,0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
              border: '1px solid rgba(59,130,246,0.5)',
            }}
          >
            {startTimestamp ? 'Resume' : 'Start'}
          </button>
        )}
        <button
          onClick={reset}
          className="px-5 py-3 rounded-md transition-all duration-200 cursor-pointer text-sm text-white tracking-wide font-semibold"
          style={{
            background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
            boxShadow: '0 0 24px rgba(59,130,246,0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
            border: '1px solid rgba(59,130,246,0.5)',
          }}
        >
          Reset
        </button>
      </div>
    </div>
  )
}

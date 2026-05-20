import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, todayISO, incrementPomodoro } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import Timer from '../components/Timer'
import TaskList from '../components/TaskList'
import BigChallenge from '../components/BigChallenge'
import StatsBar from '../components/StatsBar'
import StarField from '../components/StarField'

function Avatar({ user }) {
  const [error, setError] = useState(false)
  const [hover, setHover] = useState(false)
  const inputRef = useRef(null)
  const lsKey = `deepfocus_avatar_${user?.id}`

  const [customSrc, setCustomSrc] = useState(() => localStorage.getItem(lsKey))

  const googleSrc = !error
    ? (user?.user_metadata?.avatar_url
      ?? user?.user_metadata?.picture
      ?? user?.identities?.[0]?.identity_data?.avatar_url
      ?? null)
    : null

  const src = customSrc ?? googleSrc

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = ev.target.result
      localStorage.setItem(lsKey, dataUrl)
      setCustomSrc(dataUrl)
    }
    reader.readAsDataURL(file)
  }

  return (
    <div
      className="relative w-8 h-8 rounded-full cursor-pointer"
      onClick={() => inputRef.current?.click()}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title="Clique para trocar a foto"
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />

      {src ? (
        <img
          src={src}
          alt="profile"
          onError={() => setError(true)}
          className="w-8 h-8 rounded-full object-cover"
          style={{ border: '2px solid rgba(255,255,255,0.15)', boxShadow: '0 0 10px rgba(59,130,246,0.3)' }}
        />
      ) : (
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
          style={{ background: 'linear-gradient(135deg, #3B82F6, #2563EB)', border: '2px solid rgba(255,255,255,0.15)' }}
        >
          {user?.email?.[0]?.toUpperCase()}
        </div>
      )}

      {hover && (
        <div
          className="absolute inset-0 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.55)' }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
        </div>
      )}
    </div>
  )
}

export default function App() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [challenge, setChallenge] = useState(null)
  const [challengeLoaded, setChallengeLoaded] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [newChallenge, setNewChallenge] = useState('')
  const [saving, setSaving] = useState(false)
  const [pomodorosToday, setPomodorosToday] = useState(0)
  const [minutosToday, setMinutosToday] = useState(0)
  const [resetKey, setResetKey] = useState(0)
  const [confirmReset, setConfirmReset] = useState(false)

  useEffect(() => {
    if (!user) return
    const today = todayISO()

    supabase
      .from('daily_challenge')
      .select('*')
      .eq('user_id', user.id)
      .eq('data', today)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setChallenge(data)
        else setShowModal(true)
        setChallengeLoaded(true)
      })

    supabase
      .from('pomodoro_sessions')
      .select('pomodoros_completos, minutos_foco')
      .eq('user_id', user.id)
      .eq('data', today)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setPomodorosToday(data.pomodoros_completos)
          setMinutosToday(data.minutos_foco)
        }
      })
  }, [user])

  const saveChallenge = async () => {
    const text = newChallenge.trim()
    if (!text || saving) return
    setSaving(true)
    const { data, error } = await supabase
      .from('daily_challenge')
      .insert({ user_id: user.id, texto: text, data: todayISO() })
      .select()
      .single()

    if (!error && data) {
      setChallenge(data)
      setShowModal(false)
    }
    setSaving(false)
  }

  const handleFullReset = async () => {
    localStorage.removeItem('deepfocus_timer')
    await supabase
      .from('pomodoro_sessions')
      .upsert(
        { user_id: user.id, data: todayISO(), pomodoros_completos: 0, minutos_foco: 0 },
        { onConflict: 'user_id,data' }
      )
    await supabase.from('tasks').delete().eq('user_id', user.id).eq('data', todayISO())
    if (challenge) {
      await supabase.from('daily_challenge').delete().eq('id', challenge.id)
    }
    setPomodorosToday(0)
    setMinutosToday(0)
    setChallenge(null)
    setShowModal(true)
    setConfirmReset(false)
    setResetKey(k => k + 1)
  }

  const handleUpdateChallenge = async (newText) => {
    const { data } = await supabase
      .from('daily_challenge')
      .update({ texto: newText })
      .eq('id', challenge.id)
      .select()
      .single()
    if (data) setChallenge(data)
  }

  const handlePomodoroComplete = async () => {
    setPomodorosToday(p => p + 1)
    setMinutosToday(m => m + 25)
    await incrementPomodoro(user.id)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  if (!challengeLoaded) return null

  return (
    <div className="min-h-screen p-6" style={{ position: 'relative' }}>
      <StarField />

      {showModal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
        >
          <div className="glass-modal p-8 w-full max-w-md flex flex-col gap-4">
            <div>
              <h2 className="text-xl font-bold text-white">What's your main challenge today?</h2>
              <p className="text-slate-400 text-sm mt-1">Once set, this cannot be changed.</p>
            </div>
            <input
              className="glass-input w-full px-4 py-3 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              placeholder="e.g. Finish the onboarding flow"
              value={newChallenge}
              onChange={e => setNewChallenge(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveChallenge()}
              autoFocus
            />
            <button
              onClick={saveChallenge}
              disabled={saving || !newChallenge.trim()}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-md transition-colors duration-200 cursor-pointer"
              style={{ boxShadow: '0 0 20px rgba(59,130,246,0.3)' }}
            >
              {saving ? 'Saving...' : 'Set Challenge'}
            </button>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto flex flex-col gap-5" style={{ position: 'relative', zIndex: 1 }}>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">deepfocus</h1>
          <div className="flex items-center gap-4">
            {confirmReset ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Reset all?</span>
                <button onClick={handleFullReset} className="text-xs text-red-400 hover:text-red-300 transition-colors cursor-pointer">Yes</button>
                <button onClick={() => setConfirmReset(false)} className="text-xs text-slate-500 hover:text-slate-300 transition-colors cursor-pointer">No</button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmReset(true)}
                className="text-red-400 hover:text-red-300 text-xs transition-colors duration-200 cursor-pointer"
              >
                Reset
              </button>
            )}
            <button
              onClick={() => navigate('/historico')}
              className="text-slate-400 hover:text-slate-200 text-sm transition-colors duration-200 cursor-pointer"
            >
              History
            </button>
            <button
              onClick={handleSignOut}
              className="text-slate-500 hover:text-slate-300 text-xs transition-colors duration-200 cursor-pointer"
            >
              Sign out
            </button>
            <Avatar user={user} />
          </div>
        </div>

        <StatsBar pomodorosToday={pomodorosToday} minutosToday={minutosToday} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
          <Timer key={resetKey} onPomodoroComplete={handlePomodoroComplete} />

          <div className="flex flex-col gap-5">
            {challenge && <BigChallenge text={challenge.texto} onSave={handleUpdateChallenge} />}
            <TaskList key={resetKey} userId={user.id} />
          </div>
        </div>
      </div>
    </div>
  )
}

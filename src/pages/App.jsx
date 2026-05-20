import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, todayISO, incrementPomodoro } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import Timer from '../components/Timer'
import TaskList from '../components/TaskList'
import BigChallenge from '../components/BigChallenge'
import StatsBar from '../components/StatsBar'

export default function App() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [challenge, setChallenge] = useState(null)
  const [challengeLoaded, setChallengeLoaded] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [newChallenge, setNewChallenge] = useState('')
  const [saving, setSaving] = useState(false)
  const [pomodorosToday, setPomodorosToday] = useState(0)

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
      .select('pomodoros_completos')
      .eq('user_id', user.id)
      .eq('data', today)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setPomodorosToday(data.pomodoros_completos)
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

  const handlePomodoroComplete = async () => {
    setPomodorosToday(p => p + 1)
    await incrementPomodoro(user.id)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  if (!challengeLoaded) return null

  return (
    <div
      className="min-h-screen p-6"
      style={{ background: 'linear-gradient(135deg, #f0fff4, #ffffff)' }}
    >
      {showModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-modal p-8 w-full max-w-md flex flex-col gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">What's your main challenge today?</h2>
              <p className="text-gray-500 text-sm mt-1">Once set, this cannot be changed.</p>
            </div>
            <input
              className="border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#84CC16] bg-white/70"
              placeholder="e.g. Finish the onboarding flow"
              value={newChallenge}
              onChange={e => setNewChallenge(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveChallenge()}
              autoFocus
            />
            <button
              onClick={saveChallenge}
              disabled={saving || !newChallenge.trim()}
              className="bg-[#84CC16] hover:bg-[#65A30D] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors duration-200 cursor-pointer"
            >
              {saving ? 'Saving...' : 'Set Challenge'}
            </button>
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">deepfocus</h1>
          <button
            onClick={handleSignOut}
            className="text-gray-400 hover:text-gray-600 text-xs transition-colors duration-200 cursor-pointer"
          >
            Sign out
          </button>
        </div>

        <StatsBar pomodorosToday={pomodorosToday} />

        {challenge && <BigChallenge text={challenge.texto} />}

        <Timer onPomodoroComplete={handlePomodoroComplete} />

        <TaskList userId={user.id} />

        <button
          onClick={() => navigate('/historico')}
          className="text-gray-400 hover:text-gray-600 text-sm self-center transition-colors duration-200 cursor-pointer"
        >
          View history →
        </button>
      </div>
    </div>
  )
}

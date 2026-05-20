import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, todayISO } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

function formatDate(iso) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

export default function History() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [days, setDays] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const today = todayISO()

    Promise.all([
      supabase.from('tasks').select('*').eq('user_id', user.id).order('data', { ascending: false }),
      supabase.from('daily_challenge').select('*').eq('user_id', user.id).order('data', { ascending: false }),
      supabase.from('pomodoro_sessions').select('*').eq('user_id', user.id).order('data', { ascending: false }),
    ]).then(([{ data: tasks }, { data: challenges }, { data: sessions }]) => {
      const allDates = [
        ...new Set([
          ...(tasks ?? []).map(t => t.data),
          ...(challenges ?? []).map(c => c.data),
          ...(sessions ?? []).map(s => s.data),
        ]),
      ]
        .filter(d => d !== today)
        .sort()
        .reverse()

      const result = allDates.map(date => ({
        date,
        challenge: (challenges ?? []).find(c => c.data === date)?.texto ?? null,
        tasks: (tasks ?? []).filter(t => t.data === date),
        pomodoros: (sessions ?? []).find(s => s.data === date)?.pomodoros_completos ?? 0,
      }))

      setDays(result)
      setLoading(false)
    })
  }, [user])

  return (
    <div
      className="min-h-screen p-6"
      style={{ background: 'linear-gradient(135deg, #f0fff4, #ffffff)' }}
    >
      <div className="max-w-2xl mx-auto flex flex-col gap-4">
        <div className="flex items-center gap-4 mb-2">
          <button
            onClick={() => navigate('/app')}
            className="text-gray-400 hover:text-gray-600 text-sm transition-colors duration-200 cursor-pointer"
          >
            ← Back
          </button>
          <h1 className="text-2xl font-bold text-gray-900">History</h1>
        </div>

        {loading && (
          <p className="text-gray-400 text-center py-12 text-sm">Loading...</p>
        )}

        {!loading && days.length === 0 && (
          <div className="glass p-10 flex flex-col items-center gap-2">
            <p className="text-gray-400 text-center">No history yet.</p>
            <p className="text-gray-300 text-sm text-center">Complete your first day to see it here.</p>
          </div>
        )}

        {days.map(day => {
          const done = day.tasks.filter(t => t.feita).length
          const total = day.tasks.length
          return (
            <div key={day.date} className="glass p-6 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-900">{formatDate(day.date)}</span>
                <span className="text-[#84CC16] font-bold text-sm">
                  {day.pomodoros} {day.pomodoros === 1 ? 'pomodoro' : 'pomodoros'}
                </span>
              </div>
              {day.challenge && (
                <p className="text-gray-600 text-sm italic border-l-2 border-[#84CC16] pl-3">
                  "{day.challenge}"
                </p>
              )}
              <p className="text-gray-400 text-xs">
                {total === 0 ? 'No tasks' : `${done}/${total} tasks completed`}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

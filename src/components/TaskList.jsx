import { useState, useEffect } from 'react'
import { Trash2, Plus } from 'lucide-react'
import { supabase, todayISO } from '../lib/supabase'

const PRIORIDADES = [
  { label: 'URGENTE',    color: '#EF4444', bg: 'rgba(239,68,68,0.15)',   border: 'rgba(239,68,68,0.35)' },
  { label: 'IMPORTANTE', color: '#F59E0B', bg: 'rgba(245,158,11,0.15)',  border: 'rgba(245,158,11,0.35)' },
  { label: 'SECUNDÁRIA', color: '#64748B', bg: 'rgba(100,116,139,0.15)', border: 'rgba(100,116,139,0.3)' },
]

function PriorityBadge({ value, onClick }) {
  const p = PRIORIDADES.find(x => x.label === value) ?? PRIORIDADES[2]
  return (
    <button
      onClick={onClick}
      title="Clique para alterar prioridade"
      className="text-xs font-semibold px-2 py-0.5 rounded cursor-pointer transition-all duration-200 shrink-0"
      style={{ color: p.color, background: p.bg, border: `1px solid ${p.border}`, letterSpacing: '0.04em' }}
    >
      {p.label}
    </button>
  )
}

export default function TaskList({ userId }) {
  const [tasks, setTasks] = useState([])
  const [input, setInput] = useState('')
  const [priorities, setPriorities] = useState({})
  const today = todayISO()

  const cycleP = (id) => {
    setPriorities(prev => {
      const current = prev[id] ?? 'SECUNDÁRIA'
      const idx = PRIORIDADES.findIndex(p => p.label === current)
      const next = PRIORIDADES[(idx + 1) % PRIORIDADES.length].label
      return { ...prev, [id]: next }
    })
  }

  useEffect(() => {
    supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .eq('data', today)
      .order('criado_em')
      .then(({ data }) => setTasks(data ?? []))
  }, [userId, today])

  const addTask = async () => {
    const text = input.trim()
    if (!text) return
    setInput('')
    const { data } = await supabase
      .from('tasks')
      .insert({ user_id: userId, texto: text, data: today })
      .select()
      .single()
    if (data) setTasks(t => [...t, data])
  }

  const toggleTask = async (task) => {
    setTasks(t => t.map(x => x.id === task.id ? { ...x, feita: !x.feita } : x))
    await supabase.from('tasks').update({ feita: !task.feita }).eq('id', task.id)
  }

  const deleteTask = async (id) => {
    setTasks(t => t.filter(x => x.id !== id))
    await supabase.from('tasks').delete().eq('id', id)
  }

  const done = tasks.filter(t => t.feita).length

  return (
    <div className="glass p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-white">Today's Tasks</h2>
        {tasks.length > 0 && (
          <span className="text-xs text-slate-400">{done}/{tasks.length} done</span>
        )}
      </div>

      <div className="flex gap-2">
        <input
          className="glass-input flex-1 px-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          placeholder="Add a task..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addTask()}
        />
        <button
          onClick={addTask}
          className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-md transition-colors duration-200 cursor-pointer"
        >
          <Plus size={18} />
        </button>
      </div>

      <ul className="flex flex-col gap-2">
        {tasks.map(task => (
          <li key={task.id} className="flex items-center gap-3 group py-1">
            <input
              type="checkbox"
              checked={task.feita}
              onChange={() => toggleTask(task)}
              className="w-4 h-4 cursor-pointer rounded"
              style={{ accentColor: '#3B82F6' }}
            />
            <span
              className={`flex-1 text-sm transition-colors duration-200 ${
                task.feita ? 'line-through text-slate-500' : 'text-slate-200'
              }`}
            >
              {task.texto}
            </span>
            <PriorityBadge value={priorities[task.id] ?? 'SECUNDÁRIA'} onClick={() => cycleP(task.id)} />
            <button
              onClick={() => deleteTask(task.id)}
              className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all duration-200 cursor-pointer"
            >
              <Trash2 size={14} />
            </button>
          </li>
        ))}
        {tasks.length === 0 && (
          <p className="text-slate-500 text-xs text-center py-3">No tasks yet. Add one above.</p>
        )}
      </ul>
    </div>
  )
}

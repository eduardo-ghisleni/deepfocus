import { useState, useEffect } from 'react'
import { Trash2, Plus } from 'lucide-react'
import { supabase, todayISO } from '../lib/supabase'

export default function TaskList({ userId }) {
  const [tasks, setTasks] = useState([])
  const [input, setInput] = useState('')
  const today = todayISO()

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
        <h2 className="font-bold text-gray-900">Today's Tasks</h2>
        {tasks.length > 0 && (
          <span className="text-xs text-gray-400">{done}/{tasks.length} done</span>
        )}
      </div>

      <div className="flex gap-2">
        <input
          className="flex-1 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#84CC16] bg-white/60"
          placeholder="Add a task..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addTask()}
        />
        <button
          onClick={addTask}
          className="bg-[#84CC16] hover:bg-[#65A30D] text-white p-2 rounded-xl transition-colors duration-200 cursor-pointer"
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
              style={{ accentColor: '#84CC16' }}
            />
            <span
              className={`flex-1 text-sm transition-colors duration-200 ${
                task.feita ? 'line-through text-gray-400' : 'text-gray-800'
              }`}
            >
              {task.texto}
            </span>
            <button
              onClick={() => deleteTask(task.id)}
              className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all duration-200 cursor-pointer"
            >
              <Trash2 size={14} />
            </button>
          </li>
        ))}
        {tasks.length === 0 && (
          <p className="text-gray-400 text-xs text-center py-3">No tasks yet. Add one above.</p>
        )}
      </ul>
    </div>
  )
}

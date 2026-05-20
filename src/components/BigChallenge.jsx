import { useState, useRef, useEffect } from 'react'
import { Pencil, Check, X } from 'lucide-react'

export default function BigChallenge({ text, onSave }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(text)
  const inputRef = useRef(null)

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  const confirm = () => {
    const trimmed = value.trim()
    if (trimmed && trimmed !== text) onSave(trimmed)
    setEditing(false)
  }

  const cancel = () => {
    setValue(text)
    setEditing(false)
  }

  return (
    <div className="glass px-8 py-6 flex flex-col gap-2" style={{ borderLeft: '3px solid #3B82F6' }}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest text-blue-400">
          Today's Challenge
        </span>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="text-slate-600 hover:text-slate-300 transition-colors duration-200 cursor-pointer"
            title="Editar desafio"
          >
            <Pencil size={13} />
          </button>
        )}
      </div>

      {editing ? (
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') confirm(); if (e.key === 'Escape') cancel() }}
            className="glass-input flex-1 px-3 py-1.5 text-white text-lg font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          />
          <button onClick={confirm} className="text-blue-400 hover:text-blue-300 transition-colors cursor-pointer">
            <Check size={16} />
          </button>
          <button onClick={cancel} className="text-slate-500 hover:text-slate-300 transition-colors cursor-pointer">
            <X size={16} />
          </button>
        </div>
      ) : (
        <p className="text-xl font-bold text-white leading-snug">{text}</p>
      )}
    </div>
  )
}

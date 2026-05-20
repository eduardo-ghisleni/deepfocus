export default function StatsBar({ pomodorosToday, minutosToday }) {
  return (
    <div className="flex gap-3">
      <div className="glass flex-1 px-5 py-4 flex flex-col items-center gap-1">
        <span className="text-2xl font-bold text-blue-400">{pomodorosToday}</span>
        <span className="text-xs text-slate-400">pomodoros</span>
      </div>
      <div className="glass flex-1 px-5 py-4 flex flex-col items-center gap-1">
        <span className="text-2xl font-bold text-blue-400">{minutosToday}m</span>
        <span className="text-xs text-slate-400">focused today</span>
      </div>
    </div>
  )
}

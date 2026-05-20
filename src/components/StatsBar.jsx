export default function StatsBar({ pomodorosToday }) {
  const focusMinutes = pomodorosToday * 25
  return (
    <div className="flex gap-3">
      <div className="glass flex-1 px-5 py-4 flex flex-col items-center gap-1">
        <span className="text-2xl font-bold text-[#84CC16]">{pomodorosToday}</span>
        <span className="text-xs text-gray-400">pomodoros</span>
      </div>
      <div className="glass flex-1 px-5 py-4 flex flex-col items-center gap-1">
        <span className="text-2xl font-bold text-[#84CC16]">{focusMinutes}m</span>
        <span className="text-xs text-gray-400">focused today</span>
      </div>
    </div>
  )
}

export default function BigChallenge({ text }) {
  return (
    <div className="glass px-8 py-6 flex flex-col gap-1" style={{ borderLeft: '3px solid #84CC16' }}>
      <span className="text-xs font-semibold uppercase tracking-widest text-[#84CC16]">
        Today's Challenge
      </span>
      <p className="text-xl font-bold text-gray-900 leading-snug italic">{text}</p>
    </div>
  )
}

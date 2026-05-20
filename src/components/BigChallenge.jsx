export default function BigChallenge({ text }) {
  return (
    <div className="glass px-8 py-6 flex flex-col gap-1" style={{ borderLeft: '3px solid #3B82F6' }}>
      <span className="text-xs font-semibold uppercase tracking-widest text-blue-400">
        Today's Challenge
      </span>
      <p className="text-xl font-bold text-white leading-snug">{text}</p>
    </div>
  )
}

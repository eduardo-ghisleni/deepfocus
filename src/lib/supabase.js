import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export function todayISO() {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export async function incrementPomodoro(userId) {
  const today = todayISO()
  const { data: existing } = await supabase
    .from('pomodoro_sessions')
    .select('pomodoros_completos, minutos_foco')
    .eq('user_id', userId)
    .eq('data', today)
    .maybeSingle()

  const currentPomodoros = existing?.pomodoros_completos ?? 0
  const currentMinutes = existing?.minutos_foco ?? 0

  await supabase
    .from('pomodoro_sessions')
    .upsert(
      {
        user_id: userId,
        data: today,
        pomodoros_completos: currentPomodoros + 1,
        minutos_foco: currentMinutes + 25,
      },
      { onConflict: 'user_id,data' }
    )
}

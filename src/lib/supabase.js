import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export function todayISO() {
  return new Date().toISOString().split('T')[0]
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

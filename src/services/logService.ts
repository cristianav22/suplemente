import { supabase } from "./supabaseClient"

export const addLog = async (log: {
  user_id: string
  type: string
  name: string
  amount: number
  unit: string
  timestamp: number
}) => {
  const { error } = await supabase
    .from('supplement_logs')
    .insert(log)

  if (error) {
    console.error("Error guardando log:", error)
    throw error
  }
}
import { supabase } from "./supabaseClient"

export const getCurrentUser = async () => {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null;
  const { data, error } = await supabase.auth.getUser()
  if (error) return null;
  return data.user
}

export const getProfile = async () => {
  const user = await getCurrentUser()

  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  if (error && error.code !== "PGRST116") throw error

  return data
}

export const saveProfile = async (profile: {
  name: string
  age: number
  weight: number
  goal: string
}) => {
  const user = await getCurrentUser()

  if (!user) throw new Error("Usuario no autenticado")

  const { error } = await supabase
    .from("profiles")
    .upsert({
      id: user.id,
      ...profile,
      updated_at: new Date()
    })

  if (error) throw error
}
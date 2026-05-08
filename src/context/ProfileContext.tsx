import { createContext, useContext, useEffect, useState } from "react"
import { getProfile } from "../services/profileService"

type Profile = {
  name: string
  age: number
  weight: number
  goal: string
}

type ProfileContextType = {
  profile: Profile | null
  setProfile: (p: Profile | null) => void
  loading: boolean
}

const ProfileContext = createContext<ProfileContextType>({
  profile: null,
  setProfile: () => {},
  loading: true
})

export const ProfileProvider = ({ children }: any) => {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getProfile()
        setProfile(data)
      } catch (err) {
        console.error("Error cargando perfil:", err)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  return (
    <ProfileContext.Provider value={{ profile, setProfile, loading }}>
      {children}
    </ProfileContext.Provider>
  )
}

export const useProfile = () => useContext(ProfileContext)
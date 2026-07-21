import React, { useState, useEffect, useMemo } from 'react';
import { UserProfile, SupplementLog, DailyTargets } from './types';
import { LayoutDashboard, PlusCircle, Settings, Dumbbell, Calendar, LogOut } from 'lucide-react';
import { Dashboard } from './components/Dashboard';
import { SupplementLogger } from './components/SupplementLogger';
import { ProfileSettings } from './components/ProfileSettings';
import { CalendarHistory } from './components/CalendarHistory';
import { AuthScreen } from './components/AuthScreen';
import { ResetPassword } from './components/ResetPassword';
import { supabase } from './services/supabaseClient';
import type { User } from '@supabase/supabase-js';
import { ifError } from 'assert';
import { error } from 'console';
import { addLog } from "./services/logService"


const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [isRecovery, setIsRecovery] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'log' | 'calendar' | 'profile'>('dashboard');
  const [darkMode, setDarkMode] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: 'Atleta',
    weight: 75,
    goal: 'muscle',
    activityLevel: 'moderate',
    activeSupplements: [],
    customSupplements: [],
    sleepGoal: 8
  });

  const [logs, setLogs] = useState<SupplementLog[]>([]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // --- Modo oscuro ---
  useEffect(() => {
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  },  [darkMode]);
  

  // --- Auth listener ---
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth event:', event, session);
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true);
        setLoadingAuth(false);
        return;
      } else if (event === 'SIGNED_IN' && session) {
        setUser(session.user);
        setLoadingAuth(false);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setLoadingAuth(false);
      } else if (event === 'INITIAL_SESSION') {
        setUser(session?.user ?? null);
        setLoadingAuth(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // --- Cargar perfil y logs desde Supabase cuando hay usuario ---
  useEffect(() => {
    if (!user) {
    setLoadingProfile(false);
    return;
}
    if (!user) return;

    // Cargar perfil
    setLoadingProfile(true);

  
supabase
  .from('profiles')
  .select('*')
  .eq('id', user.id)
  .single()
  .then(({ data, error }) => { 
    if (error) {
      console.error('Error cargando perfil:', error);
    }

    if (data) {
      setUserProfile({
        name: data.name,
        weight: data.weight,
        goal: data.goal,
        activityLevel: data.activity_level,
        activeSupplements: data.active_supplements ?? [],
        customSupplements: data.custom_supplements ?? [],
        sleepGoal: data.sleep_goal ?? 8
      });
    }

    setLoadingProfile(false);
  });

    // Cargar logs
    supabase
      .from('supplement_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('timestamp', { ascending: false })
      .then(({ data }) => {
        if (data) {
          setLogs(data.map(l => ({
            id: l.id,
            type: l.type,
            name: l.name,
            amount: l.amount,
            unit: l.unit,
            timestamp: l.timestamp
          })));
        }
      });
  }, [user]);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayLogs = logs.filter(log => {
        const logDate = new Date(log.timestamp);
        return logDate >= today;
  });
      const totalToday = todayLogs.length;

  // --- Guardar perfil en Supabase ---
  const handleSaveProfile = async (p: UserProfile) => {
    if (!p) return;
    setUserProfile(prev => ({
      ...prev,
      ...p
    }));
    if (!user) return;
    await supabase.from('profiles').upsert({
      id: user.id,
      name: p.name,
      weight: p.weight,
      goal: p.goal,
      activity_level: p.activityLevel,
      active_supplements: p.activeSupplements,
      custom_supplements: p.customSupplements,
      sleep_goal: p.sleepGoal,
      updated_at: new Date().toISOString()
    });
    setActiveTab('dashboard');
  };

  // --- Agregar log en Supabase ---
  const handleAddLog = async (logData: Omit<SupplementLog, 'id' | 'timestamp'>) => {
    const newLog: SupplementLog = {
      ...logData,
      id: Date.now().toString(),
      timestamp: Date.now()
    };
    setLogs(prev => [newLog, ...prev]);

    if (!user) return;
    await addLog({
      user_id: user.id,
      type: newLog.type,
      name: newLog.name,
      amount: newLog.amount,
      unit: newLog.unit,
      timestamp: newLog.timestamp
    });
  };

  // --- Cerrar sesión ---
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setLogs([]);
    setUserProfile({
      name: 'Atleta', weight: 75, goal: 'muscle',
      activityLevel: 'moderate', activeSupplements: [],
      customSupplements: [], sleepGoal: 8
    });
  };

  // --- Cálculo de targets ---
  const targets = useMemo<DailyTargets>(() => {
    let proteinMultiplier = 1.6;
    if (userProfile.goal === 'muscle') proteinMultiplier = 2.0;
    if (userProfile.activityLevel === 'athlete') proteinMultiplier = 2.2;
    if (userProfile.activityLevel === 'sedentary') proteinMultiplier = 1.0;
    return {
      protein: Math.round(userProfile.weight * proteinMultiplier),
      water: parseFloat((userProfile.weight * 0.035).toFixed(1)),
      creatine: 5,
      sleep: userProfile.sleepGoal || 8
    };
  }, [userProfile]);

  // --- Renders ---
  if (loadingAuth) {
    return (
      <div className={darkMode ? 'dark' : ''}>
        <div className="min-h-screen bg-gray-950 flex items-center justify-center">
          <div className="text-white text-lg">Cargando...</div>
          </div>
        </div>
    );
  }
  if (loadingProfile) {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-white text-lg">Cargando perfil...</div>
    </div>
  );
}

  if (isRecovery) {
    return <ResetPassword onDone={() => setIsRecovery(false)} />;
  }

  if (!user) {
    return <AuthScreen />;
  }
// logo de la app en dashboard
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white flex flex-col md:flex-row max-w-7xl mx-auto transition-colors duration-300">
      <nav className="md:w-64 bg-white dark:bg-gray-900 md:min-h-screen border-r border-gray-200 dark:border-gray-800 flex flex-row md:flex-col sticky top-0 md:relative z-10 shadow-sm md:shadow-none order-2 md:order-1">
          <div className="hidden md:flex items-center gap-2 p-6 text-indigo-500 dark:text-indigo-400">
          <img src="/icons/icon-512.png" alt="logo" className="w-12 h-12 rounded-lg shadow-sm" />
          <span className="text-2xl font-bold tracking-tight">SupleSuite</span>
        </div>

        <div className="flex-1 flex md:flex-col justify-around md:justify-start p-2 md:p-4 gap-2">
          {[
            { tab: 'dashboard', icon: <LayoutDashboard size={24} />, label: 'Resumen' },
            { tab: 'log', icon: <PlusCircle size={24} />, label: 'Registrar' },
            { tab: 'calendar', icon: <Calendar size={24} />, label: 'Historial' },
            { tab: 'profile', icon: <Settings size={24} />, label: 'Perfil' },
          ].map(({ tab, icon, label }) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`flex items-center gap-3 p-3 rounded-xl transition-all w-full ${
                activeTab === tab
                  ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300 font-semibold'
                  : 'text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              {icon}
              <span className="hidden md:block">{label}</span>
            </button>
          ))}

          {/* Botón cerrar sesión - solo visible en desktop */}
          <button
            onClick={handleLogout}
            className="hidden md:flex items-center gap-3 p-3 rounded-xl transition-all w-full text-gray-400 hover:bg-red-50 hover:text-red-500 mt-auto"
          >
            <LogOut size={24} />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </nav>

      <main className="flex-1 p-4 md:p-8 overflow-y-auto order-1 md:order-2 transition-colors duration-300">
        <div className="md:hidden flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 text-indigo-500 dark:text-indigo-400">
            <img src="/icons/icon-512.png" alt="logo" className="w-7 h-7 rounded-lg shadow-sm" />
            <span className="text-xl font-bold">SupleSuite</span>
          </div>
          <button onClick={handleLogout} className="text-gray-400 dark:text-gray-500 hover:text-red-500">
            <LogOut size={22} />
          </button>
        </div>

        {activeTab === 'dashboard' && (
          
          <Dashboard profile={userProfile} logs={logs} targets={targets} onAddLog={handleAddLog} />
        )}
        {activeTab === 'log' && (
          <SupplementLogger onAddLog={handleAddLog} userProfile={userProfile} />
        )}
        {activeTab === 'calendar' && (
          <CalendarHistory logs={logs} />
        )}
        {activeTab === 'profile' && (
          <ProfileSettings 
            profile={userProfile}
            onSave={handleSaveProfile}
            darkMode={darkMode}
            setDarkMode={setDarkMode} 
          />
        )}
      </main>
    </div>
  );
};

export default App;
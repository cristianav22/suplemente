
import React, { useState, useMemo } from 'react';
import { SupplementLog, UserProfile, DailyTargets, AVAILABLE_SUPPLEMENTS } from '../types';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Droplets, Dumbbell, Zap } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface Props {
  logs: SupplementLog[];
  profile?: UserProfile;
  targets?: DailyTargets;
}

export const CalendarHistory: React.FC<Props> = ({ logs, profile, targets }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Helper to check if two dates are the same day
  const isSameDay = (d1: Date, d2: Date) => {
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  };

  const ProgressDial = ({ percent, size = 60 }: { percent: number; size?: number }) => {
    const strokeWidth = 8;
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (percent / 100) * circumference;

    return (
      <div className="relative flex items-center justify-center font-bold" style={{ width: size, height: size }}>
        <svg className="transform -rotate-90 w-full h-full">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="transparent"
            className="text-gray-200 dark:text-gray-800"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="text-indigo-500 transition-all duration-1000 ease-out"
          />
        </svg>
        <span className="absolute text-xs text-gray-700 dark:text-gray-300">{Math.round(percent)}%</span>
      </div>
    );
  };

  // Get data for the selected date
  const selectedDayLogs = useMemo(() => {
    return logs.filter(log => isSameDay(new Date(log.timestamp), selectedDate)).sort((a, b) => b.timestamp - a.timestamp);
  }, [logs, selectedDate]);

    // Generate weekly trends data
  const weeklyData = useMemo(() => {
    const data = [];
    const baseWeight = profile?.weight || 75;
    for (let i = 6; i >= 0; i--) {
      const d = new Date(selectedDate);
      d.setDate(d.getDate() - i);
      
      const dayLogs = logs.filter(log => isSameDay(new Date(log.timestamp), d));
      
      let protein = 0;
      let waterMl = 0;
      dayLogs.forEach(log => {
        if (log.type === 'protein') protein += log.amount;
        if (log.type === 'water') {
          if (log.unit === 'ml') waterMl += log.amount;
          else if (log.unit === 'L') waterMl += log.amount * 1000;
        }
      });
      
      const mockWeight = baseWeight + Math.sin(d.getDay()) * 0.5;
      
      data.push({
        date: d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' }),
        protein,
        waterL: parseFloat((waterMl / 1000).toFixed(1)),
        weight: parseFloat(mockWeight.toFixed(1))
      });
    }
    return data;
  }, [selectedDate, logs, profile]);

  const { totalProtein, totalWaterL, stackPercent, groupedLogs } = useMemo(() => {
    let protein = 0;
    let waterMl = 0;
    const takenSupplements = new Set<string>();

    selectedDayLogs.forEach(log => {
      if (log.type === 'protein') protein += log.amount;
      else if (log.type === 'water') waterMl += log.amount;
      
      takenSupplements.add(log.name);
    });

    let activeCount = 0;
    let takenCount = 0;

    if (profile) {
      const activeBuiltIn = AVAILABLE_SUPPLEMENTS.filter(s => profile.activeSupplements?.includes(s.id));
      const allActive = [...activeBuiltIn, ...(profile.customSupplements || [])];
      
      activeCount = allActive.length;

      allActive.forEach(supp => {
        if (takenSupplements.has(supp.name) || selectedDayLogs.some(l => l.type === supp.type && l.type !== 'other')) {
          takenCount++;
        }
      });
    }

    const percent = activeCount > 0 ? (takenCount / activeCount) * 100 : 0;
    
    // Group logs for summary
    const groups: Record<string, { type: string; name: string; amount: number; unit: string; count: number }> = {};
    selectedDayLogs.forEach(log => {
      const key = `${log.name}-${log.unit}`;
      if (!groups[key]) {
        groups[key] = { type: log.type, name: log.name, amount: 0, unit: log.unit, count: 0 };
      }
      groups[key].amount += log.amount;
      groups[key].count += 1;
    });

    return { 
      totalProtein: protein, 
      totalWaterL: waterMl / 1000, 
      stackPercent: Math.min(100, percent),
      groupedLogs: Object.values(groups)
    };
  }, [selectedDayLogs, profile]);

  // Calendar Logic
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay(); // 0 = Sunday

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  const renderCalendarCells = () => {
    const cells = [];
    const today = new Date();

    // Padding for days before the 1st of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      cells.push(<div key={`empty-${i}`} className="h-10 w-10 md:h-14 md:w-14"></div>);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateToCheck = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const isToday = isSameDay(dateToCheck, today);
      const isSelected = isSameDay(dateToCheck, selectedDate);
      
      // Check if this day has logs
      const hasLogs = logs.some(log => isSameDay(new Date(log.timestamp), dateToCheck));

      cells.push(
        <button
          key={day}
          onClick={() => setSelectedDate(dateToCheck)}
          className={`h-10 w-10 md:h-14 md:w-14 rounded-full flex flex-col items-center justify-center relative transition-all
            ${isSelected ? 'bg-indigo-600 text-white shadow-md' : 'hover:bg-indigo-50 text-gray-700'}
            ${isToday && !isSelected ? 'border-2 border-indigo-600 font-bold' : ''}
          `}
        >
          <span className="text-sm md:text-base">{day}</span>
          {hasLogs && !isSelected && (
            <span className="absolute bottom-1 w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
          )}
          {hasLogs && isSelected && (
             <span className="absolute bottom-1 w-1.5 h-1.5 bg-white/50 rounded-full"></span>
          )}
        </button>
      );
    }

    return cells;
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case 'water': return <Droplets size={16} className="text-cyan-500"/>;
      case 'protein': return <Dumbbell size={16} className="text-indigo-500"/>;
      case 'creatine': return <Zap size={16} className="text-yellow-500"/>;
      default: return <div className="w-4 h-4 rounded-full bg-gray-300"></div>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
       {/* Calendar Card */}
       <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
         <div className="flex justify-between items-center mb-6">
           <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
             <CalendarIcon size={24} className="text-indigo-600 dark:text-indigo-400"/> 
             Historial
           </h2>
           <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-lg p-1">
             <button onClick={prevMonth} className="p-1 hover:bg-white dark:hover:bg-gray-700 hover:shadow rounded-md transition-all text-gray-600 dark:text-gray-300">
               <ChevronLeft size={20} />
             </button>
             <span className="w-32 text-center font-medium text-gray-700 dark:text-gray-200">
               {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
             </span>
             <button onClick={nextMonth} className="p-1 hover:bg-white dark:hover:bg-gray-700 hover:shadow rounded-md transition-all text-gray-600 dark:text-gray-300">
               <ChevronRight size={20} />
             </button>
           </div>
         </div>

         {/* Weekday Headers */}
         <div className="grid grid-cols-7 mb-2 text-center">
           {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((d, i) => (
             <span key={i} className="text-xs font-semibold text-gray-400 dark:text-gray-500 py-2">{d}</span>
           ))}
         </div>

         {/* Days Grid */}
         <div className="grid grid-cols-7 place-items-center gap-y-1 md:gap-y-2">
           {renderCalendarCells()}
         </div>
       </div>

       {/* Daily Details */}
       <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
         <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4 border-b border-gray-100 dark:border-gray-800 pb-2">
           Resumen: {selectedDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
         </h3>

         {selectedDayLogs.length > 0 && (
           <div className="grid grid-cols-3 gap-4 mb-6">
             <div className="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-lg border border-indigo-100 dark:border-indigo-900/30 flex flex-col items-center justify-center">
               <span className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold mb-1">Proteína</span>
               <span className="text-lg font-bold text-gray-800 dark:text-gray-100">{totalProtein}g</span>
             </div>
             <div className="bg-cyan-50 dark:bg-cyan-900/20 p-3 rounded-lg border border-cyan-100 dark:border-cyan-900/30 flex flex-col items-center justify-center">
               <span className="text-xs text-cyan-600 dark:text-cyan-400 font-semibold mb-1">Agua</span>
               <span className="text-lg font-bold text-gray-800 dark:text-gray-100">{totalWaterL.toFixed(1)}L</span>
             </div>
             <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center">
               <span className="text-xs text-gray-500 dark:text-gray-400 font-semibold mb-1 text-center leading-tight">Stack Completo</span>
               <ProgressDial percent={stackPercent} size={40} />
             </div>
           </div>
         )}

         {groupedLogs.length === 0 ? (
           <div className="text-center py-8 text-gray-400 dark:text-gray-500">
             <p>No hay registros para este día.</p>
           </div>
         ) : (
           <div className="space-y-3">
             {groupedLogs.map((log, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
                  <div className="flex items-center gap-3">
                    <div className="bg-white dark:bg-gray-700 p-2 rounded-full shadow-sm">
                       {getIconForType(log.type)}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800 dark:text-gray-200">{log.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        {log.count > 1 ? `${log.count} tomas en el día` : '1 toma en el día'}
                      </p>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    {log.amount}{log.unit}
                  </span>
                </div>
              ))}
           </div>
         )}
       </div>

       {/* Weekly Trends */}
       <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
         <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-6 border-b border-gray-100 dark:border-gray-800 pb-2">
           Tendencias Semanales (Últimos 7 días)
         </h3>
         
         <div className="space-y-8">
           {/* Weight Evolution */}
           <div>
             <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-4 text-center">Evolución de Peso</h4>
             <div className="h-48 w-full">
               <ResponsiveContainer width="100%" height="100%">
                 <LineChart data={weeklyData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                   <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                   <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} stroke="#9ca3af" />
                   <YAxis domain={['dataMin - 1', 'dataMax + 1']} axisLine={false} tickLine={false} tick={{ fontSize: 12 }} stroke="#9ca3af" />
                   <Tooltip 
                     contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                     labelStyle={{ color: '#374151', fontWeight: 'bold' }}
                   />
                   <Line type="monotone" dataKey="weight" name="Peso (kg)" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 6 }} />
                 </LineChart>
               </ResponsiveContainer>
             </div>
           </div>

           {/* Macros Fulfillment */}
           <div>
             <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-4 text-center">Cumplimiento de Macros</h4>
             <div className="h-56 w-full">
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={weeklyData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                   <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                   <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} stroke="#9ca3af" />
                   <YAxis yAxisId="left" orientation="left" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} stroke="#9ca3af" />
                   <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} stroke="#9ca3af" />
                   <Tooltip 
                     contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                     cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                     labelStyle={{ color: '#374151', fontWeight: 'bold' }}
                   />
                   <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                   <Bar yAxisId="left" dataKey="protein" name="Proteína (g)" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={16} />
                   <Bar yAxisId="right" dataKey="waterL" name="Agua (L)" fill="#06b6d4" radius={[4, 4, 0, 0]} barSize={16} />
                 </BarChart>
               </ResponsiveContainer>
             </div>
           </div>
         </div>
       </div>
    </div>
  );
};

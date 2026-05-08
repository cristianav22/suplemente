
import React, { useState, useMemo } from 'react';
import { SupplementLog } from '../types';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Droplets, Dumbbell, Zap } from 'lucide-react';

interface Props {
  logs: SupplementLog[];
}

export const CalendarHistory: React.FC<Props> = ({ logs }) => {
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

  // Get data for the selected date
  const selectedDayLogs = useMemo(() => {
    return logs.filter(log => isSameDay(new Date(log.timestamp), selectedDate)).sort((a, b) => b.timestamp - a.timestamp);
  }, [logs, selectedDate]);

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
       <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
         <div className="flex justify-between items-center mb-6">
           <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
             <CalendarIcon size={24} className="text-indigo-600"/> 
             Historial
           </h2>
           <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-1">
             <button onClick={prevMonth} className="p-1 hover:bg-white hover:shadow rounded-md transition-all text-gray-600">
               <ChevronLeft size={20} />
             </button>
             <span className="w-32 text-center font-medium text-gray-700">
               {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
             </span>
             <button onClick={nextMonth} className="p-1 hover:bg-white hover:shadow rounded-md transition-all text-gray-600">
               <ChevronRight size={20} />
             </button>
           </div>
         </div>

         {/* Weekday Headers */}
         <div className="grid grid-cols-7 mb-2 text-center">
           {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((d, i) => (
             <span key={i} className="text-xs font-semibold text-gray-400 py-2">{d}</span>
           ))}
         </div>

         {/* Days Grid */}
         <div className="grid grid-cols-7 place-items-center gap-y-1 md:gap-y-2">
           {renderCalendarCells()}
         </div>
       </div>

       {/* Daily Details */}
       <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
         <h3 className="text-lg font-bold text-gray-800 mb-4 border-b border-gray-100 pb-2">
           Resumen: {selectedDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
         </h3>

         {selectedDayLogs.length === 0 ? (
           <div className="text-center py-8 text-gray-400">
             <p>No hay registros para este día.</p>
           </div>
         ) : (
           <div className="space-y-3">
             {selectedDayLogs.map(log => (
               <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                 <div className="flex items-center gap-3">
                   <div className="bg-white p-2 rounded-full shadow-sm">
                      {getIconForType(log.type)}
                   </div>
                   <div>
                     <p className="font-semibold text-gray-800">{log.name}</p>
                     <p className="text-xs text-gray-500 flex items-center gap-1">
                       <Clock size={12} />
                       {new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                     </p>
                   </div>
                 </div>
                 <span className="font-mono font-bold text-indigo-600">
                   {log.amount}{log.unit}
                 </span>
               </div>
             ))}
           </div>
         )}
       </div>
    </div>
  );
};

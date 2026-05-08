
import React, { useMemo, useState } from 'react';
import { UserProfile, SupplementLog, DailyTargets, AVAILABLE_SUPPLEMENTS, SupplementInfo } from '../types';
import { Droplets, Dumbbell, Zap, Check, Sparkles, Utensils, GlassWater, Plus, Moon } from 'lucide-react';
import { getDailyAnalysis, estimateFoodProtein } from '../services/geminiService';

interface Props {
  profile: UserProfile;
  logs: SupplementLog[];
  targets: DailyTargets;
  onAddLog: (log: Omit<SupplementLog, 'id' | 'timestamp'>) => void;
}

export const Dashboard = ({ profile, logs, targets, onAddLog }: Props) => {
  const [aiAnalysis, setAiAnalysis] = useState<string>("");
  const [loadingAi, setLoadingAi] = useState(false);

  
  // Protein Widget State
  const [proteinMode, setProteinMode] = useState<'grams' | 'food'>('grams');
  const [proteinInput, setProteinInput] = useState("");
  const [foodInput, setFoodInput] = useState("");
  const [estimatingProtein, setEstimatingProtein] = useState(false);

  // Sleep Widget State
  const [sleepInput, setSleepInput] = useState("");

  // Merge built-in and custom supplements for lookup
  const allSupplements = useMemo(() => {
    return [...AVAILABLE_SUPPLEMENTS, ...(profile.customSupplements || [])];
  }, [profile.customSupplements]);

  // --- Calculations ---
  
  const todaysLogs = useMemo(() => {
    const today = new Date().setHours(0, 0, 0, 0);
    return logs.filter(l => l.timestamp >= today);
  }, [logs]);
  

  const totals = useMemo(() => {
    const protein = todaysLogs
      .filter(l => l.type === 'protein')
      .reduce((acc, curr) => acc + curr.amount, 0);
      
    const creatine = todaysLogs
      .filter(l => l.type === 'creatine')
      .reduce((acc, curr) => acc + curr.amount, 0);

    const waterMl = todaysLogs
      .filter(l => l.type === 'water')
      .reduce((acc, curr) => acc + curr.amount, 0);

    const sleep = todaysLogs
      .filter(l => l.type === 'sleep')
      .reduce((acc, curr) => acc + curr.amount, 0);

    return { protein, creatine, waterMl, sleep };
  }, [todaysLogs]);  

  // Water Logic (Glasses)
  const glassSize = 200; // ml
  const recommendedWaterL = useMemo(() => {
    let base = targets.water;
    if (totals.creatine > 0) base += 0.5;
    return parseFloat(base.toFixed(1));
  }, [targets.water, totals.creatine]);
  const proteinPercent = Math.min(
    100,
    targets.protein > 0 ? (totals.protein / targets.protein) * 100 : 0
  );

  const waterPercent = Math.min(
    100,
    recommendedWaterL > 0 ? ((totals.waterMl / 1000) / recommendedWaterL) * 100 : 0
  );

  const sleepPercent = Math.min(
    100,
    targets.sleep > 0 ? (totals.sleep / targets.sleep) * 100 : 0
  );

  const dailyScore = Math.round(
    (proteinPercent + waterPercent + sleepPercent) / 3
  );

  const totalGlassesTarget = Math.ceil((recommendedWaterL * 1000) / glassSize);
  const glassesConsumed = Math.floor(totals.waterMl / glassSize);
  const glassesRemaining = Math.max(0, totalGlassesTarget - glassesConsumed);

  // --- Actions ---

  const handleGetAnalysis = async () => {
    setLoadingAi(true);
    const analysis = await getDailyAnalysis(profile, todaysLogs, { ...targets, water: recommendedWaterL });
    setAiAnalysis(analysis);
    setLoadingAi(false);
  };

  const addWaterGlass = () => {
    onAddLog({
      name: 'Agua',
      type: 'water',
      amount: glassSize,
      unit: 'ml'
    });
  };

  const toggleCreatine = () => {
    // Only allow adding, not removing via this simple toggle (simplifies logic)
    if (totals.creatine > 0) return; 

    const creatSupp = allSupplements.find(s => s.id === 'creat');
    if (creatSupp) {
      onAddLog({
        name: creatSupp.name,
        type: creatSupp.type,
        amount: creatSupp.defaultAmount,
        unit: creatSupp.defaultUnit
      });
    }
  };

  const handleAddSleep = () => {
    const hours = parseFloat(sleepInput);
    if (hours > 0) {
      onAddLog({
        name: 'Sueño',
        type: 'sleep',
        amount: hours,
        unit: 'h'
      });
      setSleepInput("");
    }
  };

  const handleProteinSubmit = async () => {
    if (proteinMode === 'grams') {
      const amount = parseFloat(proteinInput);
      if (amount > 0) {
        onAddLog({
          name: 'Proteína (Manual)',
          type: 'protein',
          amount,
          unit: 'g'
        });
        setProteinInput("");
      }
    } else {
      if (!foodInput) return;
      setEstimatingProtein(true);
      const estimated = await estimateFoodProtein(foodInput);
      setEstimatingProtein(false);
      
      if (estimated > 0) {
        const confirm = window.confirm(`Estimamos ${estimated}g de proteína para "${foodInput}". ¿Registrar?`);
        if (confirm) {
          onAddLog({
            name: `Comida: ${foodInput}`,
            type: 'protein',
            amount: estimated,
            unit: 'g'
          });
          setFoodInput("");
        }
      } else {
        alert("No pudimos estimar la proteína. Intenta ingresarlo manualmente.");
      }
    }
  };

  const handleGenericAdd = (suppId: string) => {
    const supp = allSupplements.find(s => s.id === suppId);
    if (supp) {
      onAddLog({
        name: supp.name,
        type: supp.type,
        amount: supp.defaultAmount,
        unit: supp.defaultUnit
      });
    }
  };

  // --- Render Widgets ---

  const renderActiveStack = () => {
    const activeIds = profile.activeSupplements || [];
    
    // Sort to put Protein and Creatine first if they exist
    const sortedStack = [...activeIds].sort((a, b) => {
      if (a === 'prot') return -1;
      if (b === 'prot') return 1;
      if (a === 'creat') return -1;
      if (b === 'creat') return 1;
      return 0;
    });

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* --- RESUMEN CON MÉTRICAS --- */}
        <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl md:col-span-2 lg:col-span-3">
        <h2 className="text-indigo-800 font-bold text-lg mb-3">Resumen de hoy</h2>

      {/* SCORE */}
      <div className="mb-4">
        <div className="text-sm text-indigo-700 mb-1">
        <div className="flex items-center justify-between">
          <div className="text-sm text-indigo-700">Score diario</div>
          <ProgressDial percent={dailyScore} />
        </div>
        </div>
      
      

      <div className="flex justify-between mt-4">

      <div className="flex flex-col items-center">
        <ProgressDial percent={proteinPercent} size={60} />
        <span className="text-xs mt-1 text-gray-600">Proteína</span>
      </div>

      <div className="flex flex-col items-center">
        <ProgressDial percent={waterPercent} size={60} />
        <span className="text-xs mt-1 text-gray-600">Agua</span>
      </div>

      <div className="flex flex-col items-center">
        <ProgressDial percent={sleepPercent} size={60} />
        <span className="text-xs mt-1 text-gray-600">Sueño</span>
      </div>

  </div>
      
  </div>

  {/* PROTEINA */}
  <div className="mb-3">
    <div className="text-sm text-indigo-700 mb-1">
      Proteína: {Math.round(proteinPercent)}%
    </div>
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div 
        className={`${getProgressColor(proteinPercent)} h-2 rounded-full`}
        style={{ width: `${proteinPercent}%` }}
      />
    </div>
  </div>

  {/* AGUA */}
  <div className="mb-3">
    <div className="text-sm text-indigo-700 mb-1">
      Hidratación: {Math.round(waterPercent)}%
    </div>
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div 
        className={`${getProgressColor(waterPercent)} h-2 rounded-full`}
        style={{ width: `${waterPercent}%` }}
      />
    </div>
  </div>

  {/* SUEÑO */}
  <div>
    <div className="text-sm text-indigo-700 mb-1">
      Sueño: {Math.round(sleepPercent)}%
    </div>
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div 
        className={`${getProgressColor(sleepPercent)} h-2 rounded-full`}
        style={{ width: `${sleepPercent}%` }}
      />
    </div>
  </div>
</div>
        {/* --- RESUMEN SIMPLE --- */}
      <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl md:col-span-2 lg:col-span-3">
        <h2 className="text-indigo-800 font-bold text-lg mb-1">Resumen de hoy</h2>
        <div className="text-sm text-indigo-700">
       Registros: {todaysLogs.length}
        </div>
        <div className="text-sm text-indigo-700">
        Proteína: {totals.protein}g / {targets.protein}g
        </div>
        <div className="text-sm text-indigo-700">
        Agua: {(totals.waterMl / 1000).toFixed(1)}L / {recommendedWaterL}L
        </div>
      </div>
        
        {/* WATER TRACKER (Always visible) */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-cyan-100 md:col-span-2 lg:col-span-1 relative overflow-hidden">
          <div className="flex justify-between items-start mb-4">
             <div>
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                  <Droplets className="text-cyan-500" size={20}/> Hidratación
                </h3>
                <div className="text-xs text-gray-500 mt-1">Meta: {recommendedWaterL}L ({totalGlassesTarget} vasos)</div>
             </div>
             <div className="text-right">
               <span className="text-2xl font-bold text-cyan-600">{glassesConsumed}</span>
               <span className="text-sm text-gray-400"> / {totalGlassesTarget}</span>
             </div>
          </div>
          
          <div className="flex flex-wrap gap-2 mb-4">
            {Array.from({ length: totalGlassesTarget }).map((_, i) => (
              <div 
                key={i} 
                className={`w-6 h-8 rounded-sm border flex items-end justify-center overflow-hidden transition-all ${
                  i < glassesConsumed ? 'border-cyan-500 bg-cyan-100' : 'border-gray-200 bg-gray-50'
                }`}
              >
                {i < glassesConsumed && <div className="w-full bg-cyan-400 h-full opacity-60"></div>}
              </div>
            ))}
          </div>

          <button 
            onClick={addWaterGlass}
            className="w-full bg-cyan-50 hover:bg-cyan-100 text-cyan-700 font-medium py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            <Plus size={16} /> Agregar Vaso (200cc)
          </button>
          
          {glassesRemaining > 0 && (
            <div className="text-center text-xs text-gray-400 mt-2">
              Faltan {glassesRemaining} vasos para tu meta
            </div>
          )}
        </div>

        {/* SLEEP WIDGET (Always visible) */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-indigo-900/10 md:col-span-1 relative overflow-hidden">
             <div className="flex justify-between items-start mb-4">
                <div>
                   <h3 className="font-bold text-gray-800 flex items-center gap-2">
                     <Moon className="text-indigo-900" size={20}/> Sueño
                   </h3>
                   <div className="text-xs text-gray-500 mt-1">Meta: {targets.sleep}h</div>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-indigo-900">{totals.sleep}h</span>
                </div>
             </div>

             <div className="w-full bg-gray-100 rounded-full h-2.5 mb-4">
               <div 
                 className="bg-indigo-900 h-2.5 rounded-full" 
                 style={{ width: `${Math.min(100, (totals.sleep / targets.sleep) * 100)}%` }}
               ></div>
             </div>

             <div className="flex gap-2">
                <input 
                  type="number" 
                  step="0.5"
                  placeholder="Horas..."
                  value={sleepInput}
                  onChange={(e) => setSleepInput(e.target.value)}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-500 text-sm"
                />
                <button 
                  onClick={handleAddSleep}
                  className="bg-indigo-900 hover:bg-indigo-800 text-white px-3 py-2 rounded-lg transition-colors"
                >
                  <Plus size={18} />
                </button>
             </div>
          </div>

        {/* Dynamic Supplements from Profile */}
        {sortedStack.map(suppId => {
          const supp = allSupplements.find(s => s.id === suppId);
          if (!supp) return null;

          // PROTEIN WIDGET
          if (suppId === 'prot') {
            const proteinLeft = Math.max(0, targets.protein - totals.protein);
            
            return (
              <div key={suppId} className="bg-white p-5 rounded-xl shadow-sm border border-indigo-100 md:col-span-2 lg:col-span-2">
                 <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        <Dumbbell className="text-indigo-500" size={20}/> Proteína
                      </h3>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-2xl font-bold text-indigo-600">{totals.protein}g</span>
                        <span className="text-sm text-gray-400">/ {targets.protein}g meta</span>
                      </div>
                    </div>
                    {totals.protein >= targets.protein && (
                      <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-bold">Meta Cumplida</span>
                    )}
                 </div>

                 {/* Input Tabs */}
                 <div className="bg-gray-50 p-1 rounded-lg flex text-sm mb-3">
                   <button 
                     onClick={() => setProteinMode('grams')}
                     className={`flex-1 py-1.5 rounded-md transition-all ${proteinMode === 'grams' ? 'bg-white shadow text-indigo-600 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
                   >
                     Manual (g)
                   </button>
                   <button 
                     onClick={() => setProteinMode('food')}
                     className={`flex-1 py-1.5 rounded-md transition-all ${proteinMode === 'food' ? 'bg-white shadow text-indigo-600 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
                   >
                     Comida (IA)
                   </button>
                 </div>

                 <div className="flex gap-2">
                   {proteinMode === 'grams' ? (
                     <input 
                       type="number" 
                       placeholder="Gramos..."
                       value={proteinInput}
                       onChange={(e) => setProteinInput(e.target.value)}
                       className="flex-1 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-500"
                     />
                   ) : (
                     <input 
                       type="text" 
                       placeholder="Ej: 2 huevos y pan"
                       value={foodInput}
                       onChange={(e) => setFoodInput(e.target.value)}
                       className="flex-1 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-500"
                     />
                   )}
                   <button 
                     onClick={handleProteinSubmit}
                     disabled={estimatingProtein}
                     className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 rounded-lg font-medium transition-colors disabled:bg-indigo-300"
                   >
                     {estimatingProtein ? <Sparkles className="animate-spin" size={18}/> : <Plus size={20} />}
                   </button>
                 </div>
                 {proteinLeft > 0 && (
                   <div className="text-xs text-gray-400 mt-2">Te faltan {proteinLeft}g. ¡Sigue así!</div>
                 )}
              </div>
            );
          }

          // CREATINE WIDGET
          if (suppId === 'creat') {
            const hasTaken = totals.creatine > 0;
            return (
              <div key={suppId} className={`p-5 rounded-xl shadow-sm border transition-all ${hasTaken ? 'bg-green-50 border-green-200' : 'bg-white border-gray-100'}`}>
                <div className="flex justify-between items-start">
                   <h3 className="font-bold text-gray-800 flex items-center gap-2">
                     <Zap className={hasTaken ? "text-green-500" : "text-yellow-500"} size={20}/> Creatina
                   </h3>
                   {hasTaken && <Check className="text-green-600" size={24} />}
                </div>
                
                <div className="text-sm text-gray-500 mt-2 mb-4">
                  {hasTaken 
                    ? "¡Excelente! Has cumplido con tu creatina hoy." 
                    : "No olvides tu dosis diaria para mantener la saturación."}
                </div>

                {!hasTaken ? (
                  <button 
                    onClick={toggleCreatine}
                    className="w-full bg-yellow-50 hover:bg-yellow-100 text-yellow-700 border border-yellow-200 font-medium py-2 rounded-lg flex items-center justify-center gap-2"
                  >
                    Hoy consumí Creatina ({supp.defaultAmount}g)
                  </button>
                ) : (
                  <div className="text-xs text-green-700 bg-green-100/50 p-2 rounded">
                    Recuerda: Tu meta de agua aumentó hoy.
                  </div>
                )}
              </div>
            );
          }

          // GENERIC WIDGET (Magnesium, Omega 3, Custom, etc)
          const isTaken = todaysLogs.some(l => l.name === supp.name && l.type === supp.type);
          const isCustom = suppId.startsWith('custom-');
          
          return (
            <div key={suppId} className={`p-5 rounded-xl shadow-sm border transition-all ${isTaken ? 'bg-gray-50 border-gray-200 opacity-75' : 'bg-white border-gray-100'} ${isCustom ? 'border-indigo-100' : ''}`}>
              <div className="flex justify-between items-start mb-2">
                 <div>
                   <h3 className="font-bold text-gray-800">{supp.name}</h3>
                   {isCustom && <span className="text-[10px] text-indigo-500 bg-indigo-50 px-1 rounded">Personalizado</span>}
                 </div>
                 {isTaken && <Check className="text-green-600" size={20} />}
              </div>
              <p className="text-xs text-gray-500 mb-4">{supp.defaultAmount}{supp.defaultUnit} - {supp.description}</p>
              
              {!isTaken ? (
                <button 
                  onClick={() => handleGenericAdd(suppId)}
                  className="w-full border border-gray-200 hover:bg-gray-50 text-gray-600 font-medium py-2 rounded-lg text-sm"
                >
                  Registrar toma
                </button>
              ) : (
                <div className="w-full text-center text-xs font-semibold text-green-600 py-2">
                  Registrado ✓
                </div>
              )}
            </div>
          );
        })}

        {/* AI Insight Card (Always visible at bottom or end) */}
        <div className="bg-gradient-to-br from-purple-50 to-white p-5 rounded-xl shadow-sm border border-purple-100 md:col-span-2 lg:col-span-3">
          <div className="flex justify-between items-center mb-3">
             <div className="flex items-center gap-2">
                <Sparkles size={20} className="text-purple-500" />
                <h3 className="font-bold text-gray-800">Coach IA - Análisis Diario</h3>
             </div>
             {!aiAnalysis && (
               <button 
                 onClick={handleGetAnalysis} 
                 disabled={loadingAi}
                 className="text-xs bg-purple-600 hover:bg-purple-700 text-white px-4 py-1.5 rounded-full transition-colors shadow-sm"
               >
                 {loadingAi ? "Analizando..." : "Analizar mi día"}
               </button>
             )}
          </div>
          <div className="text-sm text-gray-600 min-h-[40px]">
            {loadingAi ? (
               <div className="animate-pulse flex space-x-4">
                 <div className="flex-1 space-y-2 py-1">
                   <div className="h-2 bg-purple-200 rounded"></div>
                   <div className="h-2 bg-purple-200 rounded w-5/6"></div>
                 </div>
               </div>
            ) : aiAnalysis ? (
              <div className="italic border-l-4 border-purple-300 pl-3">"{aiAnalysis}"</div>
            ) : (
              <p>Presiona analizar para recibir feedback sobre tu hidratación y macros de hoy.</p>
            )}
          </div>
        </div>

      </div>
    );
  };

  const getProgressColor = (percent: number) => {
  if (percent < 40) return "bg-red-500";
  if (percent < 70) return "bg-yellow-400";
  return "bg-green-500";
};

  //Dial para mostrar progreso diario general (proteína, agua, sueño) con colores de alerta y mensajes motivacionales. Luego widgets individuales para cada uno con inputs rápidos y recomendaciones personalizadas.
  const ProgressDial = ({ percent, size = 80 }: { percent: number; size?: number }) => {
  const stroke = size * 0.1;
  const radius = size / 2;
  const normalizedRadius = radius - stroke / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset =
    circumference - (percent / 100) * circumference;

  const color =
    percent < 40 ? "#ef4444" :
    percent < 70 ? "#facc15" :
    "#22c55e";

  return (
    <div className="relative flex items-center justify-center">
      <svg height={size} width={size}>
        <circle
          stroke="#e5e7eb"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          stroke={color}
          fill="transparent"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          style={{ strokeDashoffset }}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
      </svg>

      <div className="absolute text-xs font-bold text-gray-700">
        {Math.round(percent)}%
      </div>
    </div>
  );
};

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
        <h1 className="text-2xl font-bold mb-2">Hola, {profile.name} 👋</h1>
        <p className="opacity-90">Administra tu stack diario.</p>
      </div>

      {renderActiveStack()}
    </div>
  );
};

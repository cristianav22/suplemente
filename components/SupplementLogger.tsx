
import React, { useState, useMemo } from 'react';
import { SupplementInfo, UserProfile, SupplementLog, AVAILABLE_SUPPLEMENTS } from '../types';
import { Plus, Info, Check, Sparkles, AlertTriangle } from 'lucide-react';
import { getComplementaryAdvice } from '../services/geminiService';

interface Props {
  onAddLog: (log: Omit<SupplementLog, 'id' | 'timestamp'>) => void;
  userProfile: UserProfile;
}

export const SupplementLogger: React.FC<Props> = ({ onAddLog, userProfile }) => {
  const [selectedSupp, setSelectedSupp] = useState<SupplementInfo | null>(null);
  const [amount, setAmount] = useState<number>(0);
  const [advice, setAdvice] = useState<string | null>(null);
  const [loadingAdvice, setLoadingAdvice] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Combine built-in and custom supplements for display
  const allSupplements = useMemo(() => {
    return [...AVAILABLE_SUPPLEMENTS, ...(userProfile.customSupplements || [])];
  }, [userProfile.customSupplements]);

  const handleSelect = (supp: SupplementInfo) => {
    setSelectedSupp(supp);
    setAmount(supp.defaultAmount);
    setAdvice(null);
    setShowSuccess(false);
  };

  const handleAdd = () => {
    if (selectedSupp) {
      onAddLog({
        name: selectedSupp.name,
        type: selectedSupp.type,
        amount: amount,
        unit: selectedSupp.defaultUnit
      });
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }
  };

  const fetchAdvice = async () => {
    if (!selectedSupp) return;
    setLoadingAdvice(true);
    const text = await getComplementaryAdvice(selectedSupp.name, userProfile);
    setAdvice(text);
    setLoadingAdvice(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Selection Area */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold mb-4 text-gray-800">Registrar Ingesta</h2>
        <div className="grid grid-cols-2 gap-3 mb-6">
          {allSupplements.map((supp) => {
             // Optional: Highlight supplements selected in profile
             const isPreferred = (userProfile.activeSupplements || []).includes(supp.id);
             const isCustom = supp.id.startsWith('custom-');
             
             return (
              <button
                key={supp.id}
                onClick={() => handleSelect(supp)}
                className={`p-3 rounded-lg text-left transition-all border relative ${
                  selectedSupp?.id === supp.id
                    ? 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500'
                    : isPreferred 
                       ? 'bg-gray-50 border-indigo-100' // Subtle highlight for preferred
                       : 'bg-gray-50 border-transparent hover:bg-gray-100'
                }`}
              >
                {isPreferred && <div className="absolute top-1 right-1 w-2 h-2 bg-indigo-400 rounded-full"></div>}
                <span className="block font-medium text-gray-900 truncate pr-2">
                  {supp.name}
                  {isCustom && <span className="ml-1 text-[9px] bg-purple-100 text-purple-700 px-1 rounded">IA</span>}
                </span>
                <span className="text-xs text-gray-500">{supp.defaultAmount}{supp.defaultUnit}</span>
              </button>
            );
          })}
        </div>

        {selectedSupp && (
          <div className="animate-fade-in space-y-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
             <div className="flex justify-between items-center">
                <label className="font-medium text-gray-700">Cantidad ({selectedSupp.defaultUnit})</label>
                <div className="flex items-center gap-3">
                   <button 
                     onClick={() => setAmount(prev => Math.max(0, prev - (selectedSupp.defaultAmount / 2)))}
                     className="w-8 h-8 rounded-full bg-white border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50"
                   >-</button>
                   <span className="w-16 text-center font-bold text-lg">{amount}</span>
                   <button 
                     onClick={() => setAmount(prev => prev + (selectedSupp.defaultAmount / 2))}
                     className="w-8 h-8 rounded-full bg-white border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50"
                   >+</button>
                </div>
             </div>

             <button
               onClick={handleAdd}
               className={`w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${
                 showSuccess 
                   ? 'bg-green-500 text-white'
                   : 'bg-indigo-600 text-white hover:bg-indigo-700'
               }`}
             >
               {showSuccess ? (
                 <><Check size={20}/> Registrado</>
               ) : (
                 <><Plus size={20}/> Agregar al Registro</>
               )}
             </button>
          </div>
        )}
      </div>

      {/* Info / Advice Area */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-4 text-indigo-600">
          <Info size={24} />
          <h2 className="text-xl font-bold">Información y Complementos</h2>
        </div>
        
        {!selectedSupp ? (
          <div className="h-48 flex items-center justify-center text-gray-400 text-sm text-center px-8">
            Selecciona un suplemento para ver detalles y recomendaciones personalizadas.
          </div>
        ) : (
          <div className="space-y-4">
             {selectedSupp.riskLevel === 'high' && (
              <div className="bg-red-50 p-3 rounded-lg border border-red-200 text-sm text-red-800 flex gap-2">
                <AlertTriangle className="shrink-0" size={18} />
                <strong>Atención Profesional Requerida:</strong> Este suplemento tiene fuertes efectos fisiológicos. Asegúrate de que su uso esté supervisado por un especialista.
              </div>
            )}
            
            <p className="text-gray-600">{selectedSupp.description}</p>
            
            {!advice ? (
              <button
                onClick={fetchAdvice}
                disabled={loadingAdvice}
                className="text-sm text-indigo-600 font-medium hover:text-indigo-800 underline decoration-indigo-200 underline-offset-4"
              >
                {loadingAdvice ? "Consultando a Gemini..." : "¿Qué complementa bien a esto? (Preguntar a IA)"}
              </button>
            ) : (
              <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100 text-sm text-gray-700">
                 <h4 className="font-semibold text-indigo-800 mb-2 flex items-center gap-2">
                   <Sparkles size={14} /> Recomendación de Gemini
                 </h4>
                 <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-line">
                   {advice}
                 </div>
              </div>
            )}

            {/* Hardcoded specific logic */}
            {selectedSupp.type === 'creatine' && (
              <div className="bg-cyan-50 p-3 rounded-lg border border-cyan-100 text-sm text-cyan-800">
                <strong>💧 Recordatorio de Hidratación:</strong> Para tu peso de {userProfile.weight}kg, deberías consumir al menos {((userProfile.weight * 0.035) + 0.5).toFixed(1)}L de agua hoy si tomas creatina.
              </div>
            )}
             {selectedSupp.type === 'protein' && (
              <div className="bg-orange-50 p-3 rounded-lg border border-orange-100 text-sm text-orange-800">
                <strong>🥩 Tip de Proteína:</strong> Recuerda distribuir tu ingesta a lo largo del día para maximizar la absorción.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

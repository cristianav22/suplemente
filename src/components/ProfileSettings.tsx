
import { useState, useEffect } from 'react';
import { UserProfile, Goal, ActivityLevel, AVAILABLE_SUPPLEMENTS, SupplementInfo } from '../types';
import { Save, User, AlertTriangle, Info, CheckCircle, X, Search, Sparkles, Plus, Moon, Sun } from 'lucide-react';
import { getSupplementSafetyInfo, analyzeCustomSupplement } from '../services/geminiService';



interface Props {
  profile: UserProfile;
  onSave: (profile: UserProfile) => void;
  darkMode: boolean;
  setDarkMode: React.Dispatch<React.SetStateAction<boolean>>;
}

export const ProfileSettings: React.FC<Props> = ({ profile, onSave, darkMode,
  setDarkMode }) => {
  const [formData, setFormData] = useState<UserProfile>(profile);
  const [safetyInfo, setSafetyInfo] = useState<{name: string, info: string} | null>(null);
  const [loadingInfo, setLoadingInfo] = useState(false);
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

    
  // Custom Supplement State
  const [customSearch, setCustomSearch] = useState("");
  const [analyzingCustom, setAnalyzingCustom] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const toggleSupplement = (id: string) => {
    const current = formData.activeSupplements || [];
    const updated = current.includes(id)
      ? current.filter(item => item !== id)
      : [...current, id];
    setFormData({ ...formData, activeSupplements: updated });
  };

  const handleGetSafetyInfo = async (e: React.MouseEvent, name: string) => {
    e.preventDefault(); // prevent form submit if inside form
    e.stopPropagation(); // prevent checkbox toggle
    setLoadingInfo(true);
    setSafetyInfo({ name, info: "Consultando especialista IA..." });
    
    const info = await getSupplementSafetyInfo(name);
    setSafetyInfo({ name, info });
    setLoadingInfo(false);
  };

  const handleAddCustomSupplement = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!customSearch.trim()) return;

    setAnalyzingCustom(true);
    const newSupp = await analyzeCustomSupplement(customSearch);
    setAnalyzingCustom(false);

    if (newSupp) {
      setFormData(prev => ({
        ...prev,
        customSupplements: [...(prev.customSupplements || []), newSupp],
        activeSupplements: [...(prev.activeSupplements || []), newSupp.id]
      }));
      setCustomSearch("");
    } else {
      alert("No pudimos analizar este suplemento. Intenta con otro nombre.");
    }
  };

  const removeCustomSupplement = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setFormData(prev => ({
      ...prev,
      customSupplements: (prev.customSupplements || []).filter(s => s.id !== id),
      activeSupplements: (prev.activeSupplements || []).filter(sid => sid !== id)
    }));
  };

  // Combine built-in and custom supplements for display
  const allSupplements = [
    ...AVAILABLE_SUPPLEMENTS,
    ...(formData.customSupplements || [])
  ];

  

  return (
    <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm border border-gray-100 relative">
      <div className="flex items-center gap-2 mb-6 text-indigo-600">
        <User size={24} />
        <h2 className="text-xl font-bold">Configuración de Perfil</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info Section */}
        <div className="space-y-4 border-b border-gray-100 pb-6">
          <h3 className="font-semibold text-gray-800 dark:text-white">Datos Personales</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Peso (kg)</label>
              <input
                type="number"
                required
                min="30"
                max="300"
                value={formData.weight}
                onChange={(e) => setFormData({ ...formData, weight: parseFloat(e.target.value) })}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Objetivo</label>
              <select
                value={formData.goal}
                onChange={(e) => setFormData({ ...formData, goal: e.target.value as Goal })}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="muscle">Ganar Músculo</option>
                <option value="weight_loss">Perder Peso</option>
                <option value="maintenance">Mantenimiento</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nivel de Actividad</label>
              <select
                value={formData.activityLevel}
                onChange={(e) => setFormData({ ...formData, activityLevel: e.target.value as ActivityLevel })}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="sedentary">Sedentario (Poco ejercicio)</option>
                <option value="moderate">Moderado (1-3 días/sem)</option>
                <option value="active">Activo (3-5 días/sem)</option>
                <option value="athlete">Atleta (6-7 días/sem)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Meta de Sueño (horas)</label>
              <input
                type="number"
                min="4"
                max="12"
                step="0.5"
                value={formData.sleepGoal || 8}
                onChange={(e) => setFormData({ ...formData, sleepGoal: parseFloat(e.target.value) })}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Supplement Stack Selection */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-gray-800 dark:text-white flex items-center gap-2">
              Mi Stack de Suplementos
              <span className="text-xs font-normal text-gray-500 dark:text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Selecciona los que usas</span>
            </h3>
          </div>

          {/* Add Custom Supplement Input */}
          <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
             <label className="block text-sm font-medium text-indigo-900 mb-2">
               ¿No encuentras tu suplemento?
             </label>
             <div className="flex gap-2">
               <input 
                 type="text" 
                 placeholder="Ej: Ashwagandha, Citrulina..." 
                 value={customSearch}
                 onChange={(e) => setCustomSearch(e.target.value)}
                 className="flex-1 px-4 py-2 rounded-lg border border-indigo-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
               />
               <button 
                 onClick={handleAddCustomSupplement}
                 disabled={analyzingCustom || !customSearch}
                 className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors"
               >
                 {analyzingCustom ? <Sparkles size={16} className="animate-spin" /> : <Search size={16} />}
                 {analyzingCustom ? "Investigando..." : "Investigar y Agregar"}
               </button>
             </div>
             <p className="text-xs text-indigo-600/70 mt-2">
               <Sparkles size={12} className="inline mr-1" />
               La IA analizará el prospecto, dosis y riesgos automáticamente.
             </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {allSupplements.map((supp) => {
              const isActive = (formData.activeSupplements || []).includes(supp.id);
              const isRisky = supp.riskLevel === 'high';
              const isMedium = supp.riskLevel === 'medium';
              const isCustom = supp.id.startsWith('custom-');
              
              let borderClass = "border-gray-200 dark:border-gray-700";
              if (isActive) borderClass = "border-indigo-500 bg-indigo-50";
              if (isActive && isRisky) borderClass = "border-red-500 bg-red-50";
              if (isActive && isMedium) borderClass = "border-orange-400 bg-orange-50";

              return (
                <div 
                  key={supp.id}
                  onClick={() => toggleSupplement(supp.id)}
                  className={`relative p-3 rounded-lg border-2 cursor-pointer transition-all ${borderClass} hover:shadow-md group`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <div className={`w-5 h-5 rounded border flex items-center justify-center ${isActive ? 'bg-indigo-600 border-indigo-600' : 'bg-white dark:bg-gray-900 border-gray-300'}`}>
                        {isActive && <CheckCircle size={14} className="text-white" />}
                      </div>
                      <div className="flex flex-col">
                        <span className={`font-medium leading-tight ${isRisky ? 'text-red-700' : 'text-gray-800 dark:text-white'}`}>
                          {supp.name}
                        </span>
                        {isCustom && <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 rounded-full w-fit mt-0.5">Personalizado</span>}
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                        {(isRisky || isMedium) && (
                          <button
                            onClick={(e) => handleGetSafetyInfo(e, supp.name)}
                            className="text-gray-400 hover:text-indigo-600 p-1"
                            title="Consultar seguridad"
                          >
                            <Info size={18} />
                          </button>
                        )}
                        {isCustom && (
                          <button
                             onClick={(e) => removeCustomSupplement(e, supp.id)}
                             className="text-gray-400 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                             title="Eliminar suplemento personalizado"
                          >
                            <X size={18} />
                          </button>
                        )}
                    </div>
                  </div>

                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-7">{supp.description}</p>
                  
                  {isRisky && (
                    <div className="mt-2 ml-7 flex items-start gap-1.5 text-xs text-red-600 font-semibold bg-red-100 p-2 rounded">
                      <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                      <span>Atención: Ingesta debe ser administrada por un profesional.</span>
                    </div>
                  )}
                   {isMedium && (
                    <div className="mt-2 ml-7 flex items-start gap-1.5 text-xs text-orange-700 font-semibold bg-orange-100 p-2 rounded">
                      <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                      <span>Consumir con moderación y cuidado.</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        {/* Toggle Dark Mode */}
<div className="mt-6 p-4 rounded-2xl border border-gray-200 dark:border-gray-700">
  <div className="flex items-center justify-between">

    <div className="flex items-center gap-3">

      {darkMode ? (
        <Moon className="text-indigo-400" size={22} />
      ) : (
        <Sun className="text-yellow-500" size={22} />
      )}

      <div>
        <p className="font-medium text-gray-800 dark:text-white">
          Tema
        </p>

        <p className="text-sm text-gray-500 dark:text-gray-400">
          Cambiar entre modo claro y oscuro
        </p>
      </div>

    </div>

    <button
      type="button"
      onClick={() => setDarkMode(!darkMode)}
      className={`w-14 h-8 flex items-center rounded-full p-1 transition-all ${
        darkMode
          ? 'bg-indigo-600 justify-end'
          : 'bg-gray-300 justify-start'
      }`}
    >
      <div className="w-6 h-6 bg-white dark:bg-gray-900 rounded-full shadow-md" />
    </button>

  </div>
</div>

        <button
          type="submit"
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <Save size={18} />
          
          Guardar Perfil
        </button>
      </form>

      {/* Safety Info Modal */}
      {safetyInfo && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/10 backdrop-blur-[1px] rounded-xl p-4">
          <div className="bg-white dark:bg-gray-900 p-5 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 max-w-sm w-full animate-fade-in">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <Info size={18} className="text-indigo-600" />
                Seguridad: {safetyInfo.name}
              </h4>
              <button 
                onClick={() => setSafetyInfo(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="text-sm text-gray-600 leading-relaxed max-h-60 overflow-y-auto">
               {loadingInfo ? (
                 <div className="flex gap-2 items-center text-gray-400">
                    <span className="animate-spin">⏳</span> Consultando IA...
                 </div>
               ) : (
                 <p>{safetyInfo.info}</p>
               )}
            </div>
            
            <button 
              onClick={() => setSafetyInfo(null)}
              className="mt-4 w-full bg-gray-100 hover:bg-gray-200 text-gray-800 dark:text-white text-sm font-semibold py-2 rounded"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

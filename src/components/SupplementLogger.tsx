
import React, { useState, useMemo } from 'react';
import { SupplementInfo, UserProfile, SupplementLog, AVAILABLE_SUPPLEMENTS } from '../types';
import { Plus, Info, Check, Sparkles, AlertTriangle, Camera } from 'lucide-react';
import { useRef } from 'react';
import { getComplementaryAdvice, analyzeFoodImage } from '../services/geminiService';

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
  
  const [analyzingImage, setAnalyzingImage] = useState(false);
  const [foodResult, setFoodResult] = useState<{ foodName: string; calories: number; protein: number; carbs: number; fat: number } | null>(null);

  
  const [hasCameraPermission, setHasCameraPermission] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setHasCameraPermission(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      }, 100);
    } catch (err) {
      console.error("Camera permission denied", err);
      alert("Se requieren permisos de cámara para esta función.");
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const base64Str = canvas.toDataURL('image/jpeg').split(',')[1];
        
        const stream = video.srcObject as MediaStream;
        stream?.getTracks().forEach(t => t.stop());
        setHasCameraPermission(false);
        
        setAnalyzingImage(true);
        setFoodResult(null);
        
        analyzeFoodImage(base64Str, 'image/jpeg').then(result => {
          setFoodResult(result);
          setAnalyzingImage(false);
          if (result) {
            setSelectedSupp({
              id: 'food-scan',
              name: result.foodName,
              defaultUnit: 'g (Proteína)',
              defaultAmount: result.protein,
              type: 'protein',
              description: `Calorías: ${result.calories} kcal | Carbs: ${result.carbs}g | Grasas: ${result.fat}g`,
              riskLevel: 'low'
            });
            setAmount(result.protein);
          }
        });
      }
    }
  };

  const cancelCamera = () => {
    if (videoRef.current) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream?.getTracks().forEach(t => t.stop());
    }
    setHasCameraPermission(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setAnalyzingImage(true);
    setFoodResult(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Str = (event.target?.result as string).split(',')[1];
      const result = await analyzeFoodImage(base64Str, file.type);
      setFoodResult(result);
      setAnalyzingImage(false);
      
      // Select a dummy supplement to show add UI
      if (result) {
        setSelectedSupp({
          id: 'food-scan',
          name: result.foodName,
          defaultUnit: 'g (Proteína)',
          defaultAmount: result.protein,
          type: 'protein',
          description: `Calorías: ${result.calories} kcal | Carbs: ${result.carbs}g | Grasas: ${result.fat}g`,
          riskLevel: 'low'
        });
        setAmount(result.protein);
      }
    };
    reader.readAsDataURL(file);
  };
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
      <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
        <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-100">Registrar Ingesta</h2>
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
                    ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-500 dark:border-indigo-400 ring-1 ring-indigo-500 dark:ring-indigo-400'
                    : isPreferred 
                       ? 'bg-gray-50 dark:bg-gray-800 border-indigo-100 dark:border-indigo-900' // Subtle highlight for preferred
                       : 'bg-gray-50 dark:bg-gray-800 border-transparent hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {isPreferred && <div className="absolute top-1 right-1 w-2 h-2 bg-indigo-400 rounded-full"></div>}
                <span className="block font-medium text-gray-900 dark:text-gray-100 truncate pr-2">
                  {supp.name}
                  {isCustom && <span className="ml-1 text-[9px] bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 px-1 rounded">IA</span>}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">{supp.defaultAmount}{supp.defaultUnit}</span>
              </button>
            );
          })}
        </div>

        {selectedSupp && (
          <div className="animate-fade-in space-y-4 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
             <div className="flex justify-between items-center">
                <label className="font-medium text-gray-700 dark:text-gray-300">Cantidad ({selectedSupp.defaultUnit})</label>
                <div className="flex items-center gap-3">
                   <button 
                     onClick={() => setAmount(prev => Math.max(0, prev - (selectedSupp.defaultAmount / 2)))}
                     className="w-8 h-8 rounded-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
                   >-</button>
                   <span className="w-16 text-center font-bold text-lg dark:text-white">{amount}</span>
                   <button 
                     onClick={() => setAmount(prev => prev + (selectedSupp.defaultAmount / 2))}
                     className="w-8 h-8 rounded-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
                   >+</button>
                </div>
             </div>

             <button
               onClick={handleAdd}
               className={`w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${
                 showSuccess 
                   ? 'bg-green-500 text-white'
                   : 'bg-indigo-600 text-white hover:bg-indigo-700 dark:hover:bg-indigo-500'
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
      <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2 mb-4 text-indigo-600 dark:text-indigo-400">
          <Info size={24} />
          <h2 className="text-xl font-bold dark:text-gray-100">Información y Complementos</h2>
        </div>
        
        {!selectedSupp ? (
          <div className="h-48 flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm text-center px-8">
            Selecciona un suplemento para ver detalles y recomendaciones personalizadas.
          </div>
        ) : (
          <div className="space-y-4">
             {selectedSupp.riskLevel === 'high' && (
              <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800 text-sm text-red-800 dark:text-red-400 flex gap-2">
                <AlertTriangle className="shrink-0" size={18} />
                <strong>Atención Profesional Requerida:</strong> Este suplemento tiene fuertes efectos fisiológicos. Asegúrate de que su uso esté supervisado por un especialista.
              </div>
            )}
            
            <p className="text-gray-600 dark:text-gray-300">{selectedSupp.description}</p>
            
            {!advice ? (
              <button
                onClick={fetchAdvice}
                disabled={loadingAdvice}
                className="text-sm text-indigo-600 dark:text-indigo-400 font-medium hover:text-indigo-800 dark:hover:text-indigo-300 underline decoration-indigo-200 dark:decoration-indigo-800 underline-offset-4"
              >
                {loadingAdvice ? "Consultando a Gemini..." : "¿Qué complementa bien a esto? (Preguntar a IA)"}
              </button>
            ) : (
              <div className="bg-indigo-50 dark:bg-indigo-950/30 p-4 rounded-lg border border-indigo-100 dark:border-indigo-900 text-sm text-gray-700 dark:text-gray-300">
                 <h4 className="font-semibold text-indigo-800 dark:text-indigo-400 mb-2 flex items-center gap-2">
                   <Sparkles size={14} /> Recomendación de Gemini
                 </h4>
                 <div className="prose prose-sm max-w-none text-gray-700 dark:text-gray-300 whitespace-pre-line">
                   {advice}
                 </div>
              </div>
            )}

            {/* Hardcoded specific logic */}
            {selectedSupp.type === 'creatine' && (
              <div className="bg-cyan-50 dark:bg-cyan-900/20 p-3 rounded-lg border border-cyan-100 dark:border-cyan-800 text-sm text-cyan-800 dark:text-cyan-400">
                <strong>💧 Recordatorio de Hidratación:</strong> Para tu peso de {userProfile.weight}kg, deberías consumir al menos {((userProfile.weight * 0.035) + 0.5).toFixed(1)}L de agua hoy si tomas creatina.
              </div>
            )}
             {selectedSupp.type === 'protein' && (
              <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg border border-orange-100 dark:border-orange-800 text-sm text-orange-800 dark:text-orange-400">
                <strong>🥩 Tip de Proteína:</strong> Recuerda distribuir tu ingesta a lo largo del día para maximizar la absorción.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};


import { UserProfile, SupplementLog, DailyTargets, SupplementInfo } from "../types";

export const getComplementaryAdvice = async (
  supplementName: string,
  userProfile: UserProfile
): Promise<string> => {
  try {
    const res = await fetch("/api/gemini/advice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ supplementName, userProfile })
    });
    if (!res.ok) throw new Error("Failed to fetch");
    const data = await res.json();
    return data.text || "No se pudo generar un consejo en este momento.";
  } catch (error) {
    console.error("Error fetching advice:", error);
    return "Error al conectar con el asistente de IA.";
  }
};

export const getDailyAnalysis = async (
  profile: UserProfile,
  logs: SupplementLog[],
  targets: DailyTargets
): Promise<string> => {
  try {
    const res = await fetch("/api/gemini/analysis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile, logs, targets })
    });
    if (!res.ok) throw new Error("Failed to fetch");
    const data = await res.json();
    return data.text || "Análisis no disponible.";
  } catch (error) {
    console.error("Gemini analysis error:", error);
    return "No pudimos analizar tus datos en este momento.";
  }
};

export const getSupplementSafetyInfo = async (
  supplementName: string
): Promise<string> => {
  try {
    const res = await fetch("/api/gemini/safety", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ supplementName })
    });
    if (!res.ok) throw new Error("Failed to fetch");
    const data = await res.json();
    return data.text || "Información de seguridad no disponible.";
  } catch (error) {
    console.error("Gemini safety info error:", error);
    return "Error consultando información de seguridad.";
  }
};

export const estimateFoodProtein = async (
  foodDescription: string
): Promise<number> => {
  try {
    const res = await fetch("/api/gemini/protein", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ foodDescription })
    });
    if (!res.ok) throw new Error("Failed to fetch");
    const data = await res.json();
    return data.grams || 0;
  } catch (error) {
    console.error("Protein estimation error:", error);
    return 0;
  }
};

export const analyzeCustomSupplement = async (
  name: string
): Promise<SupplementInfo | null> => {
  try {
    const res = await fetch("/api/gemini/custom", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name })
    });
    if (!res.ok) throw new Error("Failed to fetch");
    const data = await res.json();
    return data.customSupp || null;
  } catch (error) {
    console.error("Custom supplement analysis error:", error);
    return null;
  }
};


export const analyzeFoodImage = async (
  imageBase64: string,
  mimeType: string
): Promise<{ foodName: string; calories: number; protein: number; carbs: number; fat: number } | null> => {
  try {
    const res = await fetch("/api/gemini/analyze-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageBase64, mimeType })
    });
    if (!res.ok) throw new Error("Failed to fetch");
    const data = await res.json();
    return data;
  } catch (error) {
    console.error("Food image analysis error:", error);
    return null;
  }
};

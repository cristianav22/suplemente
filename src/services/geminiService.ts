
import { GoogleGenAI, Type } from "@google/genai";
import { UserProfile, SupplementLog, DailyTargets, SupplementInfo } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getComplementaryAdvice = async (
  supplementName: string,
  userProfile: UserProfile
): Promise<string> => {
  try {
    const prompt = `
      Actúa como un nutricionista deportivo experto.
      El usuario (${userProfile.weight}kg, objetivo: ${userProfile.goal}) está tomando ${supplementName}.
      
      1. ¿Qué otros suplementos o alimentos complementan bien (sinergia) a ${supplementName}?
      2. ¿Hay alguna contraindicación común o consejo de absorción?
      
      Responde en español, sé conciso (máximo 100 palabras) y usa formato markdown simple.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "No se pudo generar un consejo en este momento.";
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
    const logSummary = logs.map(l => `- ${l.name}: ${l.amount}${l.unit}`).join('\n');
    
    const prompt = `
      Analiza el registro de suplementos de hoy para este usuario:
      Perfil: ${profile.weight}kg, Objetivo: ${profile.goal}.
      Objetivos Calculados: Proteína ${targets.protein}g, Agua ${targets.water}L.
      
      Registro de hoy:
      ${logSummary}
      
      Proporciona un resumen breve y motivador (máximo 3 frases) sobre su progreso hoy y si falta algo crítico (especialmente hidratación si tomó creatina).
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Análisis no disponible.";
  } catch (error) {
    console.error("Gemini analysis error:", error);
    return "No pudimos analizar tus datos en este momento.";
  }
};

export const getSupplementSafetyInfo = async (
  supplementName: string
): Promise<string> => {
  try {
    const prompt = `
      Explica brevemente las precauciones de seguridad para el suplemento: "${supplementName}".
      
      Enfócate en:
      1. ¿Por qué requiere supervisión profesional o cuidado?
      2. Efectos secundarios principales (ej: presión arterial, riñones, insomnio).
      3. Contraindicaciones clave.

      Responde en Español. Máximo 80 palabras. Usa tono de advertencia médica amigable.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Información de seguridad no disponible.";
  } catch (error) {
    console.error("Gemini safety info error:", error);
    return "Error consultando información de seguridad.";
  }
};

export const estimateFoodProtein = async (
  foodDescription: string
): Promise<number> => {
  try {
    // Use structured JSON output for reliable number extraction
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Analiza la siguiente comida y estima la cantidad total de proteína en gramos: "${foodDescription}". Si no es comida o no puedes estimar, devuelve 0.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            grams: {
              type: Type.NUMBER,
              description: "Estimated protein amount in grams",
            },
          },
        },
      },
    });

    if (response.text) {
      const data = JSON.parse(response.text);
      return data.grams || 0;
    }
    return 0;
  } catch (error) {
    console.error("Protein estimation error:", error);
    return 0;
  }
};

export const analyzeCustomSupplement = async (
  name: string
): Promise<SupplementInfo | null> => {
  try {
    const prompt = `
      Genera información técnica para el suplemento deportivo: "${name}".
      Actúa como un prospecto médico/deportivo.
      
      Devuelve un JSON con:
      - name: Nombre oficial (capitalizado)
      - defaultAmount: Dosis recomendada estándar (número)
      - defaultUnit: Unidad de medida (mg, g, ml, scoop, caps)
      - description: Breve descripción de para qué sirve y cuidados principales (Max 15 palabras).
      - riskLevel: 'low', 'medium', o 'high' basado en seguridad general.
      - type: 'other' (o una categoría genérica).
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            defaultAmount: { type: Type.NUMBER },
            defaultUnit: { type: Type.STRING },
            description: { type: Type.STRING },
            riskLevel: { type: Type.STRING, enum: ['low', 'medium', 'high'] },
            type: { type: Type.STRING }
          },
          required: ["name", "defaultAmount", "defaultUnit", "description", "riskLevel"]
        }
      }
    });

    if (response.text) {
      const data = JSON.parse(response.text);
      return {
        id: `custom-${Date.now()}`,
        name: data.name,
        defaultAmount: data.defaultAmount,
        defaultUnit: data.defaultUnit,
        description: data.description,
        riskLevel: data.riskLevel as 'low' | 'medium' | 'high',
        type: data.type || 'other'
      };
    }
    return null;
  } catch (error) {
    console.error("Custom supplement analysis error:", error);
    return null;
  }
};

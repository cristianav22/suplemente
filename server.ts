import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes FIRST
  app.post("/api/gemini/advice", async (req, res) => {
    try {
      const { supplementName, userProfile } = req.body;
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
      res.json({ text: response.text });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to generate advice" });
    }
  });

  app.post("/api/gemini/analysis", async (req, res) => {
    try {
      const { profile, logs, targets } = req.body;
      const logSummary = logs.map((l: any) => `- ${l.name}: ${l.amount}${l.unit}`).join('\n');
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
      res.json({ text: response.text });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to generate analysis" });
    }
  });

  app.post("/api/gemini/safety", async (req, res) => {
    try {
      const { supplementName } = req.body;
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
      res.json({ text: response.text });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to generate safety info" });
    }
  });

  app.post("/api/gemini/protein", async (req, res) => {
    try {
      const { foodDescription } = req.body;
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
      let grams = 0;
      if (response.text) {
        const data = JSON.parse(response.text);
        grams = data.grams || 0;
      }
      res.json({ grams });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to estimate protein" });
    }
  });

  
  app.post("/api/gemini/analyze-image", async (req, res) => {
    try {
      const { imageBase64, mimeType } = req.body;
      
      const prompt = `
        Analiza esta imagen de comida. Identifica qué es y estima sus valores nutricionales.
        Devuelve un JSON con:
        - foodName: Nombre de la comida (ej. "Ensalada César con pollo")
        - calories: Número estimado de calorías (kcal)
        - protein: Gramos de proteína estimados
        - carbs: Gramos de carbohidratos estimados
        - fat: Gramos de grasa estimados
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          prompt,
          {
            inlineData: {
              data: imageBase64,
              mimeType: mimeType
            }
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              foodName: { type: Type.STRING },
              calories: { type: Type.NUMBER },
              protein: { type: Type.NUMBER },
              carbs: { type: Type.NUMBER },
              fat: { type: Type.NUMBER }
            },
            required: ["foodName", "calories", "protein", "carbs", "fat"]
          }
        }
      });
      
      if (response.text) {
        const data = JSON.parse(response.text);
        res.json(data);
      } else {
        res.status(500).json({ error: "Empty response" });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to analyze image" });
    }
  });

app.post("/api/gemini/custom", async (req, res) => {
    try {
      const { name } = req.body;
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
      
      let customSupp = null;
      if (response.text) {
        const data = JSON.parse(response.text);
        customSupp = {
          id: `custom-${Date.now()}`,
          name: data.name,
          defaultAmount: data.defaultAmount,
          defaultUnit: data.defaultUnit,
          description: data.description,
          riskLevel: data.riskLevel,
          type: data.type || 'other'
        };
      }
      res.json({ customSupp });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to analyze custom supplement" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // Support React Router SPA fallback
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

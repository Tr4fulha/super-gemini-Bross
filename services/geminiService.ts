
import { GoogleGenAI, Type } from "@google/genai";
import { LevelInfo } from "../types";

export const generateLevelTheme = async (): Promise<LevelInfo> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "Generate a creative world name, a short descriptive theme, a primary hex color, and a gravity multiplier (0.5 to 1.2) for a platformer game level.",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            theme: { type: Type.STRING },
            color: { type: Type.STRING },
            gravity: { type: Type.NUMBER },
          },
          required: ["name", "theme", "color", "gravity"],
        },
      },
    });

    const data = JSON.parse(response.text);
    return {
      name: data.name || "Unknown Land",
      theme: data.theme || "A mysterious place.",
      color: data.color || "#3b82f6",
      gravity: data.gravity || 0.8,
    };
  } catch (error) {
    console.error("Error generating level theme:", error);
    // Fallback
    return {
      name: "Neo Mushroom Kingdom",
      theme: "A digital reimagining of the classic world.",
      color: "#3b82f6",
      gravity: 0.8,
    };
  }
};

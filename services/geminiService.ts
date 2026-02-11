
import { GoogleGenAI, Type } from "@google/genai";
import { FarmData, OptimizationResult } from "../types";
import { SUBSIDY_RATES_2026 } from "../constants";

// The API key must be obtained exclusively from the environment variable process.env.API_KEY.
// Assume this variable is pre-configured, valid, and accessible.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getFarmOptimization = async (farmData: FarmData): Promise<OptimizationResult> => {
  const model = "gemini-3-flash-preview";
  
  // Format rates for the prompt
  const ratesString = SUBSIDY_RATES_2026.map(r => `${r.name}: ${r.rate} ${r.unit}`).join(', ');

  const prompt = `
    Jesteś ekspertem ds. płatności obszarowych i ekoschematów w Polsce w ramach WPR 2023-2027.
    Dokonaj optymalizacji dla sezonu 2026, korzystając z poniższej bazy danych (historia pól, stawki, profil gospodarstwa).
    
    Tabela: Gospodarstwo
    - ID Producenta: ${farmData.profile.producerId}
    - Powierzchnia UR: ${farmData.profile.totalAreaUR} ha
    - Wymagane punkty wejścia (25% * 5pkt): ${farmData.profile.entryConditionPoints} pkt

    Tabela: Stawki_2026 (Użyj tych wartości do kalkulacji)
    ${ratesString}

    Tabela: Pola i Historia (N-4: lata 2021-2025)
    ${JSON.stringify(farmData.fields, null, 2)}

    Zadania:
    1. Przeanalizuj historię pod kątem wymogów (np. wapnowanie raz na 4 lata - sprawdź datę Data_Wapnowania). Jeśli wapnowano w 2024, nie sugeruj wapnowania w 2026.
    2. Sprawdź ważność analizy gleby (Analiza_Gleby_PH - ważna 4 lata).
    3. Zaproponuj ekoschematy z Tabeli Stawki_2026 dla każdej działki, aby zmaksymalizować zysk.
    4. Upewnij się, że gospodarstwo uzbierało minimum ${farmData.profile.entryConditionPoints} punktów z ekoschematów.
    
    Output JSON:
    - totalEstimatedSubsidy: suma (PLN).
    - recommendations: lista z polami, sugerowane ekoschematy, uzasadnienie (odnieś się do historii pola!), zysk.
    - complianceNotes: ostrzeżenia (np. "Konieczne nowe badanie pH na działce X").
  `;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            totalEstimatedSubsidy: { type: Type.NUMBER, description: "Total estimated subsidy in PLN including basic and ecoschemes" },
            recommendations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  fieldId: { type: Type.STRING },
                  fieldName: { type: Type.STRING },
                  suggestedEcoSchemes: { 
                    type: Type.ARRAY, 
                    items: { type: Type.STRING },
                    description: "List of names of suggested ecoschemes from Stawki_2026"
                  },
                  reasoning: { type: Type.STRING, description: "Explanation referring to field history and compliance" },
                  potentialGain: { type: Type.NUMBER, description: "Estimated financial gain in PLN for this field" }
                }
              }
            },
            complianceNotes: { type: Type.STRING, description: "General compliance warnings, lime check, soil analysis check" }
          }
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as OptimizationResult;
    }
    throw new Error("Empty response from AI");
  } catch (error) {
    console.error("Gemini optimization error:", error);
    throw error;
  }
};

export const chatWithAdvisor = async (history: {role: 'user' | 'model', text: string}[], message: string): Promise<string> => {
    const model = "gemini-3-flash-preview";
    
    const contents = [
      { role: 'user', parts: [{ text: "Jesteś wirtualnym doradcą rolniczym. Odpowiadaj krótko, rzeczowo i zgodnie z wytycznymi ARiMR na lata 2023-2027. Skup się na terminach i wymogach prawnych." }] },
      ...history.map(h => ({ role: h.role, parts: [{ text: h.text }] })),
      { role: 'user', parts: [{ text: message }] }
    ];

    try {
      const response = await ai.models.generateContent({
        model,
        contents: contents as any 
      });
      return response.text || "Przepraszam, nie potrafię teraz odpowiedzieć.";
    } catch (error) {
      console.error("Chat error:", error);
      return "Wystąpił błąd komunikacji z asystentem AI.";
    }
};

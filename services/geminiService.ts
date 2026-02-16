
import { GoogleGenAI, Type } from "@google/genai";
import { FarmData, OptimizationResult } from "../types";
import { SUBSIDY_RATES_2026 } from "../constants";

// The API key must be obtained exclusively from the environment variable process.env.API_KEY.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getFarmOptimization = async (farmData: FarmData): Promise<OptimizationResult> => {
  const model = "gemini-3-flash-preview";
  
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
    1. Przeanalizuj historię pod kątem wymogów.
    2. Zaproponuj ekoschematy z Tabeli Stawki_2026 dla każdej działki.
    3. Upewnij się, że gospodarstwo uzbierało minimum ${farmData.profile.entryConditionPoints} punktów.
    
    Output JSON:
    - totalEstimatedSubsidy: suma (PLN).
    - recommendations: lista z polami, sugerowane ekoschematy, uzasadnienie, zysk.
    - complianceNotes: ostrzeżenia.
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
            totalEstimatedSubsidy: { type: Type.NUMBER },
            recommendations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  fieldId: { type: Type.STRING },
                  fieldName: { type: Type.STRING },
                  suggestedEcoSchemes: { type: Type.ARRAY, items: { type: Type.STRING } },
                  reasoning: { type: Type.STRING },
                  potentialGain: { type: Type.NUMBER }
                }
              }
            },
            complianceNotes: { type: Type.STRING }
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

export const analyzeDocument = async (base64Data: string, mimeType: string): Promise<{
    category: 'WNIOSEK' | 'MAPA' | 'REJESTR' | 'INNE';
    producerId?: string;
    campaignYear?: string;
    summary: string;
}> => {
    const model = "gemini-3-flash-preview";

    const prompt = `
        Przeanalizuj załączony dokument rolniczy. 
        Zidentyfikuj:
        1. Typ dokumentu (wniosek o płatności, mapa, rejestr zabiegów lub inne).
        2. Numer producenta (EP) - to 9-cyfrowy unikalny numer (np. 012345678).
        3. Rok kampanii rolniczej (np. 2024, 2025).
        4. Krótkie podsumowanie zawartości (jedno zdanie).

        Zwróć dane w formacie JSON.
    `;

    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: {
                parts: [
                    { inlineData: { data: base64Data, mimeType: mimeType } },
                    { text: prompt }
                ]
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        category: { 
                            type: Type.STRING, 
                            enum: ['WNIOSEK', 'MAPA', 'REJESTR', 'INNE'],
                            description: 'Kategoria dokumentu' 
                        },
                        producerId: { type: Type.STRING, description: '9-cyfrowy numer EP' },
                        campaignYear: { type: Type.STRING, description: 'Rok kampanii (4 cyfry)' },
                        summary: { type: Type.STRING, description: 'Krótki opis' }
                    },
                    required: ["category", "summary"]
                }
            }
        });

        if (response.text) {
            return JSON.parse(response.text);
        }
        throw new Error("Brak odpowiedzi od AI");
    } catch (error) {
        console.error("Document analysis error:", error);
        return { category: 'INNE', summary: 'Nie udało się przeprowadzić analizy AI.' };
    }
};

export const chatWithAdvisor = async (history: {role: 'user' | 'model', text: string}[], message: string, farmData: FarmData): Promise<string> => {
    const model = "gemini-3-flash-preview";
    
    // Przygotowanie kontekstu gospodarstwa dla AI
    const farmContext = farmData.profile.producerId ? `
      KONTEKST AKTUALNEGO GOSPODARSTWA:
      - Nazwa: ${farmData.farmName}
      - Numer EP: ${farmData.profile.producerId}
      - Całkowita powierzchnia UR: ${farmData.profile.totalAreaUR} ha
      
      DANE PÓL (HISTORIA 2024-2025):
      ${farmData.fields.map(f => {
        const h24 = f.history.find(h => h.year === 2024);
        const h25 = f.history.find(h => h.year === 2025);
        return `- Działka ${f.registrationNumber} (${f.name}): 
          2024: ${h24 ? h24.crop : 'brak danych'}, pow: ${h24?.eligibleArea || '?' } ha
          2025: ${h25 ? h25.crop : 'brak danych'}, pow: ${h25?.eligibleArea || '?' } ha`;
      }).join('\n')}
    ` : "Brak danych konkretnego gospodarstwa (tryb ogólny).";

    const contents = [
      { role: 'user', parts: [{ text: `Jesteś wirtualnym doradcą rolniczym AgroOptima. Twoim celem jest pomoc rolnikowi o EP: ${farmData.profile.producerId}. 
        Odpowiadaj krótko, rzeczowo i zgodnie z wytycznymi ARiMR na lata 2023-2027.
        Znasz dane tego gospodarstwa i powinieneś się do nich odnosić, jeśli użytkownik o to zapyta.
        
        ${farmContext}` }] },
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

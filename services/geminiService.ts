
import { GoogleGenAI, Type } from "@google/genai";
import { FarmData, OptimizationResult, SemanticQueryResult, FarmerApplicationData, FieldOperation } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Wyodrębnia tekst z PDF/Obrazu (OCR).
 */
export const extractRawText = async (base64Data: string, mimeType: string): Promise<string> => {
    const model = "gemini-3-flash-preview";
    const prompt = "Wyodrębnij tekst z tego dokumentu rolniczego. Zwróć czysty tekst bez komentarzy.";
    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: {
                parts: [
                    { inlineData: { data: base64Data, mimeType: mimeType } },
                    { text: prompt }
                ]
            }
        });
        return response.text || "";
    } catch (error: any) {
        console.error("Gemini OCR Error:", error);
        throw new Error("Nie udało się odczytać tekstu.");
    }
};

/**
 * Funkcja do inteligentnego parsowania notatek rolnika na ustrukturyzowane zabiegi.
 */
export const parseOperationNote = async (note: string, fieldNames: string[]): Promise<Partial<FieldOperation>> => {
    const model = "gemini-3-flash-preview";
    const prompt = `Przetwórz notatkę na zabieg agrotechniczny: "${note}". Pola: ${fieldNames.join(", ")}. Zwróć JSON.`;
    try {
        const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        type: { type: Type.STRING },
                        productName: { type: Type.STRING },
                        dosage: { type: Type.STRING },
                        unit: { type: Type.STRING },
                        fieldName: { type: Type.STRING },
                        isEcoSchemeRelevant: { type: Type.BOOLEAN }
                    }
                }
            }
        });
        return JSON.parse(response.text || "{}");
    } catch (e) {
        return {};
    }
};

/**
 * Optymalizacja dopłat z użyciem JSON Schema.
 */
export const getFarmOptimization = async (farmData: FarmData): Promise<OptimizationResult> => {
    const model = "gemini-3-flash-preview";
    const prompt = `Jesteś ekspertem dopłat bezpośrednich w Polsce. Przeanalizuj pola rolnika i dobierz ekoschematy. Dane: ${JSON.stringify(farmData.fields)}. Zwróć JSON.`;
    try {
        const response = await ai.models.generateContent({
            model,
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
        return JSON.parse(response.text || "{}");
    } catch (error: any) {
        throw error;
    }
};

/**
 * Czat doradcy - bez RAG.
 */
export const chatWithAdvisor = async (history: any[], message: string, farmData: FarmData): Promise<SemanticQueryResult> => {
    const model = "gemini-3-flash-preview";
    const systemInstruction = `Jesteś doradcą AgroOptima. Pomagasz rolnikowi (ID: ${farmData.profile.producerId}) w dopłatach.`;
    try {
        const response = await ai.models.generateContent({
            model,
            contents: [...history.map(h => ({ role: h.role, parts: [{ text: h.text }] })), { role: 'user', parts: [{ text: message }] }],
            config: { systemInstruction }
        });
        return { answer: response.text || "", citations: [] };
    } catch (error) {
        return { answer: "Błąd komunikacji.", citations: [] };
    }
};

/**
 * Analiza pogody.
 */
export const analyzeAgroWeather = async (weatherData: any, location: string, crops: string[]): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `Analiza pogody dla ${location}, uprawy: ${crops.join(', ')}. Dane: ${JSON.stringify(weatherData)}. Podaj 3 krótkie zalecenia.`
        });
        return response.text || "Brak analizy.";
    } catch (e) {
        return "Błąd.";
    }
};

export const autofillApplicationFromRag = async (farmData: FarmData): Promise<Partial<FarmerApplicationData>> => {
    return {};
};

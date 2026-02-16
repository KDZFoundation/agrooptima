
import { GoogleGenAI, Type } from "@google/genai";
import { FarmData, OptimizationResult, SemanticQueryResult, KnowledgeChunk, FarmerApplicationData, FieldOperation } from "../types";
import { SUBSIDY_RATES_2026, SUBSIDY_RATES_2025, SUBSIDY_RATES_2024 } from "../constants";
import { ragEngine } from "./ragEngine";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Embedding pojedynczego tekstu.
 */
export const getEmbedding = async (text: string, isQuery: boolean = false): Promise<number[]> => {
    try {
        // Fix: Changed 'contents' to 'content' and updated response access to 'embedding.values'
        const response = await ai.models.embedContent({
            model: "text-embedding-004",
            content: { parts: [{ text }] },
            taskType: isQuery ? "RETRIEVAL_QUERY" : "RETRIEVAL_DOCUMENT"
        });
        
        return response.embedding?.values || [];
    } catch (error: any) {
        console.error("Embedding error:", error);
        return [];
    }
};

/**
 * Batch embedding.
 */
export const getBatchEmbeddings = async (texts: string[]): Promise<number[][]> => {
    if (!texts || texts.length === 0) return [];
    
    try {
        const results = await Promise.all(texts.map(text => getEmbedding(text)));
        return results;
    } catch (error: any) {
        console.error("Batch embedding error:", error);
        return texts.map(() => []);
    }
};

/**
 * Wyodrębnia tekst z PDF/Obrazu (OCR).
 */
export const extractRawText = async (base64Data: string, mimeType: string): Promise<string> => {
    const model = "gemini-3-flash-preview";
    const supportedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    const safeMimeType = supportedTypes.includes(mimeType) ? mimeType : 'application/pdf';

    const prompt = "Wyodrębnij tekst z tego dokumentu rolniczego. Zwróć czysty tekst bez komentarzy.";

    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: {
                parts: [
                    { inlineData: { data: base64Data, mimeType: safeMimeType } },
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
 * Przełączono na model flash dla większej dostępności (uniknięcie błędu 503).
 */
export const getFarmOptimization = async (farmData: FarmData): Promise<OptimizationResult> => {
    // Model flash jest bardziej responsywny i rzadziej zwraca 503 przy wysokim obciążeniu
    const model = "gemini-3-flash-preview";
    
    const activeFields = farmData.fields.map(f => ({
        id: f.id,
        name: f.name,
        area: f.area,
        eligibleArea: f.eligibleArea,
        crop: f.crop,
        currentEcoSchemes: f.history?.[0]?.appliedEcoSchemes || []
    }));

    const prompt = `Jesteś ekspertem dopłat bezpośrednich WPR 2023-2027 w Polsce. 
    Przeanalizuj dane gospodarstwa: ${JSON.stringify(activeFields)}.
    Zaproponuj optymalne EKOSCHEMATY dla każdej działki, aby maksymalizować zysk. 
    Zwróć uwagę na zakazy łączenia (np. wymieszanie obornika i nawozy płynne).
    Zwróć precyzyjny JSON.`;

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
                                },
                                required: ["fieldId", "fieldName", "suggestedEcoSchemes", "reasoning", "potentialGain"]
                            }
                        },
                        complianceNotes: { type: Type.STRING }
                    },
                    required: ["totalEstimatedSubsidy", "recommendations", "complianceNotes"]
                }
            }
        });
        
        const text = response.text;
        if (!text) throw new Error("Empty response from AI");
        return JSON.parse(text);
    } catch (error: any) {
        console.error("Optimization AI Error:", error);
        // Jeśli flash też rzuci 503, rzucamy błąd do UI
        throw error;
    }
};

/**
 * Czat doradcy z RAG.
 */
export const chatWithAdvisor = async (history: any[], message: string, farmData: FarmData): Promise<SemanticQueryResult> => {
    const model = "gemini-3-flash-preview";
    const contextChunks = await ragEngine.getRelevantContextSemantic(message, 5);
    const contextText = contextChunks.map(c => c.content).join('\n\n');

    const systemInstruction = `Jesteś doradcą AgroOptima. Twoja wiedza pochodzi z tych dokumentów:\n${contextText}`;

    try {
        const response = await ai.models.generateContent({
            model,
            contents: [...history.map(h => ({ role: h.role, parts: [{ text: h.text }] })), { role: 'user', parts: [{ text: message }] }],
            config: { systemInstruction }
        });
        return { answer: response.text || "", citations: contextChunks };
    } catch (error) {
        return { answer: "Błąd komunikacji z modelem.", citations: [] };
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
        return "Serwis pogodowy niedostępny.";
    }
};

export const autofillApplicationFromRag = async (farmData: FarmData): Promise<Partial<FarmerApplicationData>> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: "Uzupełnij pola wniosku na podstawie dokumentów w bazie. Zwróć JSON.",
            config: { responseMimeType: "application/json" }
        });
        return JSON.parse(response.text || "{}");
    } catch (e) {
        return {};
    }
};

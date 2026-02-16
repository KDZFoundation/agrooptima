
import { GoogleGenAI, Type } from "@google/genai";
import { FarmData, OptimizationResult, SemanticQueryResult, KnowledgeChunk, FarmerApplicationData } from "../types";
import { SUBSIDY_RATES_2026 } from "../constants";
import { ragEngine } from "./ragEngine";

// Klucz API pobierany wyłącznie z process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * EMBEDDING WYŁĄCZONY - Zwraca pustą tablicę.
 */
export const getEmbedding = async (text: string, isQuery: boolean = false): Promise<number[]> => {
    return []; // Zwracamy puste dane, aby nie obciążać API
};

/**
 * BATCH EMBEDDING WYŁĄCZONY - Zwraca puste wyniki.
 */
export const getBatchEmbeddings = async (texts: string[]): Promise<number[][]> => {
    return texts.map(() => []);
};

/**
 * Wyodrębnia tekst z PDF (OCR). 
 * Pozostawiamy aktywny OCR, ponieważ jest niezbędny do działania bazy wiedzy.
 */
export const extractRawText = async (base64Data: string, mimeType: string): Promise<string> => {
    const model = "gemini-flash-lite-latest";
    const supportedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    const safeMimeType = supportedTypes.includes(mimeType) ? mimeType : 'application/pdf';

    const prompt = "Wyodrębnij cały tekst z tego dokumentu rolniczego. Zachowaj strukturę tabel i oznaczenia działek. Zwróć czysty tekst.";

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
        throw new Error("Nie udało się odczytać tekstu z pliku.");
    }
};

/**
 * Automatyczne uzupełnianie wniosku na podstawie tekstów z RAG (teraz wyszukiwanie tekstowe).
 */
export const autofillApplicationFromRag = async (farmData: FarmData): Promise<Partial<FarmerApplicationData>> => {
    const contextChunks = await ragEngine.getRelevantContextSemantic("płatność ekoschematy onw prsk", 15);
    const context = contextChunks.map(c => c.content).join("\n---\n");

    const model = "gemini-3-flash-preview";
    const prompt = `
        Na podstawie fragmentów wniosku rolnika, określ jakie płatności zostały zaznaczone (X).
        Kontekst dokumentów:
        ${context}

        Zwróć JSON pasujący do FarmerApplicationData:
        - directPayments (pwd_red, ekoschematy, mro)
        - ruralDevelopment (onw, prsk1420)
    `;

    try {
        const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        return JSON.parse(response.text || "{}");
    } catch (e) {
        return {};
    }
};

/**
 * Optymalizacja dopłat.
 */
export const getFarmOptimization = async (farmData: FarmData): Promise<OptimizationResult> => {
  const model = "gemini-3-pro-preview";
  const ratesString = SUBSIDY_RATES_2026.map(r => `${r.name}: ${r.rate} ${r.unit}`).join(', ');

  const prompt = `Jesteś ekspertem dopłat. Zoptymalizuj gospodarstwo ID ${farmData.profile.producerId} na rok 2026. 
  UR: ${farmData.profile.totalAreaUR} ha. Stawki: ${ratesString}. Pola: ${JSON.stringify(farmData.fields)}. 
  Zwróć JSON z rekomendacjami i zyskiem.`;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Gemini optimization error:", error);
    throw error;
  }
};

/**
 * Czat doradcy (teraz z RAG opartym na tekście).
 */
export const chatWithAdvisor = async (history: {role: 'user' | 'model', text: string}[], message: string, farmData: FarmData): Promise<SemanticQueryResult> => {
    const model = "gemini-3-flash-preview";
    const contextChunks = await ragEngine.getRelevantContextSemantic(message, 6);
    const contextText = contextChunks.map((c, i) => `[${i+1}] ${c.documentName}: ${c.content}`).join('\n\n');

    const systemInstruction = `Jesteś doradcą AgroOptima. Odpowiadaj TYLKO na podstawie tych fragmentów dokumentów rolnika:\n${contextText}`;

    try {
      const response = await ai.models.generateContent({
        model,
        contents: [...history.map(h => ({ role: h.role, parts: [{ text: h.text }] })), { role: 'user', parts: [{ text: message }] }] as any,
        config: { systemInstruction }
      });
      return { answer: response.text || "", citations: contextChunks };
    } catch (error) {
      return { answer: "Przepraszam, wystąpił błąd podczas generowania odpowiedzi.", citations: [] };
    }
};

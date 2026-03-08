import { GoogleGenAI, Type } from "@google/genai";
import { FarmData, OptimizationResult, SemanticQueryResult, FarmerApplicationData, FieldOperation } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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
 * Inteligentne parsowanie notatek rolnika na zabiegi agrotechniczne.
 */
export const parseOperationNote = async (note: string, fieldNames: string[]): Promise<Partial<FieldOperation>> => {
    const model = "gemini-3-flash-preview";
    const prompt = `Przetwórz notatkę na zabieg agrotechniczny: "${note}". Pola: ${fieldNames.join(", ")}. 
Rozpoznaj typ zabiegu (NAWOZENIE, OPRYSK, SIEW, UPRAWA, ZBIOR, INNE), nazwę produktu (w tym typ nawozu), dawkę (tylko liczba), jednostkę (np. kg/ha, l/ha, t/ha), nazwę pola, czy zabieg jest istotny dla ekoschematów (np. wymieszanie obornika, plan nawożenia) oraz powiązany ekoschemat (jeśli dotyczy). Zwróć JSON.`;
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
                        isEcoSchemeRelevant: { type: Type.BOOLEAN },
                        linkedEcoScheme: { type: Type.STRING },
                        description: { type: Type.STRING }
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
 * Optymalizacja dopłat z użyciem zaawansowanej analizy WPR 2023-2027.
 */
export const getFarmOptimization = async (farmData: FarmData): Promise<OptimizationResult> => {
    const model = "gemini-3-pro-preview"; // Upgrade to Pro for better reasoning
    const prompt = `
Jesteś ekspertem ds. dopłat bezpośrednich i ekoschematów w Polsce (WPR 2023-2027).
Twoim zadaniem jest przeanalizowanie danych gospodarstwa i zaproponowanie optymalnej strategii maksymalizacji dopłat.

DANE GOSPODARSTWA:
- Całkowita powierzchnia UR: ${farmData.profile.totalAreaUR} ha
- Działki i uprawy: ${JSON.stringify(farmData.fields.map(f => ({ id: f.id, name: f.name, area: f.area, crop: f.crop, history: f.history })))}

WYMAGANIA ANALIZY:
1. Dobierz ekoschematy dla każdej działki (np. Rolnictwo Węglowe: Międzyplony, Obornik, Plan Nawożenia, Uproszczone Uprawy).
2. Uwzględnij system punktowy (1 pkt = ok. 100 PLN).
3. Sprawdź warunek wejścia (min. 25% punktów z powierzchni UR * 5 pkt/ha).
4. Zweryfikuj zgodność z GAEC 7 (zmianowanie) na podstawie historii upraw.
5. Zaproponuj konkretne działania (np. "Wymieszaj słomę z glebą na działce X").

Zwróć JSON zgodny ze schematem.
`;
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
                        complianceNotes: { type: Type.STRING },
                        strategySummary: { type: Type.STRING },
                        pointBalance: {
                            type: Type.OBJECT,
                            properties: {
                                earned: { type: Type.NUMBER },
                                required: { type: Type.NUMBER },
                                isMet: { type: Type.BOOLEAN }
                            }
                        }
                    }
                }
            }
        });
        return JSON.parse(response.text || "{}");
    } catch (error: any) {
        console.error("Optimization Error:", error);
        throw error;
    }
};

/**
 * Czat doradcy.
 */
export const chatWithAdvisor = async (history: any[], message: string, farmData: FarmData): Promise<SemanticQueryResult> => {
    const model = "gemini-3-flash-preview";
    const systemInstruction = `Jesteś doradcą AgroOptima. Pomagasz rolnikowi (ID: ${farmData.profile.producerId}) w dopłatach bezpośrednich WPR 2023-2027.`;
    try {
        const response = await ai.models.generateContent({
            model,
            contents: [
                ...history.map(h => ({ role: h.role, parts: [{ text: h.text }] })),
                { role: 'user', parts: [{ text: message }] }
            ],
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

/**
 * Autouzupełnienie wniosku na podstawie danych gospodarstwa — NAPRAWIONE.
 * Poprzednia wersja zawsze zwracała {}.
 */
export const autofillApplicationFromRag = async (farmData: FarmData): Promise<Partial<FarmerApplicationData>> => {
    const model = "gemini-3-flash-preview";

    // Budujemy minimalny payload — tylko niezbędne dane (bez zbędnych pól)
    const payload = {
        fields: farmData.fields.map(f => ({
            crop: f.crop,
            area: f.area,
            ecoSchemes: f.history?.[0]?.appliedEcoSchemes || []
        })),
        totalArea: farmData.profile.totalAreaUR
    };

    const prompt = `
Jesteś ekspertem dopłat bezpośrednich ARiMR w Polsce (WPR 2023-2027).
Na podstawie poniższych danych gospodarstwa rolnego ustal, które pola wniosku należy zaznaczyć.

Dane gospodarstwa:
${JSON.stringify(payload, null, 2)}

Zasady:
- Jeśli jest jakakolwiek uprawa i ekoschematy → ekoschematy: true
- Jeśli powierzchnia całkowita > 0 → pwd_red: true (płatność podstawowa)
- Jeśli uprawy to rośliny bobowate lub trawy → bou: true
- Jeśli kody ekoschematów zawierają "RETENCJA" lub "E_RET" → retencjonowanie: true
- Jeśli kody zawierają "GWP" → gwp: true
- Jeśli kody zawierają "IPR" lub "E_IPR" → ipr: true
- onw: false (brak danych terytorialnych)

Zwróć TYLKO JSON bez żadnych komentarzy.
`;

    try {
        const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        directPayments: {
                            type: Type.OBJECT,
                            properties: {
                                ekoschematy: { type: Type.BOOLEAN },
                                pwd_red:     { type: Type.BOOLEAN },
                                mro:         { type: Type.BOOLEAN },
                                ipr:         { type: Type.BOOLEAN },
                                bou:         { type: Type.BOOLEAN },
                                retencjonowanie: { type: Type.BOOLEAN },
                                gwp:         { type: Type.BOOLEAN },
                            }
                        },
                        ruralDevelopment: {
                            type: Type.OBJECT,
                            properties: {
                                onw:      { type: Type.BOOLEAN },
                                zrsk2327: { type: Type.BOOLEAN },
                                re2327:   { type: Type.BOOLEAN },
                            }
                        }
                    }
                }
            }
        });

        const parsed = JSON.parse(response.text || "{}");
        console.log("[autofill] Wygenerowano autouzupełnienie wniosku:", parsed);
        return parsed;
    } catch (e) {
        console.warn("[autofill] Nie udało się wygenerować autouzupełnienia:", e);
        return {};
    }
};

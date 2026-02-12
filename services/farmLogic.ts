
import { FarmData, FarmAnalysisReport, ValidationIssue, EcoSchemeCalculation, SubsidyRate } from "../types";
import { SUBSIDY_RATES_2025, SUBSIDY_RATES_2026 } from "../constants";

// Helper: Get rates for a specific year
const getRatesForYear = (year: number): SubsidyRate[] => {
    return year === 2026 ? SUBSIDY_RATES_2026 : SUBSIDY_RATES_2025;
};

// Helper: Point value approximation (if not defined in rates, assume 100 PLN/pkt)
const POINT_VALUE_PLN = 100.00; 

/**
 * Main function to analyze farm state against ARiMR rules.
 */
export const analyzeFarmState = (farmData: FarmData, year: number): FarmAnalysisReport => {
    const issues: ValidationIssue[] = [];
    const ecoCalc: Record<string, EcoSchemeCalculation> = {};
    let totalPoints = 0;
    
    // 1. Calculate Required Entry Condition Points
    // Logic: 25% of total UR * 5 points
    // Note: totalAreaUR in profile should serve as the 'Reference Area' sum.
    const requiredPoints = (farmData.profile.totalAreaUR * 0.25) * 5.0;

    const rates = getRatesForYear(year);

    // --- ITERATE FIELDS ---
    farmData.fields.forEach(field => {
        // Find history for the analyzed year
        const historyEntry = field.history?.find(h => h.year === year);
        
        // A. VALIDATION: Check Area Limits (Reference vs. Declared)
        // Reference Area = eligibleArea (PEG) from Ewidencja for THIS YEAR.
        // Declared Area = sum of specificArea (area in cropParts) from Struktura Zasiewów.
        
        if (historyEntry) {
            let declaredSum = 0;
            let partsBreakdown = "";
            
            // Calculate Sum from Structure (specificArea which maps to part.area)
            if (historyEntry.cropParts && historyEntry.cropParts.length > 0) {
                declaredSum = historyEntry.cropParts.reduce((sum, part) => sum + part.area, 0);
                partsBreakdown = historyEntry.cropParts.map(p => `${p.designation}: ${p.area.toFixed(2)} ha`).join(", ");
            } else {
                // Fallback if no parts but main area exists in history (e.g. single crop not split)
                declaredSum = historyEntry.area || 0;
                partsBreakdown = `Brak podziału: ${declaredSum.toFixed(2)} ha`;
            }

            // Reference for payment/validation is PEG (eligibleArea) for THIS year
            // Prioritize historyEntry.eligibleArea (from Parcel Import for this year)
            // Fallback to field.eligibleArea (Global latest) if history specific is missing
            // Fallback to Geodetic Area (area) if PEG is completely missing in data
            const referenceArea = historyEntry.eligibleArea || field.eligibleArea || historyEntry.area || field.area || 0;
            
            const diff = declaredSum - referenceArea;
            const tolerance = referenceArea * 0.03; // 3% tolerance

            // Validation Logic
            if (diff > 0.001) { // Floating point safety
                if (diff > tolerance) {
                    issues.push({
                        type: 'ERROR',
                        fieldId: field.id,
                        fieldName: field.name,
                        message: `Przekroczenie powierzchni referencyjnej! Zadeklarowano (Suma Zasiewów): ${declaredSum.toFixed(2)} ha, Ewidencja (PEG): ${referenceArea.toFixed(2)} ha. Przekroczenie > 3%. (Składowe sumy: ${partsBreakdown}). Sprawdź Ewidencję Gruntów.`
                    });
                } else {
                    issues.push({
                        type: 'WARNING',
                        fieldId: field.id,
                        fieldName: field.name,
                        message: `Niewielkie przekroczenie powierzchni referencyjnej (w granicach błędu 3%). Zadeklarowano: ${declaredSum.toFixed(2)} ha (Ewidencja PEG: ${referenceArea.toFixed(2)} ha).`
                    });
                }
            }

            // B. ECO-SCHEMES CALCULATION
            // We need to iterate parts to see applied schemes
            const partsToAnalyze = historyEntry.cropParts || [{ 
                area: historyEntry.area || field.area, 
                ecoSchemes: historyEntry.appliedEcoSchemes,
                crop: historyEntry.crop,
                designation: 'Main'
            }];

            partsToAnalyze.forEach(part => {
                if (part.ecoSchemes && part.ecoSchemes.length > 0) {
                    
                    // Validation: Check exclusions (simplistic check for >2 schemes if they conflict)
                    if (part.ecoSchemes.length > 3) {
                        issues.push({
                            type: 'WARNING',
                            fieldId: field.id,
                            fieldName: field.name,
                            message: `Duża liczba ekoschematów na uprawie ${part.designation || ''}. Sprawdź wykluczenia.`
                        });
                    }

                    part.ecoSchemes.forEach(schemeCode => {
                        const rateDef = rates.find(r => r.shortName === schemeCode || r.name === schemeCode);
                        
                        if (!ecoCalc[schemeCode]) {
                            ecoCalc[schemeCode] = {
                                schemeCode: schemeCode,
                                totalArea: 0,
                                totalPoints: 0,
                                estimatedValue: 0
                            };
                        }

                        // Add Area
                        ecoCalc[schemeCode].totalArea += part.area;

                        // Calculate Points & Money
                        if (rateDef) {
                            if (rateDef.points && rateDef.points > 0) {
                                const pts = part.area * rateDef.points;
                                ecoCalc[schemeCode].totalPoints += pts;
                                totalPoints += pts;
                                // Money from points
                                ecoCalc[schemeCode].estimatedValue += pts * POINT_VALUE_PLN;
                            } else {
                                // Area payment (EUR or PLN)
                                // If EUR, approximate 4.3 PLN
                                const rateVal = rateDef.unit.includes('EUR') ? rateDef.rate * 4.3 : rateDef.rate;
                                ecoCalc[schemeCode].estimatedValue += part.area * rateVal;
                            }
                        }
                    });
                }
            });
        }
    });

    const totalEstimatedValue = Object.values(ecoCalc).reduce((sum, item) => sum + item.estimatedValue, 0);

    return {
        validationIssues: issues,
        ecoSchemes: Object.values(ecoCalc),
        totalPoints: totalPoints,
        requiredPoints: requiredPoints,
        isEntryConditionMet: totalPoints >= requiredPoints,
        totalEstimatedValue: totalEstimatedValue
    };
};

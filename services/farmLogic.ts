
import { FarmData, FarmAnalysisReport, ValidationIssue, EcoSchemeCalculation, SubsidyRate } from "../types";
import { SUBSIDY_RATES_2024, SUBSIDY_RATES_2025, SUBSIDY_RATES_2026 } from "../constants";

// Helper: Get rates for a specific year
const getRatesForYear = (year: number): SubsidyRate[] => {
    if (year === 2026) return SUBSIDY_RATES_2026;
    if (year === 2025) return SUBSIDY_RATES_2025;
    return SUBSIDY_RATES_2024;
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
    const requiredPoints = (farmData.profile.totalAreaUR * 0.25) * 5.0;

    const rates = getRatesForYear(year);

    // --- ITERATE FIELDS ---
    farmData.fields.forEach(field => {
        const historyEntry = field.history?.find(h => h.year === year);
        
        if (historyEntry) {
            let declaredSum = 0;
            let partsBreakdown = "";
            
            if (historyEntry.cropParts && historyEntry.cropParts.length > 0) {
                declaredSum = historyEntry.cropParts.reduce((sum, part) => sum + part.area, 0);
                partsBreakdown = historyEntry.cropParts.map(p => `${p.designation}: ${p.area.toFixed(2)} ha`).join(", ");
            } else {
                declaredSum = historyEntry.area || 0;
                partsBreakdown = `Brak podziału: ${declaredSum.toFixed(2)} ha`;
            }

            const referenceArea = historyEntry.eligibleArea || field.eligibleArea || historyEntry.area || field.area || 0;
            
            const diff = declaredSum - referenceArea;
            const tolerance = referenceArea * 0.03; 

            if (diff > 0.001) {
                if (diff > tolerance) {
                    issues.push({
                        type: 'ERROR',
                        fieldId: field.id,
                        fieldName: field.name,
                        message: `Przekroczenie powierzchni referencyjnej! Zadeklarowano: ${declaredSum.toFixed(2)} ha, Ewidencja (PEG): ${referenceArea.toFixed(2)} ha.`
                    });
                } else {
                    issues.push({
                        type: 'WARNING',
                        fieldId: field.id,
                        fieldName: field.name,
                        message: `Niewielkie przekroczenie powierzchni referencyjnej (w granicach błędu 3%).`
                    });
                }
            }

            // B. ECO-SCHEMES CONFLICTS & CALCULATION
            const partsToAnalyze = historyEntry.cropParts || [{ 
                area: historyEntry.area || field.area, 
                ecoSchemes: historyEntry.appliedEcoSchemes,
                crop: historyEntry.crop,
                designation: 'Main'
            }];

            partsToAnalyze.forEach(part => {
                if (part.ecoSchemes && part.ecoSchemes.length > 0) {
                    
                    // Check for conflicts between schemes in this part
                    part.ecoSchemes.forEach(codeA => {
                        const rateA = rates.find(r => r.shortName === codeA);
                        if (rateA?.conflictsWith) {
                            rateA.conflictsWith.forEach(codeB => {
                                if (part.ecoSchemes.includes(codeB)) {
                                    issues.push({
                                        type: 'CONFLICT',
                                        fieldId: field.id,
                                        fieldName: field.name,
                                        message: `Konflikt ekoschematów na części ${part.designation}: Praktyka ${codeA} wyklucza się z ${codeB}.`,
                                        relatedSchemes: [codeA, codeB]
                                    });
                                }
                            });
                        }
                    });

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

                        ecoCalc[schemeCode].totalArea += part.area;

                        if (rateDef) {
                            if (rateDef.points && rateDef.points > 0) {
                                const pts = part.area * rateDef.points;
                                ecoCalc[schemeCode].totalPoints += pts;
                                totalPoints += pts;
                                ecoCalc[schemeCode].estimatedValue += pts * POINT_VALUE_PLN;
                            } else {
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


import { FarmData, HierarchyGraph, HierarchyNode, FarmerDocument, SubsidyRate } from '../types';

/**
 * Silnik Ekstrakcji Hierarchii (HEE) - Generuje DAG kampanii.
 * Wersja uproszczona - bez Semantic Linker.
 */
export const extractHierarchy = async (farmData: FarmData, year: number, documents: FarmerDocument[], rates: SubsidyRate[]): Promise<HierarchyGraph> => {
    const nodes: HierarchyNode[] = [];
    const now = new Date().toISOString();
    const campaignId = `camp_${year}_${farmData.profile.producerId}`;

    // 1. Root: Kampania Dopłat
    const rootNode: HierarchyNode = {
        id: campaignId,
        type: 'FARM',
        label: `Kampania ${year}: ${farmData.farmName}`,
        value: `EP: ${farmData.profile.producerId}`,
        status: 'VALID',
        evidence: {
            source: 'System Core',
            timestamp: now,
            details: `Struktura kampanii wygenerowana automatycznie.`
        },
        children: []
    };
    nodes.push(rootNode);

    // 2. Węzeł: Dokumenty
    const wniosekDoc = documents.find(d => d.campaignYear === year.toString() && d.category === 'WNIOSEK');
    const docNodeId = `doc_${campaignId}`;
    const docNode: HierarchyNode = {
        id: docNodeId,
        type: 'FINANCIAL_RESULT',
        label: wniosekDoc ? `e-Wniosek: ${wniosekDoc.name}` : 'BRAK e-Wniosku',
        value: wniosekDoc ? 'Wgrano' : 'Wymagany',
        status: wniosekDoc ? 'VALID' : 'ERROR',
        evidence: {
            source: 'Moduł Dokumentów',
            timestamp: now,
            details: wniosekDoc ? `Plik PDF zweryfikowany pod kątem kampanii.` : 'Nie znaleziono pliku.'
        }
    };
    rootNode.children?.push(docNodeId);
    nodes.push(docNode);

    // 3. Warstwa Terytorialna
    const communes = Array.from(new Set(farmData.fields.map(f => f.commune || 'Nieprzypisane')));
    
    for (const communeName of communes) {
        const communeId = `commune_${communeName.replace(/\s/g, '_')}_${campaignId}`;
        const fieldsInCommune = farmData.fields.filter(f => (f.commune || 'Nieprzypisane') === communeName);
        
        const communeNode: HierarchyNode = {
            id: communeId,
            type: 'COMMUNE',
            label: `Gmina: ${communeName}`,
            value: `${fieldsInCommune.length} działek`,
            status: 'VALID',
            evidence: {
                source: 'Ewidencja Gruntów',
                timestamp: now,
                details: `Agregacja terytorialna dla gminy.`
            },
            children: []
        };
        rootNode.children?.push(communeId);
        nodes.push(communeNode);

        for (const field of fieldsInCommune) {
            const hist = field.history.find(h => h.year === year);
            if (!hist) continue;

            const parcelRefId = `parcel_ref_${field.id}_${campaignId}`;
            const parcelNode: HierarchyNode = {
                id: parcelRefId,
                type: 'PARCEL_REF',
                label: `Działka ${field.registrationNumber}`,
                value: `${hist.eligibleArea || field.eligibleArea} ha PEG`,
                status: (hist.eligibleArea || 0) > 0 ? 'VALID' : 'WARNING',
                evidence: {
                    source: 'Zasób ARiMR',
                    timestamp: now,
                    details: `Powierzchnia referencyjna zweryfikowana z ewidencją.`
                },
                children: []
            };
            communeNode.children?.push(parcelRefId);
            nodes.push(parcelNode);

            const parts = hist.cropParts && hist.cropParts.length > 0 
                ? hist.cropParts 
                : [{ designation: 'A', crop: hist.crop, area: hist.area || field.area, ecoSchemes: hist.appliedEcoSchemes }];

            for (const [idx, part] of parts.entries()) {
                const agriParcelId = `agri_${field.id}_${idx}_${campaignId}`;
                const agriNode: HierarchyNode = {
                    id: agriParcelId,
                    type: 'AGRI_PARCEL',
                    label: `Uprawa ${part.designation}: ${part.crop}`,
                    value: `${part.area.toFixed(2)} ha`,
                    status: 'VALID',
                    evidence: {
                        source: 'Struktura Zasiewów',
                        timestamp: now,
                        details: `Deklaracja rośliny uprawnej na części działki.`
                    },
                    children: []
                };
                parcelNode.children?.push(agriParcelId);
                nodes.push(agriNode);

                for (const schemeCode of part.ecoSchemes) {
                    const rate = rates.find(r => r.shortName === schemeCode && r.year === year);
                    const schemeId = `scheme_${agriParcelId}_${schemeCode}`;
                    
                    const schemeNode: HierarchyNode = {
                        id: schemeId,
                        type: 'ECO_SCHEME',
                        label: `Praktyka: ${schemeCode}`,
                        value: rate ? `${rate.rate} ${rate.unit}` : 'Brak stawki',
                        status: rate ? 'VALID' : 'ERROR',
                        evidence: {
                            source: 'Logika Biznesowa',
                            timestamp: now,
                            details: rate?.description || `Zastosowanie ekoschematu.`
                        }
                    };
                    agriNode.children?.push(schemeId);
                    nodes.push(schemeNode);
                }
            }
        }
    }

    return { nodes, rootId: campaignId };
};

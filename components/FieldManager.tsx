
// ... (imports remain the same)
import React, { useRef, useState, useEffect } from 'react';
import { Layers, Sprout, Calendar, X, AlertCircle, UploadCloud, FileCheck, AlertTriangle, Save, Loader2, Check } from 'lucide-react';
import { Field, CropType, CsvTemplate, FieldHistoryEntry, CsvTemplateType, FieldCropPart } from '../types';
import { CROP_TYPES } from '../constants';
import ParcelManager from './ParcelManager';
import CropManager from './CropManager';
import { analyzeFarmState } from '../services/farmLogic';

interface FieldManagerProps {
  fields: Field[];
  setFields: React.Dispatch<React.SetStateAction<Field[]>>;
  csvTemplates: CsvTemplate[];
  initialTab?: 'PARCELS' | 'CROPS';
  onSave?: () => Promise<boolean>;
}

const FieldManager: React.FC<FieldManagerProps> = ({ fields, setFields, csvTemplates, initialTab = 'PARCELS', onSave }) => {
  const [activeTab, setActiveTab] = useState<'PARCELS' | 'CROPS'>(initialTab);
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'IDLE' | 'SUCCESS' | 'ERROR'>('IDLE');
  
  // Update tab if initialTab prop changes
  useEffect(() => {
      setActiveTab(initialTab);
  }, [initialTab]);
  
  useEffect(() => {
      if (saveStatus !== 'IDLE') {
          const timer = setTimeout(() => setSaveStatus('IDLE'), 3000);
          return () => clearTimeout(timer);
      }
  }, [saveStatus]);

  // Import State
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [importType, setImportType] = useState<CsvTemplateType>('PARCELS');
  const [importReport, setImportReport] = useState<{success: number, skipped: number, errors: string[]} | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const availableYears = [2026, 2025, 2024, 2023, 2022, 2021];

  // --- HELPER: Parse Polish Numbers ---
  const parsePolishNumber = (val: any): number => {
      if (!val) return 0;
      let cleaned = String(val).trim();
      cleaned = cleaned.replace(/\s/g, ''); // remove spaces
      cleaned = cleaned.replace(/,/g, '.'); // comma to dot
      const num = parseFloat(cleaned);
      return isNaN(num) ? 0 : num;
  };

  // --- HELPER: Normalize Crop Name (Fuzzy Match) ---
  const normalizeCropName = (input: string): string => {
      if (!input) return 'Nieznana';
      const lower = input.toLowerCase().trim();
      
      // Fuzzy match against known types
      if (lower.includes('pszenic')) return 'Pszenica';
      if (lower.includes('rzepak')) return 'Rzepak';
      if (lower.includes('kukurydz')) return 'Kukurydza';
      if (lower.includes('burak')) return 'Burak Cukrowy';
      if (lower.includes('jęczmień') || lower.includes('jeczmien')) return 'Jęczmień';
      if (lower.includes('żyto') || lower.includes('zyto')) return 'Żyto';
      if (lower.includes('ziemnia')) return 'Ziemniaki';
      if (lower.includes('traw') || lower.includes('łąk') || lower.includes('pastwisk') || lower.includes('tuz')) return 'Trawy';
      if (lower.includes('bobowat') || lower.includes('strączk') || lower.includes('lucern') || lower.includes('koniczyn') || lower.includes('łubin') || lower.includes('groch') || lower.includes('bobik')) return 'Rośliny Bobowate';
      if (lower.includes('mieszan')) return 'Mieszanka';
      
      // If matches exact constant
      const exact = CROP_TYPES.find(c => c.toLowerCase() === lower);
      if (exact) return exact;

      // Fallback: Return capitalized raw input if it looks like a name, otherwise Nieznana
      if (input.trim().length > 2) return input.trim().charAt(0).toUpperCase() + input.trim().slice(1);
      return 'Nieznana';
  };

  // --- HELPER: Robust CSV Split ---
  const splitCSV = (line: string, separator: string) => {
    const res: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === separator && !inQuotes) {
        res.push(current.trim().replace(/^"|"$/g, '').trim());
        current = '';
      } else {
        current += char;
      }
    }
    res.push(current.trim().replace(/^"|"$/g, '').trim());
    return res;
  };

  const handleManualSave = async () => {
      if (!onSave) return;
      setIsSaving(true);
      const success = await onSave();
      setIsSaving(false);
      setSaveStatus(success ? 'SUCCESS' : 'ERROR');
  };

  // --- MANUAL COPY FUNCTIONALITY ---
  const handleCopyFromYear = (sourceYear: number, type: 'PARCELS' | 'CROPS') => {
      if (!window.confirm(`Czy na pewno chcesz skopiować stan ${type === 'PARCELS' ? 'działek' : 'zasiewów'} z roku ${sourceYear} do roku ${selectedYear}? Istniejące wpisy w roku ${selectedYear} mogą zostać nadpisane.`)) {
          return;
      }

      setFields(prevFields => {
          return prevFields.map(field => {
              const sourceHist = field.history.find(h => h.year === sourceYear);
              
              // If source year has no data, skip
              if (!sourceHist) return field;

              const existingHistIndex = field.history.findIndex(h => h.year === selectedYear);
              let newHist: FieldHistoryEntry;

              if (type === 'PARCELS') {
                  // Copy ONLY Geometry/Area info. Reset Crop to 'Nieznana' for new campaign.
                  newHist = {
                      year: selectedYear,
                      area: sourceHist.area || field.area,
                      eligibleArea: sourceHist.eligibleArea || field.eligibleArea,
                      crop: 'Nieznana', 
                      appliedEcoSchemes: [],
                      cropParts: [] // Reset crop parts
                  };
              } else {
                  // Copy Full Structure (Crops, EcoSchemes)
                  newHist = {
                      ...sourceHist,
                      year: selectedYear // Overwrite year
                  };
              }

              let updatedHistory = [...field.history];
              if (existingHistIndex >= 0) {
                  // Merge/Overwrite existing
                  updatedHistory[existingHistIndex] = { ...updatedHistory[existingHistIndex], ...newHist };
              } else {
                  updatedHistory.push(newHist);
              }
              updatedHistory.sort((a, b) => b.year - a.year);

              return { ...field, history: updatedHistory };
          });
      });
  };

  // --- CSV IMPORTS ---
  const handleDownloadTemplate = (type: CsvTemplateType) => {
      // Find the active template or use default headers
      const template = csvTemplates.find(t => t.type === type);
      let headers = "";
      let filename = "";

      if (template) {
          // Create headers based on the mapping values (user friendly names)
          headers = Object.values(template.mappings).join(template.separator) + "\n";
          filename = `szablon_${type.toLowerCase()}_${template.name.replace(/\s/g, '_')}.csv`;
      } else {
          // Fallback if no template selected (though UI restricts this)
          if (type === 'PARCELS') {
              headers = "Identyfikator działki;Województwo;Powiat;Gmina;Obręb;Nr działki;Powierzchnia Ha\n";
              filename = 'szablon_ewidencja_gruntow.csv';
          } else {
              headers = "Identyfikator działki;Nr działki;Uprawa;Ekoschematy\n";
              filename = 'szablon_struktura_zasiewow.csv';
          }
      }
      
      const bom = new Uint8Array([0xEF, 0xBB, 0xBF]); // UTF-8 BOM
      const blob = new Blob([bom, headers], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleImportClick = (type: CsvTemplateType) => {
      setImportType(type);
      setImportReport(null);
      // Auto-select first available template for this type
      const defaultTemplate = csvTemplates.find(t => t.type === type);
      setSelectedTemplateId(defaultTemplate ? defaultTemplate.id : '');
      setShowImportModal(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // --- AUTO-DETECT CONTEXT FROM FILENAME ---
    // Extract Year
    const yearMatch = file.name.match(/202[0-9]/);
    if (yearMatch) {
        const detectedYear = parseInt(yearMatch[0]);
        console.log("Detected Year from filename:", detectedYear);
        const matchingTemplate = csvTemplates.find(t => t.year === detectedYear && t.type === importType);
        if (matchingTemplate) {
            setSelectedTemplateId(matchingTemplate.id);
        }
    }

    const selectedTemplate = csvTemplates.find(t => t.id === selectedTemplateId);
    if (!selectedTemplate) {
        alert("Wybierz szablon importu.");
        if (fileInputRef.current) fileInputRef.current.value = ''; 
        return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
        let text = event.target?.result as string;
        if (!text) { alert("Plik jest pusty."); return; }

        try {
            if (text.charCodeAt(0) === 0xFEFF) {
                text = text.slice(1);
            }

            const firstLine = text.split('\n')[0];
            let separator = selectedTemplate.separator;
            if (firstLine) {
                const semicolons = (firstLine.match(/;/g) || []).length;
                const commas = (firstLine.match(/,/g) || []).length;
                if (semicolons > commas) separator = ';';
                else if (commas > semicolons) separator = ',';
            }

            const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim().length > 0);
            
            if (lines.length < 2) { 
                alert("Plik nie zawiera danych (tylko nagłówek lub pusty)."); 
                return; 
            }
            
            const fileHeaders = splitCSV(lines[0], separator).map(h => h.trim());
            
            // --- MAPPING STRATEGY ---
            const columnMap: Record<string, number> = {};
            const missingRequiredHeaders: string[] = [];
            const cleanHeader = (h: string) => h.toLowerCase().replace(/['"]/g, '').replace(/\s+/g, ' ').trim();

            Object.entries(selectedTemplate.mappings).forEach(([systemKey, templateHeaderName]) => {
                const searchName = cleanHeader(String(templateHeaderName));
                const index = fileHeaders.findIndex(h => {
                    const cleanedH = cleanHeader(h);
                    return cleanedH === searchName || cleanedH.includes(searchName);
                });
                
                if (index !== -1) {
                    columnMap[systemKey] = index;
                } else {
                    if (importType === 'PARCELS' && (systemKey === 'name' || systemKey === 'area')) missingRequiredHeaders.push(String(templateHeaderName));
                    if (importType === 'CROPS' && (systemKey === 'registrationNumber' || systemKey === 'crop')) missingRequiredHeaders.push(String(templateHeaderName));
                }
            });

            if (missingRequiredHeaders.length > 0) {
                alert(`Błąd struktury pliku. Nie znaleziono wymaganych kolumn w nagłówku pliku:\n\n${missingRequiredHeaders.join(', ')}\n\nSprawdź czy plik pasuje do wybranego szablonu: "${selectedTemplate.name}".`);
                return;
            }

            // --- PROCESSING ---
            const report = { success: 0, skipped: 0, errors: [] as string[] };
            
            const getVal = (rowCols: string[], key: string): string => {
                const idx = columnMap[key];
                if (idx !== undefined && rowCols[idx] !== undefined) return rowCols[idx];
                return '';
            };

            const processedFields: Field[] = [];
            // Updated Structure for Crop Processing to include Name (TERYT)
            const processedHistories: { name: string, regNum: string, entry: FieldHistoryEntry, area: number, designation: string }[] = [];

            // Iterate Data Rows
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i];
                const cols = splitCSV(line, separator);
                
                if (cols.length < 2) continue;

                if (importType === 'PARCELS') {
                    const name = getVal(cols, 'name');
                    const reg = getVal(cols, 'registrationNumber');
                    const areaStr = getVal(cols, 'area');
                    
                    if (!name && !reg) {
                        report.skipped++;
                        continue;
                    }

                    const finalName = name || (reg ? `Działka ${reg}` : `Działka ${i}`);
                    const finalReg = reg || `T_${i}`;

                    // IMPORTANT: We grab exact dimensions for this year
                    const exactArea = parsePolishNumber(areaStr);
                    const exactEligible = parsePolishNumber(getVal(cols, 'eligibleArea')) || exactArea;

                    // CHECK FOR DUPLICATES WITHIN THE SAME FILE AND AGGREGATE
                    // Many CSV exports list land classes as separate rows for the same Parcel ID.
                    // We must sum them up to get the total Parcel Area.
                    const existingInBatchIndex = processedFields.findIndex(f => 
                        (f.name && f.name === finalName) || 
                        (!f.name && f.registrationNumber === finalReg) // Strict matching logic
                    );

                    if (existingInBatchIndex >= 0) {
                        // Aggregate Area
                        processedFields[existingInBatchIndex].area += exactArea;
                        processedFields[existingInBatchIndex].eligibleArea += exactEligible;
                        
                        // Keep other metadata from first occurrence (usually identical)
                    } else {
                        processedFields.push({
                            id: Math.random().toString(36).substr(2, 9),
                            name: finalName,
                            registrationNumber: finalReg,
                            area: exactArea,
                            eligibleArea: exactEligible,
                            crop: 'Nieznana', 
                            history: [], 
                            voivodeship: getVal(cols, 'voivodeship'),
                            district: getVal(cols, 'district'),
                            commune: getVal(cols, 'commune'),
                            precinctName: getVal(cols, 'precinctName'),
                            precinctNumber: getVal(cols, 'precinctNumber'),
                            mapSheet: getVal(cols, 'mapSheet'),
                        });
                    }
                } 
                
                else if (importType === 'CROPS') {
                    const reg = getVal(cols, 'registrationNumber');
                    const name = getVal(cols, 'name'); // Try to get full identifier if mapped
                    const cropRaw = getVal(cols, 'crop');
                    
                    if (!reg) {
                        report.skipped++;
                        continue;
                    }

                    const normalizedCrop = normalizeCropName(cropRaw);
                    const ecoSchemesStr = getVal(cols, 'ecoSchemes');
                    
                    // FIX: Prioritize 'specificArea' over general 'area'
                    const areaStr = getVal(cols, 'area'); 
                    const specificAreaStr = getVal(cols, 'specificArea');
                    const valSpecific = parsePolishNumber(specificAreaStr);
                    const valGeneric = parsePolishNumber(areaStr);
                    
                    const finalArea = valSpecific > 0 ? valSpecific : valGeneric;
                    const designation = getVal(cols, 'designation');

                    const historyEntry: FieldHistoryEntry = {
                        year: selectedTemplate.year || selectedYear,
                        crop: normalizedCrop as CropType,
                        appliedEcoSchemes: ecoSchemesStr ? ecoSchemesStr.split(',').map(s=>s.trim()).filter(s=>s) : [],
                        area: finalArea,
                        designation: designation,
                        designationZal: getVal(cols, 'designationZal'),
                        paymentList: getVal(cols, 'paymentList'),
                        isUnreported: getVal(cols, 'isUnreported'),
                        plantMix: getVal(cols, 'plantMix'),
                        seedQuantity: getVal(cols, 'seedQuantity'),
                        organic: getVal(cols, 'organic'),
                        onwType: getVal(cols, 'onwType'),
                        onwArea: parsePolishNumber(getVal(cols, 'onwArea')),
                        prskPackage: getVal(cols, 'prskPackage'),
                        prskPractice: getVal(cols, 'prskPractice'),
                        prskFruitTreeVariety: getVal(cols, 'prskFruitTreeVariety'),
                        prskFruitTreeCount: parsePolishNumber(getVal(cols, 'prskFruitTreeCount')),
                        prskIntercropPlant: getVal(cols, 'prskIntercropPlant'),
                        prskUsage: getVal(cols, 'prskUsage'),
                        prskVariety: getVal(cols, 'prskVariety'),
                        zrskPackage: getVal(cols, 'zrskPackage'),
                        zrskPractice: getVal(cols, 'zrskPractice'),
                        zrskFruitTreeVariety: getVal(cols, 'zrskFruitTreeVariety'),
                        zrskFruitTreeCount: parsePolishNumber(getVal(cols, 'zrskFruitTreeCount')),
                        zrskUsage: getVal(cols, 'zrskUsage'),
                        zrskVariety: getVal(cols, 'zrskVariety'),
                        rePackage: getVal(cols, 'rePackage'),
                        notes: getVal(cols, 'notes'),
                    };

                    processedHistories.push({ 
                        name: name,
                        regNum: reg, 
                        entry: historyEntry,
                        area: finalArea,
                        designation: designation
                    });
                }
            }

            // --- APPLY CHANGES ---
            setFields(prevFields => {
                let newFields = [...prevFields];
                const importYear = selectedTemplate.year || selectedYear;
                const touchedFieldIds = new Set<string>(); // Tracks fields modified in this batch

                if (importType === 'PARCELS') {
                    processedFields.forEach(newItem => {
                        // STRICT MATCHING: Prefer matching by Name (TERYT) first, then RegNum
                        const existingIdx = newFields.findIndex(f => {
                            if (f.name && newItem.name && f.name === newItem.name) return true;
                            // Fallback to RegNum matching if Name is not consistent or missing
                            return f.registrationNumber && newItem.registrationNumber &&
                                   f.registrationNumber.replace(/\s/g,'').toLowerCase() === newItem.registrationNumber.replace(/\s/g,'').toLowerCase();
                        });

                        const newHistoryEntry: FieldHistoryEntry = {
                            year: importYear,
                            crop: 'Nieznana',
                            appliedEcoSchemes: [],
                            area: newItem.area,
                            eligibleArea: newItem.eligibleArea
                        };

                        if (existingIdx >= 0) {
                            const field = newFields[existingIdx];
                            const updatedHistory = [...field.history];
                            const existingHistIndex = updatedHistory.findIndex(h => h.year === importYear);
                            
                            if (existingHistIndex >= 0) {
                                updatedHistory[existingHistIndex] = {
                                    ...updatedHistory[existingHistIndex],
                                    area: newItem.area, // Update with aggregated area
                                    eligibleArea: newItem.eligibleArea // Update with aggregated area
                                };
                            } else {
                                updatedHistory.push(newHistoryEntry);
                            }
                            updatedHistory.sort((a, b) => b.year - a.year);

                            const maxYearInHistory = updatedHistory.length > 0 ? updatedHistory[0].year : 0;
                            const isNewestData = importYear >= maxYearInHistory;

                            newFields[existingIdx] = {
                                ...newFields[existingIdx],
                                name: isNewestData ? newItem.name : newFields[existingIdx].name,
                                area: isNewestData ? newItem.area : newFields[existingIdx].area,
                                eligibleArea: isNewestData ? newItem.eligibleArea : newFields[existingIdx].eligibleArea,
                                voivodeship: newItem.voivodeship,
                                district: newItem.district,
                                commune: newItem.commune,
                                precinctName: newItem.precinctName,
                                precinctNumber: newItem.precinctNumber,
                                mapSheet: newItem.mapSheet,
                                history: updatedHistory,
                            };
                            report.success++;
                        } else {
                            newItem.history = [newHistoryEntry];
                            newFields.push(newItem);
                            report.success++;
                        }
                    });
                } else {
                    // STRATEGY: CROPS (Split Parcels)
                    processedHistories.forEach(({ name, regNum, entry, area, designation }) => {
                        // STRICT MATCHING for Crops:
                        const existingIdx = newFields.findIndex(f => {
                            // 1. Precise Match by Name (TERYT) if available
                            if (name && f.name && f.name === name) return true;
                            
                            // 2. Fallback to RegNum ONLY IF:
                            //    a) Incoming doesn't have a name (legacy data)
                            //    b) OR Existing field name is generic (not a TERYT) or matches RegNum
                            //    c) AND RegNums match
                            if (f.registrationNumber && regNum &&
                                f.registrationNumber.replace(/\s/g,'').toLowerCase() === regNum.replace(/\s/g,'').toLowerCase()) {
                                
                                // SAFETY CHECK: If existing field has a distinct TERYT (long ID with dots/underscores)
                                // and incoming name is DIFFERENT (and present), DO NOT MATCH.
                                const existingIsTeryt = f.name.includes('.') || f.name.includes('_');
                                const incomingIsTeryt = name && (name.includes('.') || name.includes('_'));
                                
                                if (existingIsTeryt && incomingIsTeryt && f.name !== name) {
                                    return false; // Different TERYTs, same RegNum (different precincts). Don't merge.
                                }
                                return true;
                            }
                            return false;
                        });

                        if (existingIdx >= 0) {
                            const field = newFields[existingIdx];
                            const updatedHistory = [...field.history];
                            const histIdx = updatedHistory.findIndex(h => h.year === entry.year);

                            const partToAdd: FieldCropPart = {
                                designation: designation || 'A',
                                crop: entry.crop,
                                area: area,
                                ecoSchemes: entry.appliedEcoSchemes,
                                designationZal: entry.designationZal,
                                paymentList: entry.paymentList,
                                plantMix: entry.plantMix
                            };

                            if (histIdx >= 0) {
                                const existingEntry = updatedHistory[histIdx];
                                
                                // CRITICAL FIX: Clear old crop parts if this field is being touched for the first time in this batch
                                // This prevents duplicate accumulation if user re-imports the same file or updates data.
                                let updatedParts = existingEntry.cropParts ? [...existingEntry.cropParts] : [];
                                
                                if (!touchedFieldIds.has(field.id)) {
                                    // Reset parts for this year as we are starting a fresh update for this field in this batch
                                    updatedParts = []; 
                                    touchedFieldIds.add(field.id);
                                }

                                const existingPartIdx = updatedParts.findIndex(p => p.designation === designation);
                                
                                if (existingPartIdx >= 0) {
                                    // MERGE LOGIC (within the same batch): If a part with this designation already exists, sum area and merge eco-schemes
                                    const existingPart = updatedParts[existingPartIdx];
                                    updatedParts[existingPartIdx] = {
                                        ...existingPart,
                                        area: existingPart.area + partToAdd.area, // Sum Area
                                        ecoSchemes: Array.from(new Set([...existingPart.ecoSchemes, ...partToAdd.ecoSchemes])), // Merge EcoSchemes
                                        paymentList: partToAdd.paymentList || existingPart.paymentList
                                    };
                                } else {
                                    updatedParts.push(partToAdd);
                                }

                                updatedHistory[histIdx] = {
                                    ...existingEntry,
                                    cropParts: updatedParts,
                                    crop: updatedParts.length > 1 ? 'Mieszana' : entry.crop,
                                    appliedEcoSchemes: Array.from(new Set([...existingEntry.appliedEcoSchemes, ...entry.appliedEcoSchemes]))
                                };
                            } else {
                                const newEntry: FieldHistoryEntry = {
                                    ...entry,
                                    cropParts: [partToAdd]
                                };
                                updatedHistory.push(newEntry);
                                touchedFieldIds.add(field.id);
                            }
                            updatedHistory.sort((a, b) => b.year - a.year);

                            const isPlanYear = entry.year === 2026;
                            const maxYearInHistory = updatedHistory.length > 0 ? updatedHistory[0].year : 0;
                            const isNewestData = entry.year >= maxYearInHistory;

                            newFields[existingIdx] = {
                                ...field,
                                history: updatedHistory,
                                crop: (isPlanYear || isNewestData) ? (updatedHistory[0].cropParts?.length ? 'Mieszana' : entry.crop) : field.crop
                            };
                            report.success++;
                        } else {
                            // Creating new field from crop - usually shouldn't happen if Parcels imported first
                            const isPlanYear = entry.year === 2026;
                            const finalName = name || `Działka ${regNum}`;
                            const partToAdd: FieldCropPart = {
                                designation: designation || 'A',
                                crop: entry.crop,
                                area: area || 0,
                                ecoSchemes: entry.appliedEcoSchemes,
                                designationZal: entry.designationZal,
                                paymentList: entry.paymentList,
                                plantMix: entry.plantMix
                            };

                            newFields.push({
                                id: Math.random().toString(36).substr(2, 9),
                                name: finalName,
                                registrationNumber: regNum,
                                area: area || 0,
                                eligibleArea: area || 0,
                                crop: isPlanYear ? entry.crop : 'Nieznana',
                                history: [{
                                    ...entry,
                                    cropParts: [partToAdd]
                                }],
                            });
                            report.success++;
                        }
                    });
                }

                // POST-IMPORT VALIDATION TRIGGER
                const tempFarmData = {
                    farmName: 'Temp',
                    profile: { producerId: 'Temp', totalAreaUR: 0, entryConditionPoints: 0 },
                    fields: newFields
                };
                
                const totalAreaUR = newFields.reduce((sum, f) => {
                    const hist = f.history.find(h => h.year === importYear);
                    return sum + (hist?.area || f.area);
                }, 0);
                tempFarmData.profile.totalAreaUR = totalAreaUR;

                const analysis = analyzeFarmState(tempFarmData, importYear);
                
                if (analysis.validationIssues.length > 0) {
                    report.errors.push(`Wykryto ${analysis.validationIssues.length} ostrzeżeń walidacji! Sprawdź Pulpit.`);
                }

                // --- AUTO-SWITCH YEAR FIX ---
                // Automatically switch view to the year we just imported
                if (importYear !== selectedYear) {
                    setSelectedYear(importYear);
                }

                return newFields;
            });

            setImportReport(report);

        } catch (error) {
            console.error(error);
            alert("Krytyczny błąd przetwarzania pliku CSV.");
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Menedżer Pól i Zasiewów</h2>
          <p className="text-slate-500 mt-1">
              Zarządzaj ewidencją gruntów oraz strukturą zasiewów.
          </p>
        </div>
        
        <div className="flex flex-col items-end gap-3">
             <div className="flex items-center gap-2">
                 {/* Explicit Save Button */}
                 {onSave && (
                     <button
                        onClick={handleManualSave}
                        disabled={isSaving}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm shadow-sm transition-all ${
                            saveStatus === 'SUCCESS' 
                            ? 'bg-green-100 text-green-700 border border-green-200'
                            : saveStatus === 'ERROR'
                                ? 'bg-red-100 text-red-700 border border-red-200'
                                : 'bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow'
                        }`}
                     >
                        {isSaving ? <Loader2 size={16} className="animate-spin" /> : 
                         saveStatus === 'SUCCESS' ? <Check size={16} /> :
                         saveStatus === 'ERROR' ? <AlertCircle size={16} /> :
                         <Save size={16} />}
                         
                         {isSaving ? 'Zapisywanie...' : 
                          saveStatus === 'SUCCESS' ? 'Zapisano!' :
                          saveStatus === 'ERROR' ? 'Błąd' :
                          'Zapisz w Bazie'}
                     </button>
                 )}
                 
                 <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
                     <span className="text-xs font-bold text-slate-500 uppercase px-2">Rok Kampanii:</span>
                     <div className="relative">
                        <select 
                            value={selectedYear}
                            onChange={(e) => { setSelectedYear(Number(e.target.value)); }}
                            className="appearance-none bg-white border border-slate-300 text-slate-700 py-1.5 pl-3 pr-8 rounded-md text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                        >
                            {availableYears.map(year => (
                                <option key={year} value={year}>{year} {year === 2026 ? '(Plan)' : ''}</option>
                            ))}
                        </select>
                        <Calendar className="absolute right-2 top-1.5 text-slate-400 pointer-events-none" size={16} />
                     </div>
                 </div>
            </div>
        </div>
      </div>

      {/* TABS */}
      <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl w-fit">
          <button
            onClick={() => { setActiveTab('PARCELS'); }}
            className={`px-6 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all ${
                activeTab === 'PARCELS' 
                ? 'bg-white text-emerald-700 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Layers size={18} />
            Ewidencja Gruntów ({selectedYear})
          </button>
          <button
            onClick={() => { setActiveTab('CROPS'); }}
            className={`px-6 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all ${
                activeTab === 'CROPS' 
                ? 'bg-white text-emerald-700 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Sprout size={18} />
            Struktura Zasiewów ({selectedYear})
          </button>
      </div>

      {/* CONTENT (Render Sub-Component) */}
      {activeTab === 'PARCELS' ? (
          <ParcelManager 
            fields={fields} 
            selectedYear={selectedYear}
            onUpdateFields={(updated) => setFields(updated)}
            onImport={() => handleImportClick('PARCELS')}
            onDownload={() => handleDownloadTemplate('PARCELS')}
            onCopyFromYear={(src) => handleCopyFromYear(src, 'PARCELS')}
          />
      ) : (
          <CropManager 
            fields={fields} 
            selectedYear={selectedYear} 
            onUpdateFields={(updated) => setFields(updated)}
            onImport={() => handleImportClick('CROPS')}
            onDownload={() => handleDownloadTemplate('CROPS')}
            onCopyFromYear={(src) => handleCopyFromYear(src, 'CROPS')}
          />
      )}

      {/* IMPORT MODAL */}
      {showImportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowImportModal(false)}></div>
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-md relative z-10 animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex justify-between items-center p-5 border-b border-slate-100">
                      <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                          <UploadCloud className="text-emerald-600"/> Import CSV: {importType === 'PARCELS' ? 'Ewidencja Gruntów' : 'Struktura Zasiewów'}
                      </h3>
                      <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-slate-600">
                          <X size={24} />
                      </button>
                  </div>
                  
                  <div className="p-6 space-y-4">
                      {csvTemplates.filter(t => t.type === importType).length === 0 ? (
                           <div className="bg-amber-50 p-4 rounded-lg border border-amber-200 text-amber-800 text-sm flex gap-3 items-start">
                              <AlertCircle className="flex-shrink-0 mt-0.5" size={18} />
                              <div>
                                  <strong>Brak szablonów dla tej kategorii.</strong>
                                  <p className="mt-1">Przejdź do <strong>Panelu Administratora</strong>, aby zdefiniować mapowanie kolumn CSV.</p>
                              </div>
                           </div>
                      ) : (
                          <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Wybierz Szablon Importu</label>
                              <select 
                                value={selectedTemplateId}
                                onChange={(e) => { setSelectedTemplateId(e.target.value); setImportReport(null); }}
                                className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                              >
                                  <option value="">-- Wybierz szablon --</option>
                                  {csvTemplates.filter(t => t.type === importType).map(t => (
                                      <option key={t.id} value={t.id}>{t.name} (Rok: {t.year || 'Brak'}, sep: '{t.separator}')</option>
                                  ))}
                              </select>
                          </div>
                      )}

                      {!importReport ? (
                          <div className="pt-2">
                              <input 
                                  type="file" 
                                  ref={fileInputRef}
                                  accept=".csv,.txt"
                                  className="hidden"
                                  onChange={handleFileUpload}
                              />
                              <button 
                                  onClick={() => {
                                      if (!selectedTemplateId) {
                                           alert("Musisz wybrać szablon.");
                                           return;
                                      }
                                      // Explicit reset before click to allow same file selection
                                      if (fileInputRef.current) fileInputRef.current.value = '';
                                      fileInputRef.current?.click();
                                  }}
                                  className={`w-full py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all ${
                                      !selectedTemplateId 
                                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                      : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm'
                                  }`}
                              >
                                  <UploadCloud size={18} />
                                  Wybierz Plik i Importuj
                              </button>
                          </div>
                      ) : (
                          <div className="animate-in fade-in zoom-in-95">
                              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                                  <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                                      <FileCheck size={18} className="text-emerald-600"/> Raport Importu
                                  </h4>
                                  <div className="text-sm space-y-1">
                                      <div className="flex justify-between">
                                          <span>Przetworzono poprawnie:</span>
                                          <span className="font-bold text-emerald-600">{importReport.success}</span>
                                      </div>
                                      <div className="flex justify-between">
                                          <span>Pominięto (puste/błędy):</span>
                                          <span className="font-bold text-slate-500">{importReport.skipped}</span>
                                      </div>
                                      {importType === 'CROPS' && (
                                          <div className="flex justify-between text-blue-600">
                                              <span>Utworzono nowych działek:</span>
                                              <span className="font-bold">{importReport.errors.length === 0 ? 'Automatycznie' : '0'}</span>
                                          </div>
                                      )}
                                  </div>
                                  
                                  {importReport.errors.length > 0 && (
                                      <div className="mt-3 pt-3 border-t border-slate-200">
                                          <p className="text-xs font-bold text-red-500 mb-1 flex items-center gap-1">
                                              <AlertTriangle size={12}/> Błędy dopasowania:
                                          </p>
                                          <div className="max-h-24 overflow-y-auto text-xs text-red-400 bg-white p-2 rounded border border-red-100">
                                              {importReport.errors.slice(0, 10).map((err, i) => (
                                                  <div key={i}>{err}</div>
                                              ))}
                                              {importReport.errors.length > 10 && <div>...i {importReport.errors.length - 10} więcej.</div>}
                                          </div>
                                      </div>
                                  )}
                              </div>
                              <button 
                                  onClick={() => setShowImportModal(false)}
                                  className="w-full mt-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-medium"
                              >
                                  Zamknij
                              </button>
                          </div>
                      )}
                      
                      {!importReport && (
                        <p className="text-xs text-slate-500 text-center">
                            Upewnij się, że plik CSV jest zgodny z wybranym szablonem.
                        </p>
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default FieldManager;

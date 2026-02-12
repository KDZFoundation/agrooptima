
import React, { useRef, useState, useEffect } from 'react';
import { Layers, Sprout, Calendar, X, AlertCircle, UploadCloud, FileCheck, AlertTriangle } from 'lucide-react';
import { Field, CropType, CsvTemplate, FieldHistoryEntry, CsvTemplateType } from '../types';
import { CROP_TYPES } from '../constants';
import ParcelManager from './ParcelManager';
import CropManager from './CropManager';

interface FieldManagerProps {
  fields: Field[];
  setFields: React.Dispatch<React.SetStateAction<Field[]>>;
  csvTemplates: CsvTemplate[];
  initialTab?: 'PARCELS' | 'CROPS';
}

const FieldManager: React.FC<FieldManagerProps> = ({ fields, setFields, csvTemplates, initialTab = 'PARCELS' }) => {
  const [activeTab, setActiveTab] = useState<'PARCELS' | 'CROPS'>(initialTab);
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  
  // Update tab if initialTab prop changes
  useEffect(() => {
      setActiveTab(initialTab);
  }, [initialTab]);
  
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
              headers = "Nr działki;Uprawa;Ekoschematy\n";
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
            // Remove BOM if present
            if (text.charCodeAt(0) === 0xFEFF) {
                text = text.slice(1);
            }

            // AUTO-DETECT SEPARATOR
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
            // We need to map System Keys -> Column Index in CSV
            const columnMap: Record<string, number> = {};
            const missingRequiredHeaders: string[] = [];

            // Helper to clean header strings for comparison: lowercase, remove quotes, NORMALIZE SPACES
            const cleanHeader = (h: string) => h.toLowerCase().replace(/['"]/g, '').replace(/\s+/g, ' ').trim();

            Object.entries(selectedTemplate.mappings).forEach(([systemKey, templateHeaderName]) => {
                const searchName = cleanHeader(String(templateHeaderName));
                
                // Find index where header matches (exact or contains)
                // Using cleanHeader on both sides ensures "Oznaczenie Uprawy  / działki" matches "oznaczenie uprawy / działki"
                const index = fileHeaders.findIndex(h => {
                    const cleanedH = cleanHeader(h);
                    return cleanedH === searchName || cleanedH.includes(searchName);
                });
                
                if (index !== -1) {
                    columnMap[systemKey] = index;
                } else {
                    // Check strict requirements
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
            
            // Helper to get value from row based on system key
            const getVal = (rowCols: string[], key: string): string => {
                const idx = columnMap[key];
                if (idx !== undefined && rowCols[idx] !== undefined) return rowCols[idx];
                return '';
            };

            const processedFields: Field[] = [];
            // Updated to store optional area for creation
            const processedHistories: { regNum: string, entry: FieldHistoryEntry, area: number }[] = [];

            // Iterate Data Rows
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i];
                const cols = splitCSV(line, separator);
                
                // Skip empty lines
                if (cols.length < 2) continue;

                // ---------------------------
                // MODE: PARCELS (Ewidencja)
                // ---------------------------
                if (importType === 'PARCELS') {
                    const name = getVal(cols, 'name');
                    const reg = getVal(cols, 'registrationNumber');
                    const areaStr = getVal(cols, 'area');
                    
                    if (!areaStr || parsePolishNumber(areaStr) <= 0) {
                        report.skipped++;
                        continue;
                    }

                    const finalName = name || (reg ? `Działka ${reg}` : `Działka ${i}`);
                    const finalReg = reg || `T_${i}`; // Temporary ID if missing reg

                    processedFields.push({
                        id: Math.random().toString(36).substr(2, 9),
                        name: finalName,
                        registrationNumber: finalReg,
                        area: parsePolishNumber(areaStr),
                        eligibleArea: parsePolishNumber(getVal(cols, 'eligibleArea')) || parsePolishNumber(areaStr),
                        crop: 'Nieznana', // Parcels import does NOT set crop
                        history: [], // History initialized empty, filled during merge
                        // Location data
                        voivodeship: getVal(cols, 'voivodeship'),
                        district: getVal(cols, 'district'),
                        commune: getVal(cols, 'commune'),
                        precinctName: getVal(cols, 'precinctName'),
                        precinctNumber: getVal(cols, 'precinctNumber'),
                        mapSheet: getVal(cols, 'mapSheet'),
                    });
                } 
                
                // ---------------------------
                // MODE: CROPS (Struktura)
                // ---------------------------
                else if (importType === 'CROPS') {
                    const reg = getVal(cols, 'registrationNumber');
                    const cropRaw = getVal(cols, 'crop');
                    
                    // Allow import if at least reg number is present, even if crop is empty (treat as Nieznana)
                    if (!reg) {
                        report.skipped++;
                        continue;
                    }

                    // Strict matching requires Registration Number
                    const normalizedCrop = normalizeCropName(cropRaw);
                    const ecoSchemesStr = getVal(cols, 'ecoSchemes');
                    
                    // Attempt to get area from 'area' or 'specificArea' (common in ARiMR exports)
                    const areaStr = getVal(cols, 'area'); 
                    const specificAreaStr = getVal(cols, 'specificArea');
                    const finalArea = parsePolishNumber(areaStr) || parsePolishNumber(specificAreaStr);

                    const historyEntry: FieldHistoryEntry = {
                        year: selectedTemplate.year || selectedYear,
                        crop: normalizedCrop as CropType,
                        appliedEcoSchemes: ecoSchemesStr ? ecoSchemesStr.split(',').map(s=>s.trim()).filter(s=>s) : [],
                        // Extended data
                        designation: getVal(cols, 'designation'),
                        designationZal: getVal(cols, 'designationZal'),
                        paymentList: getVal(cols, 'paymentList'),
                        isUnreported: getVal(cols, 'isUnreported'),
                        plantMix: getVal(cols, 'plantMix'),
                        seedQuantity: getVal(cols, 'seedQuantity'),
                        organic: getVal(cols, 'organic'),
                        onwType: getVal(cols, 'onwType'),
                        onwArea: parsePolishNumber(getVal(cols, 'onwArea')),
                        
                        // PRSK
                        prskPackage: getVal(cols, 'prskPackage'),
                        prskPractice: getVal(cols, 'prskPractice'),
                        prskFruitTreeVariety: getVal(cols, 'prskFruitTreeVariety'),
                        prskFruitTreeCount: parsePolishNumber(getVal(cols, 'prskFruitTreeCount')),
                        prskIntercropPlant: getVal(cols, 'prskIntercropPlant'),
                        prskUsage: getVal(cols, 'prskUsage'),
                        prskVariety: getVal(cols, 'prskVariety'),

                        // ZRSK
                        zrskPackage: getVal(cols, 'zrskPackage'),
                        zrskPractice: getVal(cols, 'zrskPractice'),
                        zrskFruitTreeVariety: getVal(cols, 'zrskFruitTreeVariety'),
                        zrskFruitTreeCount: parsePolishNumber(getVal(cols, 'zrskFruitTreeCount')),
                        zrskUsage: getVal(cols, 'zrskUsage'),
                        zrskVariety: getVal(cols, 'zrskVariety'),

                        // RE
                        rePackage: getVal(cols, 'rePackage'),
                        
                        notes: getVal(cols, 'notes'),
                    };

                    processedHistories.push({ 
                        regNum: reg, 
                        entry: historyEntry,
                        area: finalArea
                    });
                }
            }

            // --- APPLY CHANGES ---
            setFields(prevFields => {
                let newFields = [...prevFields];

                if (importType === 'PARCELS') {
                    // PARCELS Strategy: Update existing by RegNum, or Add New.
                    // This logic remains tied to strict Registration Number matching.
                    // IMPORTANT: We also ensure the field has a history entry for the import year to mark it as active.
                    const importYear = selectedTemplate.year || selectedYear;

                    processedFields.forEach(newItem => {
                        const existingIdx = newFields.findIndex(f => 
                            f.registrationNumber && newItem.registrationNumber &&
                            f.registrationNumber.replace(/\s/g,'').toLowerCase() === newItem.registrationNumber.replace(/\s/g,'').toLowerCase()
                        );

                        if (existingIdx >= 0) {
                            // Update structure, KEEP history
                            const field = newFields[existingIdx];
                            const updatedHistory = [...field.history];
                            
                            // Ensure history entry for importYear exists so it shows up in filtered view
                            if (!updatedHistory.find(h => h.year === importYear)) {
                                updatedHistory.push({
                                    year: importYear,
                                    crop: 'Nieznana',
                                    appliedEcoSchemes: []
                                });
                                updatedHistory.sort((a, b) => b.year - a.year);
                            }

                            newFields[existingIdx] = {
                                ...newFields[existingIdx],
                                name: newItem.name,
                                area: newItem.area,
                                eligibleArea: newItem.eligibleArea,
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
                            // Add new
                            // Initialize with history entry for this year
                            newItem.history = [{
                                year: importYear,
                                crop: 'Nieznana',
                                appliedEcoSchemes: []
                            }];
                            newFields.push(newItem);
                            report.success++;
                        }
                    });
                } else {
                    // CROPS Strategy: DECOUPLED FROM REGISTRY
                    // We treat the import as authoritative for agricultural parcels (Działki Rolne).
                    // We match based on Registration Number AND Designation to support multiple crops (A, B, C) on one physical parcel.
                    
                    processedHistories.forEach(({ regNum, entry, area }) => {
                        // Determine a unique identifier for this crop/parcel combination
                        // If designation exists (A, B, C), we use it to distinguish.
                        const designation = entry.designation || entry.designationZal || '';
                        
                        // We construct a specific name suffix to look for, e.g., " - A"
                        // This allows us to map to existing "Split" fields if we already imported them.
                        const nameSuffix = designation ? ` - ${designation}` : '';

                        const existingIdx = newFields.findIndex(f => 
                            f.registrationNumber && regNum &&
                            f.registrationNumber.replace(/\s/g,'').toLowerCase() === regNum.replace(/\s/g,'').toLowerCase() &&
                            // CRITICAL: If designation exists, we ONLY match fields that have it in name (created by previous import)
                            // If designation is empty, we match fields without extra suffix OR we just create new to be safe?
                            // We'll try to match exact logic to prevent duplicates on re-import.
                            (designation ? f.name.endsWith(nameSuffix) : !f.name.includes(' - '))
                        );

                        if (existingIdx >= 0) {
                            // Update existing Agricultural Parcel
                            const field = newFields[existingIdx];
                            const updatedHistory = [...field.history];
                            
                            const histIdx = updatedHistory.findIndex(h => h.year === entry.year);
                            if (histIdx >= 0) {
                                updatedHistory[histIdx] = entry; // Overwrite
                            } else {
                                updatedHistory.push(entry);
                            }
                            updatedHistory.sort((a, b) => b.year - a.year);

                            // Always update main crop if this is the active year import
                            const isPlanYear = entry.year === 2026; // Or logic to check against selected template year
                            
                            newFields[existingIdx] = {
                                ...field,
                                history: updatedHistory,
                                crop: isPlanYear ? entry.crop : field.crop,
                                area: area > 0 ? area : field.area // Update area if provided in crop file (often specific to the crop part)
                            };
                            report.success++;
                        } else {
                            // Create NEW Agricultural Parcel (Działka Rolna)
                            // This effectively splits the physical parcel into parts A, B, C in the UI list.
                            const isPlanYear = entry.year === 2026;
                            
                            // Construct Name: "Działka 123/4 - A"
                            const finalName = `Działka ${regNum}${nameSuffix}`;

                            newFields.push({
                                id: Math.random().toString(36).substr(2, 9),
                                name: finalName,
                                registrationNumber: regNum,
                                area: area || 0, // This is the area of the CROP part (e.g. 5ha out of 10ha)
                                eligibleArea: area || 0,
                                crop: isPlanYear ? entry.crop : 'Nieznana',
                                history: [entry],
                            });
                            report.success++;
                        }
                    });
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
          />
      ) : (
          <CropManager 
            fields={fields} 
            selectedYear={selectedYear} 
            onUpdateFields={(updated) => setFields(updated)}
            onImport={() => handleImportClick('CROPS')}
            onDownload={() => handleDownloadTemplate('CROPS')}
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

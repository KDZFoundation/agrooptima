
import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Layers, Sprout, Calendar, X, AlertCircle, UploadCloud, FileCheck, AlertTriangle, Save, Loader2, Check, Settings, Info } from 'lucide-react';
import { Field, CropType, CsvTemplate, FieldHistoryEntry, CsvTemplateType, FieldCropPart } from '../types';
import { CROP_TYPES } from '../constants';
import ParcelManager from './ParcelManager';
import CropManager from './CropManager';

interface FieldManagerProps {
  fields: Field[];
  setFields: React.Dispatch<React.SetStateAction<Field[]>>;
  csvTemplates: CsvTemplate[];
  initialTab?: 'PARCELS' | 'CROPS';
  selectedYear: number;
  setSelectedYear: (year: number) => void;
  onSave?: (currentFields: Field[]) => Promise<boolean>;
}

const FieldManager: React.FC<FieldManagerProps> = ({ fields, setFields, csvTemplates, initialTab = 'PARCELS', selectedYear, setSelectedYear, onSave }) => {
  const [activeTab, setActiveTab] = useState<'PARCELS' | 'CROPS'>(initialTab);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'IDLE' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [isDirty, setIsDirty] = useState(false);
  
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [importType, setImportType] = useState<CsvTemplateType>('PARCELS');
  const [importReport, setImportReport] = useState<{success: number, skipped: number, merged: number, errors: string[]} | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const availableYears = [2026, 2025, 2024, 2023, 2022, 2021];

  useEffect(() => {
      setActiveTab(initialTab);
  }, [initialTab]);
  
  useEffect(() => {
      if (saveStatus !== 'IDLE') {
          const timer = setTimeout(() => setSaveStatus('IDLE'), 3000);
          return () => clearTimeout(timer);
      }
  }, [saveStatus]);

  const filteredTemplates = useMemo(() => {
      return csvTemplates
          .filter(t => t.type === importType)
          .sort((a, b) => b.year - a.year);
  }, [csvTemplates, importType]);

  useEffect(() => {
      if (showImportModal && filteredTemplates.length > 0) {
          const exactMatch = filteredTemplates.find(t => t.year === selectedYear);
          setSelectedTemplateId(exactMatch ? exactMatch.id : filteredTemplates[0].id);
      }
  }, [showImportModal, importType, selectedYear, filteredTemplates]);

  const handleImportClick = (type: CsvTemplateType) => {
    setImportType(type);
    setImportReport(null);
    setShowImportModal(true);
  };

  const handleDownloadTemplate = () => {
    const template = csvTemplates.find(t => t.id === selectedTemplateId);
    if (!template) return;
    const headers = Object.values(template.mappings).join(template.separator);
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), headers], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `szablon_${template.type.toLowerCase()}_${template.year}.csv`;
    link.click();
  };

  const parsePolishNumber = (val: any): number => {
      if (!val) return 0;
      let cleaned = String(val).trim().replace(/\s/g, '').replace(/,/g, '.').replace(/"/g, '');
      const num = parseFloat(cleaned);
      return isNaN(num) ? 0 : num;
  };

  const normalizeRegNum = (num: string): string => {
      if (!num) return '';
      return num.toString().trim()
          .replace(/[\s\.\-_]/g, '')
          .split('/')
          .map(part => part.replace(/^0+/, '') || '0')
          .join('/')
          .toLowerCase();
  };

  const splitCSV = (line: string, separator: string) => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') inQuotes = !inQuotes;
        else if (char === separator && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else current += char;
    }
    result.push(current.trim());
    return result.map(v => v.replace(/^"|"$/g, '').replace(/""/g, '"'));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const template = csvTemplates.find(t => t.id === selectedTemplateId);
    if (!template) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        let text = event.target?.result as string;
        if (!text) return;
        
        try {
            // Remove BOM and normalize line endings
            if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
            const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
            if (lines.length < 2) {
                alert("Plik jest pusty lub zawiera tylko nagłówek.");
                return;
            }
            
            const separator = template.separator;
            const fileHeaders = splitCSV(lines[0], separator).map(h => h.trim().toLowerCase());
            const columnMap: Record<string, number> = {};
            
            Object.entries(template.mappings).forEach(([systemKey, csvHeader]) => {
                const searchHeader = (csvHeader as string).trim().toLowerCase();
                const idx = fileHeaders.indexOf(searchHeader);
                if (idx !== -1) columnMap[systemKey] = idx;
            });

            const report = { success: 0, skipped: 0, merged: 0, errors: [] as string[] };
            const getVal = (rowCols: string[], key: string): string => {
                const idx = columnMap[key];
                return (idx !== undefined && idx < rowCols.length) ? (rowCols[idx] as string).trim() : '';
            };

            setFields(prevFields => {
                const newFields = [...prevFields];
                const touchedIds = new Set<string>();

                for (let i = 1; i < lines.length; i++) {
                    const cols = splitCSV(lines[i], separator);
                    if (cols.length < 2) continue;

                    const rawReg = getVal(cols, 'registrationNumber');
                    if (!rawReg) { report.skipped++; continue; }
                    const normReg = normalizeRegNum(rawReg);

                    let existingIdx = newFields.findIndex(f => normalizeRegNum(f.registrationNumber || '') === normReg);
                    
                    if (importType === 'PARCELS') {
                        const area = parsePolishNumber(getVal(cols, 'area'));
                        const eligible = getVal(cols, 'eligibleArea') ? parsePolishNumber(getVal(cols, 'eligibleArea')) : area;
                        
                        if (existingIdx >= 0) {
                            const field = newFields[existingIdx];
                            const hist = [...field.history];
                            const hIdx = hist.findIndex(h => h.year === selectedYear);
                            
                            const newHistEntry = { year: selectedYear, crop: 'Nieznana', appliedEcoSchemes: [], area, eligibleArea: eligible };
                            if (hIdx >= 0) hist[hIdx] = { ...hist[hIdx], area, eligibleArea: eligible };
                            else hist.push(newHistEntry);
                            
                            newFields[existingIdx] = { ...field, area, eligibleArea: eligible, history: hist.sort((a,b)=>b.year-a.year) };
                            report.success++;
                        } else {
                            const newId = Math.random().toString(36).substr(2, 9);
                            newFields.push({
                                id: newId, name: getVal(cols, 'name') || `Działka ${rawReg}`, registrationNumber: rawReg,
                                area, eligibleArea: eligible, crop: 'Nieznana',
                                commune: getVal(cols, 'commune'), precinctName: getVal(cols, 'precinctName'),
                                history: [{ year: selectedYear, crop: 'Nieznana', appliedEcoSchemes: [], area, eligibleArea: eligible }]
                            });
                            report.success++;
                        }
                    } else {
                        // IMPORT ZASIEWÓW
                        const cropRaw = getVal(cols, 'crop');
                        if (!cropRaw) { report.skipped++; continue; }
                        const areaVal = parsePolishNumber(getVal(cols, 'specificArea') || getVal(cols, 'area'));

                        if (existingIdx === -1) {
                            const newId = Math.random().toString(36).substr(2, 9);
                            newFields.push({ 
                                id: newId, 
                                name: `Działka ${rawReg}`, 
                                registrationNumber: rawReg, 
                                area: areaVal, 
                                eligibleArea: 0, 
                                crop: cropRaw, 
                                history: [] 
                            });
                            existingIdx = newFields.length - 1;
                        }

                        const field = newFields[existingIdx];
                        const hist = [...field.history];
                        let hIdx = hist.findIndex(h => h.year === selectedYear);

                        if (hIdx === -1) {
                            hist.push({ 
                                year: selectedYear, 
                                crop: cropRaw, 
                                appliedEcoSchemes: [], 
                                area: areaVal, 
                                eligibleArea: 0, 
                                cropParts: [] 
                            });
                            hIdx = hist.length - 1;
                        }

                        if (!touchedIds.has(field.id)) {
                            hist[hIdx].cropParts = [];
                            touchedIds.add(field.id);
                        }

                        hist[hIdx].cropParts?.push({
                            designation: getVal(cols, 'designation') || String.fromCharCode(65 + (hist[hIdx].cropParts?.length || 0)),
                            crop: cropRaw, area: areaVal, ecoSchemes: (getVal(cols, 'ecoSchemes') || '').split(/[,;|]/).map(s=>s.trim()).filter(s=>s)
                        });
                        hist[hIdx].crop = hist[hIdx].cropParts!.length > 1 ? 'Wiele upraw' : hist[hIdx].cropParts![0].crop;
                        newFields[existingIdx] = { ...field, history: hist.sort((a,b)=>b.year-a.year) };
                        report.success++;
                    }
                }
                setIsDirty(true);
                return newFields;
            });
            setImportReport(report);
        } catch (e) {
            console.error("CSV Import Error:", e);
            alert("Błąd importu: sprawdź separator i nagłówki pliku.");
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };
    reader.readAsText(file);
  };

  const performSave = async () => {
    setIsSaving(true);
    try {
        const ok = await onSave?.(fields);
        if (ok) {
            setSaveStatus('SUCCESS');
            setIsDirty(false);
        } else {
            setSaveStatus('ERROR');
        }
    } catch (e) {
        setSaveStatus('ERROR');
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Menedżer Pola</h2>
          <p className="text-sm mt-1">{isDirty ? <span className="text-orange-600 font-bold">Niezapisane zmiany</span> : <span className="text-emerald-600 font-medium">Baza aktualna</span>}</p>
        </div>
        <div className="flex gap-3">
            <select value={selectedYear} onChange={(e)=>setSelectedYear(Number(e.target.value))} className="bg-slate-100 border-none rounded-lg px-4 py-2 font-bold text-sm">
                {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <button 
                onClick={performSave} 
                disabled={isSaving || !isDirty} 
                className={`px-6 py-2 rounded-lg font-black text-sm flex items-center gap-2 shadow-lg transition-all ${isDirty ? 'bg-orange-500 text-white hover:bg-orange-600' : 'bg-emerald-600 text-white opacity-50'}`}
            >
                {isSaving ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>} 
                {saveStatus === 'SUCCESS' ? 'Zapisano!' : 'Zapisz do bazy'}
            </button>
        </div>
      </div>

      <div className="flex gap-2 bg-slate-100 p-1 rounded-xl w-fit border border-slate-200">
          <button onClick={()=>setActiveTab('PARCELS')} className={`px-8 py-2 rounded-lg text-sm font-black transition-all ${activeTab === 'PARCELS' ? 'bg-white text-emerald-700 shadow' : 'text-slate-500'}`}>Ewidencja</button>
          <button onClick={()=>setActiveTab('CROPS')} className={`px-8 py-2 rounded-lg text-sm font-black transition-all ${activeTab === 'CROPS' ? 'bg-white text-emerald-700 shadow' : 'text-slate-500'}`}>Zasiewy</button>
      </div>

      {activeTab === 'PARCELS' ? (
          <ParcelManager fields={fields} selectedYear={selectedYear} onUpdateFields={(f)=>{setFields(f); setIsDirty(true);}} onImport={()=>handleImportClick('PARCELS')} onDownload={handleDownloadTemplate} />
      ) : (
          <CropManager fields={fields} selectedYear={selectedYear} onUpdateFields={(f)=>{setFields(f); setIsDirty(true);}} onImport={()=>handleImportClick('CROPS')} onDownload={handleDownloadTemplate} />
      )}

      {showImportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-black text-slate-800 flex items-center gap-2"><UploadCloud className="text-emerald-600"/> Import {importType}</h3>
                      <button onClick={()=>setShowImportModal(false)}><X size={24}/></button>
                  </div>
                  {!importReport ? (
                      <div className="space-y-4">
                          <label className="block text-sm font-bold text-slate-700">Szablon:</label>
                          <select value={selectedTemplateId} onChange={(e)=>setSelectedTemplateId(e.target.value)} className="w-full border-2 rounded-xl p-3 font-bold bg-slate-50">
                                {filteredTemplates.map(t => <option key={t.id} value={t.id}>{t.name} ({t.year})</option>)}
                          </select>
                          <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} accept=".csv" />
                          <button onClick={()=>fileInputRef.current?.click()} className="w-full py-4 rounded-xl font-black bg-emerald-600 text-white flex items-center justify-center gap-2 hover:bg-emerald-700 active:scale-95"><UploadCloud size={20}/> Wybierz Plik CSV</button>
                      </div>
                  ) : (
                      <div className="space-y-4 text-center">
                          <div className="bg-slate-50 p-6 rounded-2xl border text-left">
                              <p className="font-bold text-emerald-600 text-lg mb-2">Import zakończony</p>
                              <p className="font-medium text-slate-600">Dodano/Zaktualizowano: {importReport.success}</p>
                              <p className="text-slate-400 text-sm">Pominięto: {importReport.skipped}</p>
                          </div>
                          <button onClick={()=>setShowImportModal(false)} className="w-full py-3 bg-slate-900 text-white rounded-xl font-black">Zamknij</button>
                      </div>
                  )}
              </div>
          </div>
      )}
    </div>
  );
};

export default FieldManager;

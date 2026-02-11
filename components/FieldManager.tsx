
import React, { useRef, useState } from 'react';
import { Trash2, MapPin, History, ChevronDown, ChevronUp, Beaker, Leaf, UploadCloud, FileSpreadsheet, Download, AlertCircle, Layers, Sprout, Calendar, Edit2, Save, X, Check, Settings } from 'lucide-react';
import { Field, CropType, CsvTemplate } from '../types';
import { CROP_TYPES } from '../constants';

interface FieldManagerProps {
  fields: Field[];
  setFields: React.Dispatch<React.SetStateAction<Field[]>>;
  csvTemplates: CsvTemplate[];
}

const FieldManager: React.FC<FieldManagerProps> = ({ fields, setFields, csvTemplates }) => {
  const [activeTab, setActiveTab] = useState<'PARCELS' | 'CROPS'>('PARCELS');
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [expandedFieldId, setExpandedFieldId] = useState<string | null>(null);
  
  // Import State
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  
  // Editing State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
      name: string;
      registrationNumber: string;
      area: string;
      eligibleArea: string;
      crop: CropType;
      ecoSchemes: string;
  }>({ name: '', registrationNumber: '', area: '', eligibleArea: '', crop: 'Mieszanka', ecoSchemes: '' });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const availableYears = [2026, 2025, 2024, 2023, 2022, 2021];

  // --- HELPER: Parse Polish Numbers ---
  const parsePolishNumber = (val: string | undefined): number => {
      if (!val) return 0;
      let cleaned = val.trim();
      cleaned = cleaned.replace(/\s/g, '');
      cleaned = cleaned.replace(/,/g, '.');
      const num = parseFloat(cleaned);
      return isNaN(num) ? 0 : num;
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

  // --- CRUD OPERATIONS ---

  const removeField = (id: string) => {
    if (window.confirm("Czy na pewno chcesz trwale usunąć to pole z ewidencji? Operacja jest nieodwracalna.")) {
        setFields(prev => prev.filter(f => f.id !== id));
    }
  };

  const removeHistoryEntry = (fieldId: string, year: number) => {
      if (window.confirm(`Czy na pewno chcesz usunąć wpis historyczny z roku ${year}?`)) {
          setFields(prev => prev.map(f => {
              if (f.id !== fieldId) return f;
              const newHistory = f.history ? f.history.filter(h => h.year !== year) : [];
              return { ...f, history: newHistory };
          }));
      }
  };

  const startEditing = (field: Field) => {
    setEditingId(field.id);
    const cropData = getCropDataForYear(field, selectedYear);
    
    setEditForm({
        name: field.name,
        registrationNumber: field.registrationNumber || '',
        area: field.area.toString().replace('.', ','), 
        eligibleArea: field.eligibleArea.toString().replace('.', ','),
        crop: cropData ? (cropData.crop as CropType) : 'Mieszanka',
        ecoSchemes: cropData ? cropData.ecoSchemes.join(', ') : ''
    });
  };

  const cancelEditing = () => {
      setEditingId(null);
  };

  const saveEditing = (id: string) => {
      setFields(prevFields => prevFields.map(field => {
          if (field.id !== id) return field;

          const updatedField = { ...field };

          if (activeTab === 'PARCELS') {
              updatedField.name = editForm.name;
              updatedField.registrationNumber = editForm.registrationNumber;
              updatedField.area = parsePolishNumber(editForm.area);
              updatedField.eligibleArea = parsePolishNumber(editForm.eligibleArea) || updatedField.area;
          } else {
              // CROPS EDITING LOGIC
              const newEcoSchemes = editForm.ecoSchemes.split(',').map(s => s.trim()).filter(s => s.length > 0);
              
              if (selectedYear === 2026) {
                  updatedField.crop = editForm.crop;
              } else {
                  const histIndex = updatedField.history.findIndex(h => h.year === selectedYear);
                  const newEntry = {
                      year: selectedYear,
                      crop: editForm.crop,
                      appliedEcoSchemes: newEcoSchemes
                  };

                  if (histIndex >= 0) {
                      updatedField.history[histIndex] = { ...updatedField.history[histIndex], ...newEntry };
                  } else {
                      updatedField.history.push(newEntry);
                      updatedField.history.sort((a, b) => b.year - a.year);
                  }
              }
          }
          return updatedField;
      }));
      setEditingId(null);
  };


  const toggleHistory = (id: string) => {
      if (expandedFieldId === id) setExpandedFieldId(null);
      else setExpandedFieldId(id);
  };

  // Helper to get crop data for the specific selected year
  const getCropDataForYear = (field: Field, year: number) => {
      if (year === 2026) {
          return {
              crop: field.crop,
              ecoSchemes: [], 
              isMain: true
          };
      }
      
      const historyEntry = field.history?.find(h => h.year === year);
      if (historyEntry) {
          return {
              crop: historyEntry.crop,
              ecoSchemes: historyEntry.appliedEcoSchemes,
              isMain: false
          };
      }

      return null;
  };

  // --- CSV IMPORTS ---
  const handleDownloadTemplate = () => {
    let headers = "";
    let filename = "";

    if (activeTab === 'PARCELS') {
        headers = [
            "Identyfikator działki ewidencyjnej",
            "Województwo",
            "Powiat",
            "Gmina",
            "Nazwa obrębu ewidencyjnego",
            "Nr obrębu ewidencyjnego",
            "Nr arkusza mapy",
            "Nr działki ewidencyjnej",
            "Hektar kwalifikujący się ogółem na działce [ha]",
            "Pow. gruntów ornych ogółem na działce [ha]",
            "Uprawa"
        ].join(';') + "\n";
        filename = 'szablon_ewidencja_gruntow.csv';
    } else {
        headers = [
            "Oznaczenie Uprawy / działki rolnej",
            "Oznaczenie Uprawy / działki rolnej ZAL",
            "Powierzchnia [ha]",
            "Roślina uprawna",
            "Lista płatności",
            "Lista ekoschematów",
            "Czy niezgłoszona",
            "Rośliny w mieszance",
            "Ilość nasion",
            "Ekologiczna",
            "Nr działki ewidencyjnej",
            "Powierzchnia uprawy w granicach działki ewidencyjnej - ha",
            "Obszar ONW",
            "Pow. obszaru ONW [ha]",
            "Nr pakietu/wariantu/opcji - płatność PRSK",
            "Praktyka dodatkowa - płatność PRSK",
            "Odmiana drzew owocowych - płatność PRSK",
            "L. drzew owocowych - płatność PRSK",
            "Rośliny w międzyplonie - płatność PRSK",
            "Sposób użytkowania - płatność PRSK",
            "Odmiana uprawy - płatność PRSK",
            "Nr pakietu/wariantu/opcji - płatność ZRSK2327",
            "Praktyka dodatkowa - płatność ZRSK2327",
            "Odmiana drzew owocowych - płatność ZRSK2327",
            "L. drzew owocowych - płatność ZRSK2327",
            "Sposób użytkowania - płatność ZRSK2327",
            "Odmiana uprawy - płatność ZRSK2327",
            "Nr pakietu/wariantu/opcji - płatność RE2327",
            "Uwagi"
        ].join(';') + "\n";
        filename = 'szablon_struktura_zasiewow.csv';
    }
    
    const content = headers;
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const blob = new Blob([bom, content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportClick = () => {
      const defaultTemplate = csvTemplates.find(t => t.type === activeTab);
      if (defaultTemplate) setSelectedTemplateId(defaultTemplate.id);
      setShowImportModal(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const selectedTemplate = csvTemplates.find(t => t.id === selectedTemplateId);
    if (!selectedTemplate) {
        alert("Wybierz szablon importu.");
        return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
        const text = event.target?.result as string;
        if (!text) { alert("Plik jest pusty."); return; }

        try {
            const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim().length > 0);
            const newFields: Field[] = [];
            
            if (lines.length < 1) { alert("Plik nie zawiera danych."); return; }
            
            const firstLine = lines[0];
            const separator = selectedTemplate.separator;
            const fileHeaders = splitCSV(firstLine, separator).map(h => h.trim().toLowerCase());
            
            const mapIdx: Record<string, number> = {};
            Object.entries(selectedTemplate.mappings).forEach(([key, csvHeader]) => {
                const idx = fileHeaders.findIndex(h => h.includes((csvHeader as string).toLowerCase()));
                if (idx !== -1) mapIdx[key] = idx;
            });

            for (let i = 1; i < lines.length; i++) {
                const line = lines[i];
                const cols = splitCSV(line, separator);
                if (cols.length < 2) continue;

                const getVal = (key: string): string => mapIdx[key] !== undefined ? cols[mapIdx[key]] : '';

                if (activeTab === 'PARCELS') {
                    const name = getVal('name') || `Działka ${i}`;
                    const reg = getVal('registrationNumber') || '';
                    const areaStr = getVal('area');
                    const eligibleStr = getVal('eligibleArea');
                    const cropStr = getVal('crop');

                    const area = parsePolishNumber(areaStr);
                    if (area === 0 && (!areaStr || !/[0-9]/.test(areaStr))) continue;

                    let eligibleArea = parsePolishNumber(eligibleStr);
                    if (eligibleArea === 0 && (!eligibleStr || eligibleStr.trim() === '')) eligibleArea = area;

                    const matchedCrop = CROP_TYPES.find(c => c.toLowerCase() === cropStr.toLowerCase()) || 'Mieszanka';

                    newFields.push({
                        id: Math.random().toString(36).substr(2, 9),
                        name: name,
                        registrationNumber: reg,
                        area,
                        eligibleArea,
                        crop: matchedCrop as CropType,
                        history: []
                    });
                } 
                else {
                    const reg = getVal('registrationNumber');
                    const cropStr = getVal('crop');
                    const areaStr = getVal('area');

                    if (reg) {
                         const area = parsePolishNumber(areaStr);
                         const matchedCrop = CROP_TYPES.find(c => c.toLowerCase() === cropStr.toLowerCase()) || 'Mieszanka';
                         
                         newFields.push({
                            id: Math.random().toString(36).substr(2, 9),
                            name: `Działka ${reg}`,
                            registrationNumber: reg,
                            area: area > 0 ? area : 1.0,
                            eligibleArea: area > 0 ? area : 1.0,
                            crop: matchedCrop as CropType,
                            history: []
                        });
                    }
                }
            }

            if (newFields.length > 0) {
                setFields(prev => [...prev, ...newFields]);
                alert(`Pomyślnie zaimportowano ${newFields.length} pozycji.`);
                setShowImportModal(false);
            } else {
                alert("Nie udało się zidentyfikować danych. Sprawdź czy wybrany szablon pasuje do pliku.");
            }
        } catch (error) {
            console.error(error);
            alert("Błąd przetwarzania pliku CSV.");
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
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
                        onChange={(e) => { setSelectedYear(Number(e.target.value)); setEditingId(null); }}
                        className="appearance-none bg-white border border-slate-300 text-slate-700 py-1.5 pl-3 pr-8 rounded-md text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                    >
                        {availableYears.map(year => (
                            <option key={year} value={year}>{year} {year === 2026 ? '(Plan)' : ''}</option>
                        ))}
                    </select>
                    <Calendar className="absolute right-2 top-1.5 text-slate-400 pointer-events-none" size={16} />
                 </div>
            </div>

            <div className="flex gap-2">
                <button 
                    onClick={handleDownloadTemplate}
                    className="text-slate-500 hover:text-emerald-600 px-3 py-2 text-sm font-medium transition-colors flex items-center gap-1"
                >
                    <Download size={16} /> Szablon Bazowy
                </button>
                <button 
                    onClick={handleImportClick}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors shadow-sm text-sm font-semibold"
                >
                    <UploadCloud size={18} />
                    <span>Importuj Ewidencję</span>
                </button>
            </div>
        </div>
      </div>

      {/* TABS */}
      <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl w-fit">
          <button
            onClick={() => { setActiveTab('PARCELS'); setEditingId(null); }}
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
            onClick={() => { setActiveTab('CROPS'); setEditingId(null); }}
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

      {/* TABLE CONTENT */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden min-h-[400px]">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="p-4 font-semibold text-slate-600">Identyfikator działki ewidencyjnej</th>
              <th className="p-4 font-semibold text-slate-600">Nr Ewidencyjny</th>
              <th className="p-4 font-semibold text-slate-600">Pow. Orna Ogółem</th>
              
              {activeTab === 'PARCELS' ? (
                  <>
                    <th className="p-4 font-semibold text-slate-600">Pow. Kwalifikowana ({selectedYear})</th>
                    <th className="p-4 font-semibold text-slate-600 text-right">Akcje</th>
                  </>
              ) : (
                  <>
                    <th className="p-4 font-semibold text-slate-600">Uprawa ({selectedYear})</th>
                    <th className="p-4 font-semibold text-slate-600">Ekoschematy</th>
                    <th className="p-4 font-semibold text-slate-600 text-right">Akcje</th>
                  </>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {fields.map(field => {
                const cropData = getCropDataForYear(field, selectedYear);
                const isEditing = editingId === field.id;

                return (
                <React.Fragment key={field.id}>
                  <tr className={`transition-colors ${isEditing ? 'bg-amber-50' : 'hover:bg-slate-50'}`}>
                    
                    {/* NAME */}
                    <td className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${activeTab === 'PARCELS' ? 'bg-slate-100 text-slate-600' : 'bg-emerald-100 text-emerald-600'}`}>
                          {activeTab === 'PARCELS' ? <MapPin size={18} /> : <Sprout size={18} />}
                        </div>
                        {isEditing && activeTab === 'PARCELS' ? (
                            <input 
                                type="text"
                                value={editForm.name}
                                onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                                className="border border-amber-300 rounded px-2 py-1 text-sm w-full focus:outline-none focus:ring-1 focus:ring-amber-500"
                            />
                        ) : (
                            <span className="font-medium text-slate-900">{field.name}</span>
                        )}
                      </div>
                    </td>

                    {/* REG NUMBER */}
                    <td className="p-4 text-slate-500 font-mono text-sm">
                        {isEditing && activeTab === 'PARCELS' ? (
                            <input 
                                type="text"
                                value={editForm.registrationNumber}
                                onChange={(e) => setEditForm({...editForm, registrationNumber: e.target.value})}
                                className="border border-amber-300 rounded px-2 py-1 text-sm w-24 focus:outline-none focus:ring-1 focus:ring-amber-500"
                            />
                        ) : (
                            field.registrationNumber || '-'
                        )}
                    </td>

                    {/* AREA (TOTAL) */}
                    <td className="p-4 text-slate-700 font-semibold">
                        {isEditing && activeTab === 'PARCELS' ? (
                            <input 
                                type="text"
                                value={editForm.area}
                                onChange={(e) => setEditForm({...editForm, area: e.target.value})}
                                className="border border-amber-300 rounded px-2 py-1 text-sm w-20 focus:outline-none focus:ring-1 focus:ring-amber-500"
                            />
                        ) : (
                            `${field.area.toFixed(2)} ha`
                        )}
                    </td>

                    {/* DYNAMIC COLUMNS */}
                    {activeTab === 'PARCELS' ? (
                        <>
                            {/* ELIGIBLE AREA */}
                            <td className="p-4 text-slate-600">
                                {isEditing ? (
                                    <input 
                                        type="text"
                                        value={editForm.eligibleArea}
                                        onChange={(e) => setEditForm({...editForm, eligibleArea: e.target.value})}
                                        className="border border-amber-300 rounded px-2 py-1 text-sm w-20 focus:outline-none focus:ring-1 focus:ring-amber-500"
                                    />
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <span>{field.eligibleArea.toFixed(2)} ha</span>
                                        {field.eligibleArea < field.area && (
                                            <span title="Powierzchnia kwalifikowana mniejsza od całkowitej" className="flex items-center">
                                                <AlertCircle size={14} className="text-amber-500" />
                                            </span>
                                        )}
                                    </div>
                                )}
                            </td>
                            <td className="p-4 text-right">
                                {isEditing ? (
                                    <div className="flex justify-end space-x-2">
                                        <button onClick={() => saveEditing(field.id)} className="p-2 text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg transition-colors" title="Zapisz"><Save size={18} /></button>
                                        <button onClick={cancelEditing} className="p-2 text-slate-500 hover:bg-slate-200 rounded-lg transition-colors" title="Anuluj"><X size={18} /></button>
                                    </div>
                                ) : (
                                    <div className="flex justify-end space-x-2">
                                        <button onClick={() => startEditing(field)} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Edytuj"><Edit2 size={18} /></button>
                                        <button onClick={() => removeField(field.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Usuń działkę"><Trash2 size={18} /></button>
                                    </div>
                                )}
                            </td>
                        </>
                    ) : (
                        <>
                            {/* CROPS & ECOSCHEMES COLUMNS */}
                            <td className="p-4">
                                {isEditing ? (
                                    <select
                                        value={editForm.crop}
                                        onChange={(e) => setEditForm({...editForm, crop: e.target.value as CropType})}
                                        className="border border-amber-300 rounded px-2 py-1 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                                    >
                                        {CROP_TYPES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                ) : (
                                    cropData ? (
                                        <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium border border-blue-100">
                                            {cropData.crop}
                                        </span>
                                    ) : (
                                        <span className="text-slate-400 italic text-sm">Brak uprawy</span>
                                    )
                                )}
                            </td>
                            <td className="p-4">
                                {isEditing ? (
                                     selectedYear === 2026 ? (
                                        <span className="text-xs text-slate-400 italic">Generowane w Optymalizacji</span>
                                     ) : (
                                        <input 
                                            type="text"
                                            value={editForm.ecoSchemes}
                                            onChange={(e) => setEditForm({...editForm, ecoSchemes: e.target.value})}
                                            placeholder="np. E_IPR, E_WOD"
                                            className="border border-amber-300 rounded px-2 py-1 text-sm w-full focus:outline-none focus:ring-1 focus:ring-amber-500"
                                        />
                                     )
                                ) : (
                                    cropData && cropData.ecoSchemes && cropData.ecoSchemes.length > 0 ? (
                                        <div className="flex gap-1 flex-wrap max-w-[150px]">
                                            {cropData.ecoSchemes.map(es => (
                                                <span key={es} className="text-xs bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-100">{es}</span>
                                            ))}
                                        </div>
                                    ) : (
                                        <span className="text-slate-300">-</span>
                                    )
                                )}
                            </td>
                            <td className="p-4 text-right">
                                {isEditing ? (
                                     <div className="flex justify-end space-x-2">
                                        <button onClick={() => saveEditing(field.id)} className="p-2 text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg transition-colors" title="Zapisz"><Save size={18} /></button>
                                        <button onClick={cancelEditing} className="p-2 text-slate-500 hover:bg-slate-200 rounded-lg transition-colors" title="Anuluj"><X size={18} /></button>
                                    </div>
                                ) : (
                                    <div className="flex justify-end space-x-2">
                                        <button onClick={() => startEditing(field)} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Edytuj Uprawę"><Edit2 size={18} /></button>
                                        <button onClick={() => toggleHistory(field.id)} className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors inline-flex items-center space-x-1" title="Historia">
                                            <History size={16} />
                                            {expandedFieldId === field.id ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                                        </button>
                                        <button onClick={() => removeField(field.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Usuń działkę"><Trash2 size={18} /></button>
                                    </div>
                                )}
                            </td>
                        </>
                    )}
                  </tr>
                  
                  {expandedFieldId === field.id && !isEditing && (
                      <tr className="bg-slate-50/50">
                          <td colSpan={6} className="p-4">
                              <div className="bg-white border border-slate-200 rounded-lg p-4 ml-8">
                                  <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                                      <History size={16} className="text-emerald-600"/>
                                      Pełna Historia Agrotechniczna (2021-2025)
                                  </h4>
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="text-xs text-slate-500 bg-slate-100 uppercase">
                                            <tr>
                                                <th className="p-2 text-left rounded-l-md">Rok</th>
                                                <th className="p-2 text-left">Uprawa</th>
                                                <th className="p-2 text-left">Ekoschematy</th>
                                                <th className="p-2 text-left">Wapnowanie</th>
                                                <th className="p-2 text-left">pH</th>
                                                <th className="p-2 text-right rounded-r-md">Akcje</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {field.history?.map((hist, idx) => (
                                                <tr key={idx} className={hist.year === selectedYear ? "bg-emerald-50" : ""}>
                                                    <td className="p-2 font-medium text-slate-700">{hist.year}</td>
                                                    <td className="p-2 text-slate-600">{hist.crop}</td>
                                                    <td className="p-2">
                                                        <div className="flex gap-1 flex-wrap">
                                                            {hist.appliedEcoSchemes.map(eco => (
                                                                <span key={eco} className="text-xs bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-100">{eco}</span>
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td className="p-2 text-slate-600">
                                                        {hist.limingDate ? <div className="flex items-center gap-1 text-blue-600"><Beaker size={12}/> {hist.limingDate}</div> : '-'}
                                                    </td>
                                                    <td className="p-2 text-slate-600">
                                                        {hist.soilPh ? <div className="flex items-center gap-1"><Leaf size={12} className={hist.soilPh < 5 ? 'text-red-500' : 'text-green-500'}/> {hist.soilPh}</div> : '-'}
                                                    </td>
                                                    <td className="p-2 text-right">
                                                        <button 
                                                            onClick={() => removeHistoryEntry(field.id, hist.year)}
                                                            className="text-slate-400 hover:text-red-500 transition-colors p-1"
                                                            title="Usuń wpis historyczny"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {(!field.history || field.history.length === 0) && (
                                                <tr><td colSpan={6} className="p-2 text-center text-slate-400 italic">Brak wpisów historycznych</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                              </div>
                          </td>
                      </tr>
                  )}
                </React.Fragment>
            )})}
            
            {fields.length === 0 && (
              <tr>
                <td colSpan={6} className="p-12 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <FileSpreadsheet size={48} className="text-slate-300 mb-4" />
                    <h3 className="text-lg font-medium text-slate-700 mb-2">Brak zdefiniowanych działek</h3>
                    <p className="text-slate-500 max-w-md mx-auto mb-6">Lista działek jest pusta. Pobierz szablon CSV i zaimportuj dane.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* IMPORT MODAL */}
      {showImportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowImportModal(false)}></div>
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-md relative z-10 animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex justify-between items-center p-5 border-b border-slate-100">
                      <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                          <UploadCloud className="text-emerald-600"/> Import z CSV
                      </h3>
                      <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-slate-600">
                          <X size={24} />
                      </button>
                  </div>
                  
                  <div className="p-6 space-y-4">
                      <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Wybierz Szablon Importu</label>
                          <select 
                            value={selectedTemplateId}
                            onChange={(e) => setSelectedTemplateId(e.target.value)}
                            className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                          >
                              <option value="">-- Wybierz szablon --</option>
                              {csvTemplates.filter(t => t.type === activeTab).map(t => (
                                  <option key={t.id} value={t.id}>{t.name} (sep: '{t.separator}')</option>
                              ))}
                          </select>
                      </div>

                      <div className="pt-2">
                          <input 
                              type="file" 
                              ref={fileInputRef}
                              accept=".csv,.txt"
                              className="hidden"
                              onChange={handleFileUpload}
                          />
                          <button 
                              onClick={() => fileInputRef.current?.click()}
                              disabled={!selectedTemplateId}
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
                      
                      <p className="text-xs text-slate-500 text-center">
                          Upewnij się, że plik CSV jest zgodny z wybranym szablonem. <br/>
                          Możesz zarządzać szablonami w <strong>Panelu Admina</strong>.
                      </p>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default FieldManager;

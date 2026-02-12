
import React, { useState } from 'react';
import { Sprout, Edit2, Save, X, History, ChevronDown, ChevronUp, Trash2, Info, FileSpreadsheet, Download, UploadCloud, Layers, Copy } from 'lucide-react';
import { Field, CropType } from '../types';
import { CROP_TYPES } from '../constants';

interface CropManagerProps {
  fields: Field[];
  selectedYear: number;
  onUpdateFields: (updatedFields: Field[]) => void;
  onImport: () => void;
  onDownload: () => void;
  onCopyFromYear?: (year: number) => void;
}

const CropManager: React.FC<CropManagerProps> = ({ fields, selectedYear, onUpdateFields, onImport, onDownload, onCopyFromYear }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedFieldId, setExpandedFieldId] = useState<string | null>(null);
  const [showAllFields, setShowAllFields] = useState(false);
  
  // Simple edit form state (for single-part edits)
  const [editForm, setEditForm] = useState<{
      crop: CropType;
      ecoSchemes: string;
      designation: string;
  }>({ crop: 'Mieszanka', ecoSchemes: '', designation: 'A' });

  const getCropDataForYear = (field: Field, year: number) => {
      const historyEntry = field.history?.find(h => h.year === year);
      
      // STRICT FILTER: Auto-fallback REMOVED for 2026. Data must exist in history.
      if (historyEntry) {
          // STRICT FILTER: Only show if it represents a Crop Structure Record
          // Legacy check: if crop is 'Nieznana' and no designation, it's likely just a parcel record
          if (historyEntry.crop === 'Nieznana' && !historyEntry.designation && (!historyEntry.cropParts || historyEntry.cropParts.length === 0)) {
              return null;
          }

          // Ensure parts exist for rendering
          const parts = (historyEntry.cropParts && historyEntry.cropParts.length > 0) 
            ? historyEntry.cropParts 
            : [{ 
                designation: historyEntry.designation || 'A', 
                crop: historyEntry.crop, 
                area: historyEntry.area || field.area, 
                ecoSchemes: historyEntry.appliedEcoSchemes,
                plantMix: historyEntry.plantMix
              }];

          return {
              crop: historyEntry.crop,
              parts: parts,
              legacyDesignation: historyEntry.designation,
              legacyArea: historyEntry.area,
              isMain: false
          };
      }
      return null;
  };

  const startEditing = (field: Field) => {
    setEditingId(field.id);
    const cropData = getCropDataForYear(field, selectedYear);
    const firstPart = cropData?.parts?.[0];
    
    setEditForm({
        crop: firstPart ? (firstPart.crop as CropType) : 'Mieszanka',
        ecoSchemes: firstPart ? firstPart.ecoSchemes.join(', ') : '',
        designation: firstPart ? firstPart.designation : 'A'
    });
  };

  const saveEditing = (id: string) => {
      const updatedFields = fields.map(field => {
          if (field.id !== id) return field;
          
          const newEcoSchemes = editForm.ecoSchemes.split(',').map(s => s.trim()).filter(s => s.length > 0);
          const updatedField = { ...field };

          const histIndex = updatedField.history.findIndex(h => h.year === selectedYear);
          // Construct a simple entry (overwriting parts for simple edit)
          const newEntry = {
              year: selectedYear,
              crop: editForm.crop,
              appliedEcoSchemes: newEcoSchemes,
              designation: editForm.designation,
              // Re-create simple part structure
              cropParts: [{
                  designation: editForm.designation,
                  crop: editForm.crop,
                  area: field.area, // Simple edit assumes full area
                  ecoSchemes: newEcoSchemes
              }]
          };

          if (histIndex >= 0) {
              updatedField.history[histIndex] = { ...updatedField.history[histIndex], ...newEntry };
          } else {
              updatedField.history.push(newEntry);
              updatedField.history.sort((a, b) => b.year - a.year);
          }
          
          return updatedField;
      });
      onUpdateFields(updatedFields);
      setEditingId(null);
  };

  const removeHistoryEntry = (fieldId: string, year: number) => {
      if (window.confirm(`Czy na pewno chcesz usunąć wpis historyczny z roku ${year}?`)) {
          const updatedFields = fields.map(f => {
              if (f.id !== fieldId) return f;
              const newHistory = f.history ? f.history.filter(h => h.year !== year) : [];
              return { ...f, history: newHistory };
          });
          onUpdateFields(updatedFields);
      }
  };

  const removeField = (id: string) => {
    if (window.confirm("Czy na pewno chcesz trwale usunąć to pole?")) {
        onUpdateFields(fields.filter(f => f.id !== id));
    }
  };

  const toggleHistory = (id: string) => {
      setExpandedFieldId(expandedFieldId === id ? null : id);
  };

  const visibleFields = fields
    .filter(field => {
      if (showAllFields) return true;
      const data = getCropDataForYear(field, selectedYear);
      return data !== null;
    })
    .sort((a, b) => {
      const dataA = getCropDataForYear(a, selectedYear);
      const dataB = getCropDataForYear(b, selectedYear);
      const desA = dataA?.parts?.[0]?.designation || '';
      const desB = dataB?.parts?.[0]?.designation || '';
      
      if (desA && desB) return desA.localeCompare(desB, undefined, { numeric: true, sensitivity: 'base' });
      if (desA) return -1;
      if (desB) return 1;
      return a.name.localeCompare(b.name, undefined, { numeric: true });
    });

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden min-h-[400px]">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50">
            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm hover:border-emerald-300 transition-colors">
                <input 
                    type="checkbox" 
                    checked={showAllFields} 
                    onChange={(e) => setShowAllFields(e.target.checked)} 
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer" 
                />
                <span className="font-medium">Pokaż wszystkie (także puste)</span>
            </label>
            <div className="flex gap-2">
                <button 
                    onClick={onDownload}
                    className="text-slate-500 hover:text-emerald-600 px-3 py-2 text-sm font-medium transition-colors flex items-center gap-1 bg-white border border-slate-300 rounded-lg hover:border-emerald-300"
                >
                    <Download size={16} /> <span className="hidden sm:inline">Pobierz Szablon</span>
                </button>
                <button 
                    onClick={onImport}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors shadow-sm text-sm font-semibold"
                >
                    <UploadCloud size={18} />
                    <span>Importuj Zasiewy</span>
                </button>
            </div>
        </div>

        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500">
            <tr>
              <th className="p-4 font-semibold w-1/4">Działka (Ewidencja)</th>
              <th className="p-4 font-semibold text-center w-24 bg-emerald-50/50 border-x border-slate-100">Oznaczenie</th>
              <th className="p-4 font-semibold w-1/4">Roślina Uprawna</th>
              <th className="p-4 font-semibold w-32">Powierzchnia</th>
              <th className="p-4 font-semibold w-1/4">Ekoschematy (do uprawy)</th>
              <th className="p-4 font-semibold text-right w-32">Akcje</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visibleFields.map(field => {
                const cropData = getCropDataForYear(field, selectedYear);
                const isEditing = editingId === field.id;
                
                if (!cropData && !showAllFields) return null;

                const rowsToRender = (cropData?.parts && cropData.parts.length > 0) 
                    ? cropData.parts 
                    : [{ designation: '-', crop: null, area: field.area, ecoSchemes: [] }];

                return (
                <React.Fragment key={field.id}>
                  {rowsToRender.map((part: any, idx: number) => (
                      <tr key={`${field.id}-${idx}`} className={`transition-colors ${isEditing ? 'bg-amber-50' : 'hover:bg-slate-50'} ${idx > 0 ? 'border-t-0' : ''}`}>
                        
                        {/* 1. FIELD INFO (Merged for split crops) */}
                        <td className="p-4 align-top border-r border-transparent">
                          {idx === 0 && (
                              <div>
                                  <div className="font-bold text-slate-800 flex items-center gap-2">
                                      {field.name}
                                  </div>
                                  <div className="text-xs text-slate-500 font-mono mt-0.5">
                                      {field.registrationNumber} <span className="text-slate-300">|</span> {field.area.toFixed(2)} ha
                                  </div>
                              </div>
                          )}
                        </td>

                        {/* 2. DESIGNATION (Priority Column) */}
                        <td className="p-4 text-center align-top bg-emerald-50/30 border-x border-slate-100">
                            {isEditing && idx === 0 ? (
                                <input 
                                    type="text" 
                                    value={editForm.designation}
                                    onChange={(e) => setEditForm({...editForm, designation: e.target.value})}
                                    className="w-12 text-center border border-amber-300 rounded p-1 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 font-bold"
                                />
                            ) : (
                                <span className={`inline-block w-8 h-8 leading-8 text-center rounded-full font-bold text-sm ${part.designation && part.designation !== '-' ? 'bg-slate-800 text-white shadow-sm' : 'bg-slate-100 text-slate-400'}`}>
                                    {part.designation || '-'}
                                </span>
                            )}
                        </td>

                        {/* 3. CROP */}
                        <td className="p-4 align-top">
                            {isEditing && idx === 0 ? (
                                <select
                                    value={editForm.crop}
                                    onChange={(e) => setEditForm({...editForm, crop: e.target.value as CropType})}
                                    className="w-full border border-amber-300 rounded p-1 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                                >
                                    {CROP_TYPES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            ) : (
                                part.crop ? (
                                    <div>
                                        <div className="font-semibold text-slate-700">{part.crop}</div>
                                        {part.plantMix && (
                                            <div className="text-[10px] text-slate-400 mt-0.5 italic">{part.plantMix}</div>
                                        )}
                                    </div>
                                ) : (
                                    <span className="text-slate-400 italic text-sm">Brak uprawy</span>
                                )
                            )}
                        </td>

                        {/* 4. AREA (Declared for this part) */}
                        <td className="p-4 align-top text-slate-700 font-mono">
                            {(part.area || 0).toFixed(2)} ha
                        </td>

                        {/* 5. ECOSCHEMES (Assigned to this crop part) */}
                        <td className="p-4 align-top">
                            {isEditing && idx === 0 ? (
                                <input 
                                    type="text"
                                    value={editForm.ecoSchemes}
                                    onChange={(e) => setEditForm({...editForm, ecoSchemes: e.target.value})}
                                    placeholder="np. E_IPR, E_WOD"
                                    className="w-full border border-amber-300 rounded p-1 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                                />
                            ) : (
                                part.ecoSchemes && part.ecoSchemes.length > 0 ? (
                                    <div className="flex flex-wrap gap-1.5">
                                        {part.ecoSchemes.map((es: string) => (
                                            <span key={es} className="text-xs bg-white text-emerald-700 px-2 py-0.5 rounded border border-emerald-200 font-medium shadow-sm">
                                                {es}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <span className="text-slate-300 text-xs">-</span>
                                )
                            )}
                        </td>

                        {/* 6. ACTIONS (Field level) */}
                        <td className="p-4 text-right align-top">
                            {idx === 0 && (
                                isEditing ? (
                                    <div className="flex justify-end gap-1">
                                        <button onClick={() => saveEditing(field.id)} className="p-1.5 text-white bg-emerald-500 hover:bg-emerald-600 rounded shadow-sm"><Save size={16} /></button>
                                        <button onClick={() => setEditingId(null)} className="p-1.5 text-slate-500 hover:bg-slate-200 rounded"><X size={16} /></button>
                                    </div>
                                ) : (
                                    <div className="flex justify-end gap-1">
                                        <button onClick={() => startEditing(field)} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded" title="Edytuj (Proste)"><Edit2 size={16} /></button>
                                        <button onClick={() => toggleHistory(field.id)} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded" title="Historia/Szczegóły">
                                            {expandedFieldId === field.id ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                                        </button>
                                        <button onClick={() => removeField(field.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded" title="Usuń"><Trash2 size={16} /></button>
                                    </div>
                                )
                            )}
                        </td>
                      </tr>
                  ))}
                  
                  {/* EXPANDED DETAILS */}
                  {expandedFieldId === field.id && !isEditing && (
                      <tr className="bg-slate-50 shadow-inner">
                          <td colSpan={6} className="p-4">
                              <div className="ml-8 text-sm text-slate-600">
                                  <div className="flex items-center gap-2 mb-2 font-bold text-slate-700">
                                      <History size={14}/> Historia zmian i płatności
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                     <div className="bg-white p-3 rounded border border-slate-200">
                                         <p className="text-xs text-slate-400 uppercase font-bold mb-2">Poprzednie sezony</p>
                                         {field.history?.filter(h => h.year !== selectedYear).map(h => (
                                             <div key={h.year} className="flex justify-between border-b border-slate-50 py-1 last:border-0">
                                                 <span className="font-mono text-emerald-600">{h.year}</span>
                                                 <span>{h.crop}</span>
                                                 <button onClick={() => removeHistoryEntry(field.id, h.year)} className="text-slate-300 hover:text-red-400"><Trash2 size={12}/></button>
                                             </div>
                                         ))}
                                         {(!field.history || field.history.length <= 1) && <span className="text-xs italic text-slate-400">Brak historii</span>}
                                     </div>
                                     <div className="bg-white p-3 rounded border border-slate-200">
                                         <p className="text-xs text-slate-400 uppercase font-bold mb-2">Szczegóły CSV ({selectedYear})</p>
                                         {/* Show raw extra details for debugging/insight */}
                                         {cropData?.parts.map((p: any, i: number) => (
                                             <div key={i} className="mb-2 text-xs">
                                                 <span className="font-bold bg-slate-100 px-1 rounded">{p.designation}</span>
                                                 {p.paymentList && <div className="mt-1 text-slate-500">Płatności: {p.paymentList}</div>}
                                                 {p.designationZal && <div className="text-slate-400">ZAL: {p.designationZal}</div>}
                                             </div>
                                         ))}
                                     </div>
                                  </div>
                              </div>
                          </td>
                      </tr>
                  )}
                </React.Fragment>
            )})}
            
            {visibleFields.length === 0 && (
              <tr>
                <td colSpan={6} className="p-12 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <FileSpreadsheet size={48} className="text-slate-300 mb-4" />
                    <h3 className="text-lg font-medium text-slate-700 mb-2">Brak danych w strukturze zasiewów</h3>
                    <p className="text-slate-500 max-w-md mx-auto mb-4">
                        Aby zobaczyć strukturę zasiewów (Oznaczenia, Uprawy, Ekoschematy), zaimportuj plik CSV "Struktura Zasiewów" dla roku {selectedYear}.
                    </p>
                    
                    {onCopyFromYear && (
                        <button 
                            onClick={() => onCopyFromYear(selectedYear - 1)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors shadow-sm text-sm font-semibold"
                        >
                            <Copy size={16} />
                            <span>Kopiuj strukturę z {selectedYear - 1}</span>
                        </button>
                    )}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
    </div>
  );
};

export default CropManager;

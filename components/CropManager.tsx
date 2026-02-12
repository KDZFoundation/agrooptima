
import React, { useState } from 'react';
import { Sprout, Edit2, Save, X, History, ChevronDown, ChevronUp, Trash2, Info, FileSpreadsheet, Download, UploadCloud, Filter } from 'lucide-react';
import { Field, CropType } from '../types';
import { CROP_TYPES } from '../constants';

interface CropManagerProps {
  fields: Field[];
  selectedYear: number;
  onUpdateFields: (updatedFields: Field[]) => void;
  onImport: () => void;
  onDownload: () => void;
}

const CropManager: React.FC<CropManagerProps> = ({ fields, selectedYear, onUpdateFields, onImport, onDownload }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedFieldId, setExpandedFieldId] = useState<string | null>(null);
  const [showAllFields, setShowAllFields] = useState(false);
  const [editForm, setEditForm] = useState<{
      crop: CropType;
      ecoSchemes: string;
  }>({ crop: 'Mieszanka', ecoSchemes: '' });

  const getCropDataForYear = (field: Field, year: number) => {
      if (year === 2026) {
          // Treat 'Nieznana' as undefined crop for display purposes
          if (field.crop === 'Nieznana') return null;
          return {
              crop: field.crop,
              ecoSchemes: [], 
              isMain: true
          };
      }
      const historyEntry = field.history?.find(h => h.year === year);
      if (historyEntry) {
          if (historyEntry.crop === 'Nieznana') return null;
          return {
              crop: historyEntry.crop,
              ecoSchemes: historyEntry.appliedEcoSchemes,
              isMain: false
          };
      }
      return null;
  };

  const startEditing = (field: Field) => {
    setEditingId(field.id);
    const cropData = getCropDataForYear(field, selectedYear);
    setEditForm({
        crop: cropData ? (cropData.crop as CropType) : 'Mieszanka',
        ecoSchemes: cropData ? cropData.ecoSchemes.join(', ') : '',
    });
  };

  const saveEditing = (id: string) => {
      const updatedFields = fields.map(field => {
          if (field.id !== id) return field;
          
          const newEcoSchemes = editForm.ecoSchemes.split(',').map(s => s.trim()).filter(s => s.length > 0);
          const updatedField = { ...field };

          if (selectedYear === 2026) {
              updatedField.crop = editForm.crop;
              // Note: EcoSchemes for 2026 plan typically come from optimization, but allowing manual edit here
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

  // Filter visible fields
  const visibleFields = fields.filter(field => {
      if (showAllFields) return true;
      // Only show fields that have data for the selected year
      const data = getCropDataForYear(field, selectedYear);
      return data !== null;
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
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="p-4 font-semibold text-slate-600">Nazwa / ID</th>
              <th className="p-4 font-semibold text-slate-600">Nr Ewidencyjny</th>
              <th className="p-4 font-semibold text-slate-600">Pow. Orna</th>
              <th className="p-4 font-semibold text-slate-600">Uprawa ({selectedYear})</th>
              <th className="p-4 font-semibold text-slate-600">Ekoschematy</th>
              <th className="p-4 font-semibold text-slate-600 text-right">Akcje</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visibleFields.map(field => {
                const cropData = getCropDataForYear(field, selectedYear);
                const isEditing = editingId === field.id;
                const historyEntry = field.history?.find(h => h.year === selectedYear);
                const isUnknown = cropData?.crop === 'Nieznana';

                return (
                <React.Fragment key={field.id}>
                  <tr className={`transition-colors ${isEditing ? 'bg-amber-50' : 'hover:bg-slate-50'}`}>
                    
                    {/* NAME */}
                    <td className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600">
                          <Sprout size={18} />
                        </div>
                        <span className="font-medium text-slate-900" title={field.name}>{field.name}</span>
                      </div>
                    </td>

                    {/* REG NUMBER */}
                    <td className="p-4 text-slate-500 font-mono text-sm">
                        {field.registrationNumber || '-'}
                    </td>

                    {/* AREA */}
                    <td className="p-4 text-slate-700 font-semibold">
                        {field.area.toFixed(2)} ha
                    </td>

                    {/* CROP */}
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
                                <div className="flex flex-col">
                                    <span className={`px-3 py-1 rounded-full text-sm font-medium border w-fit ${isUnknown ? 'bg-slate-100 text-slate-500 border-slate-200' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>
                                        {cropData.crop}
                                    </span>
                                    {historyEntry?.plantMix && (
                                        <span className="text-[10px] text-slate-400 mt-1 max-w-[150px] truncate" title={historyEntry.plantMix}>
                                            {historyEntry.plantMix}
                                        </span>
                                    )}
                                </div>
                            ) : (
                                <span className="text-slate-400 italic text-sm">Brak uprawy</span>
                            )
                        )}
                    </td>

                    {/* ECOSCHEMES */}
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

                    {/* ACTIONS */}
                    <td className="p-4 text-right">
                        {isEditing ? (
                             <div className="flex justify-end space-x-2">
                                <button onClick={() => saveEditing(field.id)} className="p-2 text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg transition-colors" title="Zapisz"><Save size={18} /></button>
                                <button onClick={() => setEditingId(null)} className="p-2 text-slate-500 hover:bg-slate-200 rounded-lg transition-colors" title="Anuluj"><X size={18} /></button>
                            </div>
                        ) : (
                            <div className="flex justify-end space-x-2">
                                <button onClick={() => startEditing(field)} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Edytuj Uprawę"><Edit2 size={18} /></button>
                                <button onClick={() => toggleHistory(field.id)} className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors inline-flex items-center space-x-1" title="Szczegóły">
                                    <Info size={16} />
                                    {expandedFieldId === field.id ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                                </button>
                                <button onClick={() => removeField(field.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Usuń działkę"><Trash2 size={18} /></button>
                            </div>
                        )}
                    </td>
                  </tr>
                  
                  {expandedFieldId === field.id && !isEditing && (
                      <tr className="bg-slate-50/50">
                          <td colSpan={6} className="p-4">
                              <div className="flex flex-col md:flex-row gap-6 bg-white border border-slate-200 rounded-lg p-6 ml-8 shadow-sm">
                                  
                                  {/* Section 1: History */}
                                  <div className="flex-1">
                                      <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                                          <History size={16} className="text-emerald-600"/>
                                          Szczegóły Zasiewu i Płatności
                                      </h4>
                                      <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead className="text-xs text-slate-500 bg-slate-100 uppercase">
                                                <tr>
                                                    <th className="p-2 text-left rounded-l-md">Rok</th>
                                                    <th className="p-2 text-left">Uprawa / Oznaczenie</th>
                                                    <th className="p-2 text-left">Ekoschematy / Płatności</th>
                                                    <th className="p-2 text-right rounded-r-md">Akcje</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {field.history?.map((hist, idx) => (
                                                    <React.Fragment key={idx}>
                                                        <tr className={hist.year === selectedYear ? "bg-emerald-50" : ""}>
                                                            <td className="p-2 font-medium text-slate-700 align-top">{hist.year}</td>
                                                            <td className="p-2 text-slate-600 align-top">
                                                                <div className="font-semibold">{hist.crop}</div>
                                                                {/* Display Designation if available */}
                                                                {(hist.designation || hist.designationZal) && (
                                                                    <div className="flex gap-2 mt-1">
                                                                        {hist.designation && (
                                                                            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200" title="Oznaczenie Uprawy">
                                                                                {hist.designation}
                                                                            </span>
                                                                        )}
                                                                        {hist.designationZal && (
                                                                            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200" title="Oznaczenie ZAL">
                                                                                {hist.designationZal}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                )}
                                                                {hist.plantMix && <div className="text-[10px] text-slate-400 mt-1 italic">{hist.plantMix}</div>}
                                                            </td>
                                                            <td className="p-2 align-top">
                                                                {/* EcoSchemes */}
                                                                <div className="flex gap-1 flex-wrap mb-1">
                                                                    {hist.appliedEcoSchemes.map(eco => (
                                                                        <span key={eco} className="text-xs bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-100">{eco}</span>
                                                                    ))}
                                                                </div>
                                                                {/* Extended Details */}
                                                                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-500">
                                                                    {hist.onwType && <div><span className="font-semibold">ONW:</span> {hist.onwType} ({hist.onwArea}ha)</div>}
                                                                    {hist.organic && <div><span className="font-semibold">Eko:</span> {hist.organic}</div>}
                                                                    
                                                                    {/* PRSK Details */}
                                                                    {hist.prskPackage && <div className="col-span-2 text-blue-600"><span className="font-semibold">PRSK:</span> {hist.prskPackage}</div>}
                                                                    {hist.prskFruitTreeVariety && <div><span className="text-slate-400">Drzewa:</span> {hist.prskFruitTreeVariety} ({hist.prskFruitTreeCount} szt.)</div>}
                                                                    
                                                                    {/* ZRSK Details */}
                                                                    {hist.zrskPackage && <div className="col-span-2 text-indigo-600 mt-1"><span className="font-semibold">ZRSK:</span> {hist.zrskPackage}</div>}
                                                                    {hist.zrskPractice && <div className="col-span-2 text-[10px] text-indigo-400 italic">Praktyka: {hist.zrskPractice}</div>}

                                                                    {hist.paymentList && <div className="col-span-2 text-[10px] text-slate-400 leading-tight mt-1 border-t pt-1 border-slate-100">{hist.paymentList}</div>}
                                                                </div>
                                                            </td>
                                                            <td className="p-2 text-right align-top">
                                                                <button 
                                                                    onClick={() => removeHistoryEntry(field.id, hist.year)}
                                                                    className="text-slate-400 hover:text-red-500 transition-colors p-1"
                                                                    title="Usuń"
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    </React.Fragment>
                                                ))}
                                                {(!field.history || field.history.length === 0) && (
                                                    <tr><td colSpan={4} className="p-2 text-center text-slate-400 italic">Brak wpisów historycznych</td></tr>
                                                )}
                                            </tbody>
                                        </table>
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
                    <h3 className="text-lg font-medium text-slate-700 mb-2">Brak zdefiniowanych upraw</h3>
                    <p className="text-slate-500 max-w-md mx-auto">
                        {fields.length > 0 
                         ? "Działki są zaimportowane, ale nie mają przypisanych upraw dla tego roku. Zaimportuj strukturę zasiewów lub zaznacz opcję 'Pokaż wszystkie', aby edytować ręcznie." 
                         : "Lista działek jest pusta. Zaimportuj dane."}
                    </p>
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

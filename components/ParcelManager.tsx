
import React, { useState } from 'react';
import { MapPin, Edit2, Save, X, Trash2, AlertCircle, Map, UploadCloud, Download, Layers, Copy } from 'lucide-react';
import { Field } from '../types';

interface ParcelManagerProps {
  fields: Field[];
  selectedYear: number;
  onUpdateFields: (updatedFields: Field[]) => void;
  onImport: () => void;
  onDownload: () => void;
  onCopyFromYear?: (year: number) => void;
}

const ParcelManager: React.FC<ParcelManagerProps> = ({ fields, selectedYear, onUpdateFields, onImport, onDownload, onCopyFromYear }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [editForm, setEditForm] = useState<{
      name: string;
      registrationNumber: string;
      area: string;
      eligibleArea: string;
      commune: string;
      precinctName: string;
      precinctNumber: string;
      mapSheet: string;
      voivodeship: string;
      district: string;
  }>({ name: '', registrationNumber: '', area: '', eligibleArea: '', commune: '', precinctName: '', precinctNumber: '', mapSheet: '', voivodeship: '', district: '' });

  // Helper
  const parsePolishNumber = (val: string | undefined): number => {
      if (!val) return 0;
      let cleaned = val.trim().replace(/\s/g, '').replace(/,/g, '.');
      const num = parseFloat(cleaned);
      return isNaN(num) ? 0 : num;
  };

  const getDimensionsForYear = (field: Field, year: number) => {
      const historyEntry = field.history?.find(h => h.year === year);
      
      let area = historyEntry?.area;
      let eligible = historyEntry?.eligibleArea;

      if (area === undefined) {
           // STRICT: No auto-fallback for 2026. Only show if explicitly exists.
           return { area: 0, eligible: 0 };
      }
      return { area: area || 0, eligible: eligible || 0 };
  };

  // --- STRICT FILTERING LOGIC ---
  const visibleFields = fields.filter(field => {
      const historyEntry = field.history?.find(h => h.year === selectedYear);
      
      if (!historyEntry) return false;

      // FILTER OUT CROPS: If it has designation, it's a Crop Structure entry.
      // Ewidencja should be clean parcels.
      if (historyEntry && (historyEntry.designation || historyEntry.designationZal)) {
          return false;
      }
      return true;
  }).sort((a, b) => (a.registrationNumber || '').localeCompare(b.registrationNumber || ''));

  // Calc totals for footer
  const totalEligible = visibleFields.reduce((sum, f) => sum + getDimensionsForYear(f, selectedYear).eligible, 0);
  const totalGeodetic = visibleFields.reduce((sum, f) => sum + getDimensionsForYear(f, selectedYear).area, 0);

  const startEditing = (field: Field) => {
    setEditingId(field.id);
    const dims = getDimensionsForYear(field, selectedYear);
    
    setEditForm({
        name: field.name,
        registrationNumber: field.registrationNumber || '',
        area: dims.area.toString().replace('.', ','), 
        eligibleArea: dims.eligible.toString().replace('.', ','),
        commune: field.commune || '',
        precinctName: field.precinctName || '',
        precinctNumber: field.precinctNumber || '',
        mapSheet: field.mapSheet || '',
        voivodeship: field.voivodeship || '',
        district: field.district || ''
    });
  };

  const saveEditing = (id: string) => {
      const updatedFields = fields.map(field => {
          if (field.id !== id) return field;
          
          const newArea = parsePolishNumber(editForm.area);
          const newEligible = parsePolishNumber(editForm.eligibleArea) || newArea;

          const updatedHistory = [...(field.history || [])];
          const histIndex = updatedHistory.findIndex(h => h.year === selectedYear);
          
          if (histIndex >= 0) {
              updatedHistory[histIndex] = {
                  ...updatedHistory[histIndex],
                  area: newArea,
                  eligibleArea: newEligible
              };
          } else {
              updatedHistory.push({
                  year: selectedYear,
                  crop: 'Nieznana',
                  appliedEcoSchemes: [],
                  area: newArea,
                  eligibleArea: newEligible
              });
              updatedHistory.sort((a,b) => b.year - a.year);
          }

          // Also update root fields if this is the "latest" year (simplification)
          // But keep year strictly separated in history
          const isPlanYear = selectedYear === 2026;

          return {
              ...field,
              name: editForm.name,
              registrationNumber: editForm.registrationNumber,
              // Only update root if we are in plan year, otherwise keep current state
              area: isPlanYear ? newArea : field.area,
              eligibleArea: isPlanYear ? newEligible : field.eligibleArea,
              commune: editForm.commune,
              precinctName: editForm.precinctName,
              precinctNumber: editForm.precinctNumber,
              mapSheet: editForm.mapSheet,
              voivodeship: editForm.voivodeship,
              district: editForm.district,
              history: updatedHistory
          };
      });
      onUpdateFields(updatedFields);
      setEditingId(null);
  };

  const removeField = (id: string) => {
    const field = fields.find(f => f.id === id);
    if (!field) return;

    // Check if field has history in other years
    const otherYears = field.history.filter(h => h.year !== selectedYear).map(h => h.year);
    
    let confirmMessage = `Czy na pewno chcesz usunąć działkę "${field.name}" (${field.registrationNumber})?`;
    
    if (otherYears.length > 0) {
        // If it exists in other years, we only remove the history entry for THIS year
        if (window.confirm(`Działka "${field.name}" posiada historię w innych latach (${otherYears.join(', ')}).\n\nCzy chcesz usunąć wpis TYLKO dla roku ${selectedYear}?`)) {
             const updatedFields = fields.map(f => {
                 if (f.id !== id) return f;
                 return { ...f, history: f.history.filter(h => h.year !== selectedYear) };
             });
             onUpdateFields(updatedFields);
        }
    } else {
        // Full delete
        confirmMessage += `\n\nDziałka zostanie trwale usunięta z ewidencji (brak historii).`;
        if (window.confirm(confirmMessage)) {
            onUpdateFields(fields.filter(f => f.id !== id));
        }
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden min-h-[400px]">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-end items-center gap-4 bg-slate-50">
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
                    <span>Importuj Działki</span>
                </button>
            </div>
        </div>

        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="p-4 font-semibold text-slate-600">Nazwa / ID</th>
              <th className="p-4 font-semibold text-slate-600">Nr Ewidencyjny</th>
              <th className="p-4 font-semibold text-slate-600">Lokalizacja (Gmina/Obręb)</th>
              {/* SWAPPED: Primary column is now PEG (Eligible) */}
              <th className="p-4 font-semibold text-slate-800 bg-amber-50 border-x border-amber-100">Hektar kwalifikujący się (PEG)</th>
              <th className="p-4 font-semibold text-slate-600">Pow. Geodezyjna</th>
              <th className="p-4 font-semibold text-slate-600 text-right">Akcje</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visibleFields.map((field) => {
                const isEditing = editingId === field.id;
                const dims = getDimensionsForYear(field, selectedYear);
                
                return (
                  <tr key={field.id} className={`transition-colors ${isEditing ? 'bg-amber-50' : 'hover:bg-slate-50'}`}>
                    {/* NAME */}
                    <td className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 rounded-lg bg-slate-100 text-slate-600">
                          <MapPin size={18} />
                        </div>
                        <div className="flex flex-col">
                            {isEditing ? (
                                <input 
                                    type="text"
                                    value={editForm.name}
                                    onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                                    className="border border-amber-300 rounded px-2 py-1 text-sm w-full focus:outline-none focus:ring-1 focus:ring-amber-500"
                                />
                            ) : (
                                <span className="font-medium text-slate-900" title={field.name}>
                                    {field.name}
                                </span>
                            )}
                        </div>
                      </div>
                    </td>

                    {/* REG NUMBER */}
                    <td className="p-4 text-slate-500 font-mono text-sm">
                        {isEditing ? (
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

                    {/* LOCATION */}
                    <td className="p-4 text-slate-500 text-sm">
                        {isEditing ? (
                            <div className="flex flex-col gap-1">
                                <input 
                                    type="text"
                                    value={editForm.commune}
                                    onChange={(e) => setEditForm({...editForm, commune: e.target.value})}
                                    placeholder="Gmina"
                                    className="border border-amber-300 rounded px-2 py-1 text-xs w-28 focus:outline-none"
                                />
                                <div className="flex gap-1">
                                     <input 
                                        type="text"
                                        value={editForm.precinctName}
                                        onChange={(e) => setEditForm({...editForm, precinctName: e.target.value})}
                                        placeholder="Obręb"
                                        className="border border-amber-300 rounded px-2 py-1 text-xs w-16 focus:outline-none"
                                    />
                                    <input 
                                        type="text"
                                        value={editForm.precinctNumber}
                                        onChange={(e) => setEditForm({...editForm, precinctNumber: e.target.value})}
                                        placeholder="Nr"
                                        className="border border-amber-300 rounded px-2 py-1 text-xs w-10 focus:outline-none"
                                    />
                                </div>
                            </div>
                        ) : (
                            (field.commune || field.precinctName) ? (
                                <div className="flex flex-col">
                                    <span className="font-medium">{field.commune}</span>
                                    <span className="text-xs text-slate-400">
                                        {field.precinctName} {field.precinctNumber ? `(${field.precinctNumber})` : ''}
                                    </span>
                                </div>
                            ) : <span className="text-slate-300">-</span>
                        )}
                    </td>

                    {/* ELIGIBLE AREA (PEG) - Now the primary highlighted column */}
                    <td className="p-4 text-slate-800 font-bold bg-amber-50/50 border-x border-amber-100">
                        {isEditing ? (
                            <input 
                                type="text"
                                value={editForm.eligibleArea}
                                onChange={(e) => setEditForm({...editForm, eligibleArea: e.target.value})}
                                className="border border-amber-300 rounded px-2 py-1 text-sm w-20 focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white"
                            />
                        ) : (
                            `${dims.eligible.toFixed(2)} ha`
                        )}
                    </td>

                    {/* GEODETIC AREA - Moved to secondary */}
                    <td className="p-4 text-slate-600">
                        {isEditing ? (
                            <input 
                                type="text"
                                value={editForm.area}
                                onChange={(e) => setEditForm({...editForm, area: e.target.value})}
                                className="border border-amber-300 rounded px-2 py-1 text-sm w-20 focus:outline-none focus:ring-1 focus:ring-amber-500"
                            />
                        ) : (
                            <div className="flex items-center gap-2">
                                <span>{dims.area.toFixed(2)} ha</span>
                            </div>
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
                                <button onClick={() => startEditing(field)} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Edytuj"><Edit2 size={18} /></button>
                                <button onClick={() => removeField(field.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Usuń działkę z bazy (Kosz)"><Trash2 size={18} /></button>
                            </div>
                        )}
                    </td>
                  </tr>
                );
            })}
            
            {/* FOOTER SUMMARY */}
            {visibleFields.length > 0 && (
                <tr className="bg-slate-100 border-t-2 border-slate-200 font-bold text-slate-700">
                    <td colSpan={3} className="p-4 text-right">SUMA (Dla widocznych działek):</td>
                    <td className="p-4 text-emerald-700">{totalEligible.toFixed(2)} ha</td>
                    <td className="p-4 text-slate-600">{totalGeodetic.toFixed(2)} ha</td>
                    <td></td>
                </tr>
            )}
            
            {visibleFields.length === 0 && (
              <tr>
                <td colSpan={6} className="p-12 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <Map size={48} className="text-slate-300 mb-4" />
                    <h3 className="text-lg font-medium text-slate-700 mb-2">Brak zdefiniowanych działek w {selectedYear}</h3>
                    <p className="text-slate-500 max-w-md mx-auto mb-4">
                        {fields.length > 0 
                         ? "Dane dla tego roku nie zostały wczytane z pliku Działek." 
                         : "Lista działek jest pusta. Zaimportuj plik 'Działki' dla tego roku."}
                    </p>
                    
                    {onCopyFromYear && (
                        <button 
                            onClick={() => onCopyFromYear(selectedYear - 1)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors shadow-sm text-sm font-semibold"
                        >
                            <Copy size={16} />
                            <span>Kopiuj działki z {selectedYear - 1}</span>
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

export default ParcelManager;


import React, { useState } from 'react';
import { MapPin, Edit2, Save, X, Trash2, AlertCircle, Map, UploadCloud, Download, Filter } from 'lucide-react';
import { Field } from '../types';

interface ParcelManagerProps {
  fields: Field[];
  selectedYear: number;
  onUpdateFields: (updatedFields: Field[]) => void;
  onImport: () => void;
  onDownload: () => void;
}

const ParcelManager: React.FC<ParcelManagerProps> = ({ fields, selectedYear, onUpdateFields, onImport, onDownload }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAllFields, setShowAllFields] = useState(false);
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

  const startEditing = (field: Field) => {
    setEditingId(field.id);
    setEditForm({
        name: field.name,
        registrationNumber: field.registrationNumber || '',
        area: field.area.toString().replace('.', ','), 
        eligibleArea: field.eligibleArea.toString().replace('.', ','),
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
          return {
              ...field,
              name: editForm.name,
              registrationNumber: editForm.registrationNumber,
              area: parsePolishNumber(editForm.area),
              eligibleArea: parsePolishNumber(editForm.eligibleArea) || parsePolishNumber(editForm.area),
              commune: editForm.commune,
              precinctName: editForm.precinctName,
              precinctNumber: editForm.precinctNumber,
              mapSheet: editForm.mapSheet,
              voivodeship: editForm.voivodeship,
              district: editForm.district
          };
      });
      onUpdateFields(updatedFields);
      setEditingId(null);
  };

  const removeField = (id: string) => {
    if (window.confirm("Czy na pewno chcesz trwale usunąć to pole z ewidencji? Operacja jest nieodwracalna.")) {
        onUpdateFields(fields.filter(f => f.id !== id));
    }
  };

  // Filter visible fields based on history or showAll flag
  const visibleFields = fields.filter(field => {
      if (showAllFields) return true;
      // Only show fields that have a history entry for the selected year
      return field.history && field.history.some(h => h.year === selectedYear);
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
                <span className="font-medium">Pokaż cały rejestr (wszystkie lata)</span>
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
              <th className="p-4 font-semibold text-slate-600">Pow. Orna</th>
              <th className="p-4 font-semibold text-slate-600">Pow. Kwal.</th>
              <th className="p-4 font-semibold text-slate-600 text-right">Akcje</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visibleFields.map(field => {
                const isEditing = editingId === field.id;
                return (
                  <tr key={field.id} className={`transition-colors ${isEditing ? 'bg-amber-50' : 'hover:bg-slate-50'}`}>
                    {/* NAME */}
                    <td className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 rounded-lg bg-slate-100 text-slate-600">
                          <MapPin size={18} />
                        </div>
                        {isEditing ? (
                            <input 
                                type="text"
                                value={editForm.name}
                                onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                                className="border border-amber-300 rounded px-2 py-1 text-sm w-full focus:outline-none focus:ring-1 focus:ring-amber-500"
                            />
                        ) : (
                            <span className="font-medium text-slate-900" title={field.name}>{field.name}</span>
                        )}
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

                    {/* AREA */}
                    <td className="p-4 text-slate-700 font-semibold">
                        {isEditing ? (
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
                                <button onClick={() => removeField(field.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Usuń działkę"><Trash2 size={18} /></button>
                            </div>
                        )}
                    </td>
                  </tr>
                );
            })}
            
            {visibleFields.length === 0 && (
              <tr>
                <td colSpan={6} className="p-12 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <Map size={48} className="text-slate-300 mb-4" />
                    <h3 className="text-lg font-medium text-slate-700 mb-2">Brak zdefiniowanych działek w {selectedYear}</h3>
                    <p className="text-slate-500 max-w-md mx-auto">
                        {fields.length > 0 
                         ? "Masz zaimportowane działki w innych latach. Zaznacz 'Pokaż cały rejestr' aby je zobaczyć." 
                         : "Lista działek jest pusta. Zaimportuj plik 'Działki' dla tego roku."}
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

export default ParcelManager;

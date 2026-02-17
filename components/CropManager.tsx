
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
}

const CropManager: React.FC<CropManagerProps> = ({ fields, selectedYear, onUpdateFields, onImport, onDownload }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedFieldId, setExpandedFieldId] = useState<string | null>(null);
  const [showAllFields, setShowAllFields] = useState(false);
  
  const [editForm, setEditForm] = useState<{ crop: CropType; ecoSchemes: string; designation: string; }>({ crop: 'Mieszanka', ecoSchemes: '', designation: 'A' });
  const [formErrors, setFormErrors] = useState<Record<string, boolean>>({});

  const getCropDataForYear = (field: Field, year: number) => {
      const historyEntry = field.history?.find(h => h.year === year);
      if (!historyEntry) return null;
      if (historyEntry.crop === 'Nieznana' && !historyEntry.designation && (!historyEntry.cropParts || historyEntry.cropParts.length === 0)) return null;

      const parts = (historyEntry.cropParts && historyEntry.cropParts.length > 0) 
        ? historyEntry.cropParts 
        : [{ designation: historyEntry.designation || 'A', crop: historyEntry.crop, area: historyEntry.area || field.area, ecoSchemes: historyEntry.appliedEcoSchemes }];

      return { crop: historyEntry.crop, parts };
  };

  const handleCopyPreviousYear = () => {
    const prevYear = selectedYear - 1;
    const updated = fields.map(f => {
        const prevHist = f.history.find(h => h.year === prevYear);
        if (!prevHist) return f;
        const currentHistIdx = f.history.findIndex(h => h.year === selectedYear);
        
        const copiedData = { ...prevHist, year: selectedYear };
        const newHist = [...f.history];
        if (currentHistIdx >= 0) newHist[currentHistIdx] = copiedData;
        else newHist.push(copiedData);
        
        return { ...f, history: newHist.sort((a,b)=>b.year-a.year) };
    });
    onUpdateFields(updated);
    alert(`Skopiowano dane z roku ${prevYear} do roku ${selectedYear}.`);
  };

  const startEditing = (field: Field) => {
    setEditingId(field.id);
    setFormErrors({});
    const cropData = getCropDataForYear(field, selectedYear);
    const firstPart = cropData?.parts?.[0];
    setEditForm({ crop: firstPart ? (firstPart.crop as CropType) : 'Mieszanka', ecoSchemes: firstPart ? firstPart.ecoSchemes.join(', ') : '', designation: firstPart ? firstPart.designation : 'A' });
  };

  const saveEditing = (id: string) => {
      if (!editForm.designation.trim()) {
          setFormErrors({ designation: true });
          return;
      }

      const updated = fields.map(field => {
          if (field.id !== id) return field;
          const newEco = editForm.ecoSchemes.split(',').map(s=>s.trim()).filter(s=>s);
          const histIdx = field.history.findIndex(h => h.year === selectedYear);
          const newEntry = { year: selectedYear, crop: editForm.crop, appliedEcoSchemes: newEco, designation: editForm.designation, cropParts: [{ designation: editForm.designation, crop: editForm.crop, area: field.area, ecoSchemes: newEco }] };
          const hist = [...field.history];
          if (histIdx >= 0) hist[histIdx] = newEntry; else hist.push(newEntry);
          return { ...field, history: hist.sort((a,b)=>b.year-a.year) };
      });
      onUpdateFields(updated);
      setEditingId(null);
      setFormErrors({});
  };

  const visibleFields = fields.filter(f => showAllFields || getCropDataForYear(f, selectedYear) !== null).sort((a,b) => a.name.localeCompare(b.name, undefined, {numeric: true}));

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden min-h-[400px]">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50">
            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm hover:border-emerald-300">
                <input type="checkbox" checked={showAllFields} onChange={(e) => setShowAllFields(e.target.checked)} className="rounded border-slate-300 text-emerald-600" />
                <span className="font-medium">Pokaż wszystkie pola</span>
            </label>
            <div className="flex gap-2">
                <button onClick={handleCopyPreviousYear} className="text-blue-600 hover:text-blue-700 px-3 py-2 text-sm font-bold flex items-center gap-1 bg-white border border-blue-200 rounded-lg"><Copy size={16} /> Kopiuj z {selectedYear-1}</button>
                <button onClick={onDownload} className="text-slate-500 hover:text-emerald-600 px-3 py-2 text-sm font-medium bg-white border border-slate-300 rounded-lg"><Download size={16} /></button>
                <button onClick={onImport} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm text-sm font-black"><UploadCloud size={18} /> Import CSV</button>
            </div>
        </div>

        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500">
            <tr>
              <th className="p-4 font-semibold w-1/4">Działka</th>
              <th className="p-4 font-semibold text-center w-24">Ozn.</th>
              <th className="p-4 font-semibold">Roślina</th>
              <th className="p-4 font-semibold">Powierzchnia</th>
              <th className="p-4 font-semibold">Ekoschematy</th>
              <th className="p-4 font-semibold text-right">Akcja</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visibleFields.map(field => {
                const data = getCropDataForYear(field, selectedYear);
                const isEditing = editingId === field.id;
                const rows = data?.parts || [{ designation: '-', crop: null, area: field.area, ecoSchemes: [] }];

                return rows.map((part: any, idx: number) => (
                    <tr key={`${field.id}-${idx}`} className={`transition-colors ${isEditing ? 'bg-amber-50' : 'hover:bg-slate-50'}`}>
                        <td className="p-4">{idx === 0 && <div><div className="font-bold">{field.name}</div><div className="text-[10px] text-slate-400 font-mono">{field.registrationNumber}</div></div>}</td>
                        <td className="p-4 text-center">{isEditing && idx === 0 ? <input value={editForm.designation} onChange={e=>setEditForm({...editForm, designation: e.target.value})} className={`w-10 border rounded text-center font-bold ${formErrors.designation ? 'border-red-500 ring-1 ring-red-500' : ''}`} placeholder="A"/> : <span className="bg-slate-800 text-white px-2 py-1 rounded-full text-xs font-bold">{part.designation}</span>}</td>
                        <td className="p-4">{isEditing && idx === 0 ? <select value={editForm.crop} onChange={e=>setEditForm({...editForm, crop: e.target.value as any})} className="border rounded p-1 text-sm">{CROP_TYPES.map(c=><option key={c} value={c}>{c}</option>)}</select> : <span className="font-semibold text-slate-700">{part.crop || 'Brak'}</span>}</td>
                        <td className="p-4 font-mono">{part.area.toFixed(2)} ha</td>
                        <td className="p-4">{isEditing && idx === 0 ? <input value={editForm.ecoSchemes} onChange={e=>setEditForm({...editForm, ecoSchemes: e.target.value})} className="border rounded p-1 text-xs w-full" placeholder="np. E_ZSU, E_MIO"/> : <div className="flex flex-wrap gap-1">{part.ecoSchemes.map((es:string)=><span key={es} className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200 font-black">{es}</span>)}</div>}</td>
                        <td className="p-4 text-right">{idx === 0 && (isEditing ? <div className="flex justify-end gap-2"><button onClick={()=>saveEditing(field.id)} className="p-1.5 text-white bg-emerald-500 rounded shadow"><Save size={16}/></button><button onClick={()=>{setEditingId(null); setFormErrors({});}} className="p-1.5 text-slate-500 hover:bg-slate-200 rounded"><X size={16}/></button></div> : <button onClick={()=>startEditing(field)} className="p-1.5 text-slate-400 hover:text-emerald-600 rounded"><Edit2 size={16}/></button>)}</td>
                    </tr>
                ));
            })}
          </tbody>
        </table>
    </div>
  );
};

export default CropManager;

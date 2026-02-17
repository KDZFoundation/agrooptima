
import React, { useState, useMemo } from 'react';
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

    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    const parsePolishNumber = (val: string | undefined): number => {
        if (!val) return 0;
        let cleaned = val.trim().replace(/\s/g, '').replace(/,/g, '.');
        const num = parseFloat(cleaned);
        return isNaN(num) ? 0 : num;
    };

    // WIDOK EWIDENCJI: Tylko działki z realnym PEG > 0 dla wybranego roku
    const visibleFields = useMemo(() => {
        return fields.filter(field => {
            const hist = field.history?.find(h => h.year === selectedYear);
            return hist && (hist.eligibleArea || 0) > 0;
        }).sort((a, b) => (a.registrationNumber || '').localeCompare(b.registrationNumber || '', undefined, { numeric: true }));
    }, [fields, selectedYear]);

    // SUMA MATEMATYCZNA: Zgodnie z prośbą, suma eligibleArea z pliku CSV
    const totalEligible = useMemo(() => {
        return visibleFields.reduce((sum, f) => {
            const h = f.history?.find(x => x.year === selectedYear);
            return sum + (h?.eligibleArea || 0);
        }, 0);
    }, [visibleFields, selectedYear]);

    const startEditing = (field: Field) => {
        setEditingId(field.id);
        setFormErrors({});
        const hist = field.history?.find(h => h.year === selectedYear);
        setEditForm({
            name: field.name,
            registrationNumber: field.registrationNumber || '',
            area: (hist?.area || 0).toString().replace('.', ','),
            eligibleArea: (hist?.eligibleArea || 0).toString().replace('.', ','),
            commune: field.commune || '',
            precinctName: field.precinctName || '',
            precinctNumber: field.precinctNumber || '',
            mapSheet: field.mapSheet || '',
            voivodeship: field.voivodeship || '',
            district: field.district || ''
        });
    };

    const validateEdit = () => {
        const errors: Record<string, string> = {};
        if (!editForm.registrationNumber.trim()) errors.registrationNumber = 'Wymagane';

        const areaNum = parsePolishNumber(editForm.area);
        if (areaNum <= 0) errors.area = '> 0';

        const eligibleNum = parsePolishNumber(editForm.eligibleArea);
        if (eligibleNum < 0) errors.eligibleArea = '>= 0';
        if (eligibleNum > areaNum) errors.eligibleArea = '<= Area';

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const saveEditing = (id: string) => {
        if (!validateEdit()) return;

        const updatedFields = fields.map(field => {
            if (field.id !== id) return field;
            const newArea = parsePolishNumber(editForm.area);
            const newEligible = parsePolishNumber(editForm.eligibleArea) || newArea;
            const updatedHistory = [...(field.history || [])];
            const histIndex = updatedHistory.findIndex(h => h.year === selectedYear);

            if (histIndex >= 0) {
                updatedHistory[histIndex] = { ...updatedHistory[histIndex], area: newArea, eligibleArea: newEligible };
            } else {
                updatedHistory.push({ year: selectedYear, crop: 'Nieznana', appliedEcoSchemes: [], area: newArea, eligibleArea: newEligible });
                updatedHistory.sort((a, b) => b.year - a.year);
            }

            return {
                ...field,
                name: editForm.name,
                registrationNumber: editForm.registrationNumber,
                commune: editForm.commune,
                precinctName: editForm.precinctName,
                precinctNumber: editForm.precinctNumber,
                mapSheet: editForm.mapSheet,
                history: updatedHistory
            };
        });
        onUpdateFields(updatedFields);
        setEditingId(null);
        setFormErrors({});
    };

    const removeField = (id: string) => {
        const field = fields.find(f => f.id === id);
        if (!field) return;
        if (window.confirm(`Czy na pewno usunąć zapis tej działki dla roku ${selectedYear}?`)) {
            onUpdateFields(fields.map(f => f.id === id ? { ...f, history: f.history.filter(h => h.year !== selectedYear) } : f));
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden min-h-[400px]">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-end items-center gap-4 bg-slate-50">
                <div className="flex gap-2">
                    <button onClick={onDownload} className="text-slate-500 hover:text-emerald-600 px-3 py-2 text-sm font-medium transition-colors flex items-center gap-1 bg-white border border-slate-300 rounded-lg hover:border-emerald-300"><Download size={16} /> <span className="hidden sm:inline">Pobierz Szablon</span></button>
                    <button onClick={onImport} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors shadow-sm text-sm font-semibold"><UploadCloud size={18} /><span>Importuj Działki</span></button>
                </div>
            </div>

            <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                        <th className="p-4 font-semibold text-slate-600">Nazwa / ID</th>
                        <th className="p-4 font-semibold text-slate-600">Nr Ewidencyjny</th>
                        <th className="p-4 font-semibold text-slate-600">Lokalizacja</th>
                        <th className="p-4 font-semibold text-slate-800 bg-amber-50 border-x border-amber-100">Pow. PEG (ha)</th>
                        <th className="p-4 font-semibold text-slate-600">Pow. Geod. (ha)</th>
                        <th className="p-4 font-semibold text-right text-slate-600">Akcje</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {visibleFields.map((field) => {
                        const isEditing = editingId === field.id;
                        const hist = field.history?.find(h => h.year === selectedYear);
                        return (
                            <tr key={field.id} className={`transition-colors ${isEditing ? 'bg-amber-50' : 'hover:bg-slate-50'}`}>
                                <td className="p-4">
                                    <div className="flex items-center space-x-3">
                                        <div className="p-2 rounded-lg bg-slate-100 text-slate-600"><MapPin size={18} /></div>
                                        {isEditing ? <input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className="border border-amber-300 rounded px-2 py-1 text-sm focus:ring-1 focus:ring-amber-500" /> : <span className="font-medium text-slate-900">{field.name}</span>}
                                    </div>
                                </td>
                                <td className="p-4 font-mono text-sm">
                                    {isEditing ? (
                                        <div>
                                            <input value={editForm.registrationNumber} onChange={e => setEditForm({ ...editForm, registrationNumber: e.target.value })} className={`border rounded px-2 py-1 text-sm w-24 ${formErrors.registrationNumber ? 'border-red-500' : 'border-amber-300'}`} />
                                            {formErrors.registrationNumber && <div className="text-[10px] text-red-500 mt-0.5 font-bold">{formErrors.registrationNumber}</div>}
                                        </div>
                                    ) : field.registrationNumber || '-'}
                                </td>
                                <td className="p-4 text-slate-500 text-sm">
                                    {isEditing ? <input value={editForm.commune} onChange={e => setEditForm({ ...editForm, commune: e.target.value })} placeholder="Gmina" className="border border-amber-300 rounded px-2 py-1 text-xs w-28" /> : <span>{field.commune}</span>}
                                </td>
                                <td className="p-4 text-slate-800 font-bold bg-amber-50/50 border-x border-amber-100">
                                    {isEditing ? (
                                        <div>
                                            <input value={editForm.eligibleArea} onChange={e => setEditForm({ ...editForm, eligibleArea: e.target.value })} className={`border rounded px-2 py-1 text-sm w-20 bg-white ${formErrors.eligibleArea ? 'border-red-500' : 'border-amber-300'}`} />
                                            {formErrors.eligibleArea && <div className="text-[10px] text-red-500 mt-0.5">{formErrors.eligibleArea}</div>}
                                        </div>
                                    ) : (hist?.eligibleArea || 0).toFixed(2)}
                                </td>
                                <td className="p-4 text-slate-600">
                                    {isEditing ? (
                                        <div>
                                            <input value={editForm.area} onChange={e => setEditForm({ ...editForm, area: e.target.value })} className={`border rounded px-2 py-1 text-sm w-20 ${formErrors.area ? 'border-red-500' : 'border-amber-300'}`} />
                                            {formErrors.area && <div className="text-[10px] text-red-500 mt-0.5">{formErrors.area}</div>}
                                        </div>
                                    ) : (hist?.area || 0).toFixed(2)}
                                </td>
                                <td className="p-4 text-right">
                                    {isEditing ? (
                                        <div className="flex justify-end space-x-2">
                                            <button onClick={() => saveEditing(field.id)} className="p-2 text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg shadow-sm"><Save size={16} /></button>
                                            <button onClick={() => { setEditingId(null); setFormErrors({}); }} className="p-2 text-slate-500 hover:bg-slate-200 rounded-lg"><X size={16} /></button>
                                        </div>
                                    ) : (
                                        <div className="flex justify-end space-x-2">
                                            <button onClick={() => startEditing(field)} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"><Edit2 size={16} /></button>
                                            <button onClick={() => removeField(field.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                    {visibleFields.length > 0 && (
                        <tr className="bg-slate-100 border-t-2 border-slate-200 font-bold text-slate-700">
                            <td colSpan={3} className="p-4 text-right uppercase text-xs">Suma Hektarów (Matematyczna):</td>
                            <td className="p-4 text-emerald-700 font-black">{totalEligible.toFixed(2)} ha</td>
                            <td className="p-4 text-slate-600">-</td>
                            <td></td>
                        </tr>
                    )}
                    {visibleFields.length === 0 && (
                        <tr><td colSpan={6} className="p-12 text-center text-slate-400 flex flex-col items-center"><Map size={48} className="mb-4 opacity-20" /><p>Brak działek referencyjnych (PEG &gt; 0). Zaimportuj plik 'Działki'.</p></td></tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default ParcelManager;

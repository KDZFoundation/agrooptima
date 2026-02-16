
import React, { useState } from 'react';
import { ClipboardList, Plus, Search, Calendar, Tractor, Droplets, Leaf, Sprout, Save, X, Trash2, Camera, MapPin, AlertCircle, Sparkles, Loader2, Mic } from 'lucide-react';
import { FieldOperation, Field, OperationType } from '../types';
import { parseOperationNote } from '../services/geminiService';

interface OperationsLogProps {
    operations: FieldOperation[];
    fields: Field[];
    onAddOperation: (op: FieldOperation) => void;
    onDeleteOperation: (id: string) => void;
    isAdvisor?: boolean;
}

const OperationsLog: React.FC<OperationsLogProps> = ({ operations, fields, onAddOperation, onDeleteOperation, isAdvisor }) => {
    const [showAddModal, setShowAddModal] = useState(false);
    const [filter, setFilter] = useState('');
    const [isParsing, setIsParsing] = useState(false);
    const [smartNote, setSmartNote] = useState('');
    
    const [formData, setFormData] = useState<Partial<FieldOperation>>({
        date: new Date().toISOString().split('T')[0],
        type: 'NAWOZENIE',
        fieldId: fields[0]?.id || '',
        productName: '',
        dosage: '',
        unit: 'kg/ha',
        isEcoSchemeRelevant: false
    });

    const handleSmartParse = async () => {
        if (!smartNote.trim()) return;
        setIsParsing(true);
        try {
            const fieldNames = fields.map(f => f.name);
            const parsed = await parseOperationNote(smartNote, fieldNames);
            
            // Mapujemy nazwę pola z powrotem na ID
            const field = fields.find(f => f.name.toLowerCase().includes(parsed.fieldName?.toLowerCase() || ''));
            
            setFormData(prev => ({
                ...prev,
                type: (parsed.type as OperationType) || prev.type,
                productName: parsed.productName || prev.productName,
                dosage: parsed.dosage || prev.dosage,
                unit: parsed.unit || prev.unit,
                fieldId: field?.id || prev.fieldId,
                isEcoSchemeRelevant: parsed.isEcoSchemeRelevant || prev.isEcoSchemeRelevant
            }));
            setSmartNote('');
        } catch (e) {
            console.error(e);
        } finally {
            setIsParsing(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const field = fields.find(f => f.id === formData.fieldId);
        if (!field) return;

        const newOp: FieldOperation = {
            id: `op_${Date.now()}`,
            fieldId: field.id,
            fieldName: field.name,
            date: formData.date!,
            type: formData.type!,
            productName: formData.productName!,
            dosage: formData.dosage!,
            unit: formData.unit!,
            isEcoSchemeRelevant: formData.isEcoSchemeRelevant || false,
            linkedEcoScheme: formData.linkedEcoScheme
        };

        onAddOperation(newOp);
        setShowAddModal(false);
    };

    const getTypeColor = (type: OperationType) => {
        switch(type) {
            case 'NAWOZENIE': return 'bg-blue-100 text-blue-700';
            case 'OPRYSK': return 'bg-purple-100 text-purple-700';
            case 'SIEW': return 'bg-emerald-100 text-emerald-700';
            case 'ZBIOR': return 'bg-amber-100 text-amber-700';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    const getTypeIcon = (type: OperationType) => {
        switch(type) {
            case 'NAWOZENIE': return <Droplets size={16} />;
            case 'OPRYSK': return <AlertCircle size={16} />;
            case 'SIEW': return <Leaf size={16} />;
            case 'ZBIOR': return <Sprout size={16} />;
            default: return <Tractor size={16} />;
        }
    };

    const filteredOps = operations.filter(op => 
        op.fieldName.toLowerCase().includes(filter.toLowerCase()) || 
        op.productName.toLowerCase().includes(filter.toLowerCase())
    ).sort((a,b) => b.date.localeCompare(a.date));

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                        <ClipboardList className="text-emerald-600" />
                        Ewidencja Zabiegów
                    </h2>
                    <p className="text-slate-500 font-medium">Rejestr prac polowych i dokumentacja ekoschematów.</p>
                </div>
                {!isAdvisor && (
                    <button 
                        onClick={() => setShowAddModal(true)}
                        className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-200 hover:bg-emerald-700 active:scale-95 transition-all flex items-center gap-2"
                    >
                        <Plus size={18} /> Dodaj wpis
                    </button>
                )}
            </div>

            {/* Smart Add Bar for Mobile/Quick entry */}
            {!isAdvisor && (
                <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-sm flex flex-col gap-3">
                    <div className="flex items-center gap-2 text-emerald-800 text-xs font-black uppercase tracking-widest px-1">
                        <Sparkles size={14} /> Inteligentna Notatka AI
                    </div>
                    <div className="relative">
                        <input 
                            type="text" 
                            value={smartNote}
                            onChange={(e) => setSmartNote(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSmartParse()}
                            placeholder="Wpisz np. 'Wczoraj rozsiałem 200kg mocznika na polu pod lasem'..."
                            className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-medium text-slate-700"
                        />
                        <button 
                            onClick={handleSmartParse}
                            disabled={isParsing || !smartNote}
                            className="absolute right-2 top-1.5 p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-all"
                        >
                            {isParsing ? <Loader2 size={18} className="animate-spin" /> : <Mic size={18} />}
                        </button>
                    </div>
                </div>
            )}

            <div className="relative">
                <Search className="absolute left-4 top-3.5 text-slate-400" size={18} />
                <input 
                    type="text" 
                    placeholder="Szukaj po polu lub produkcie..."
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-medium text-slate-700 shadow-sm"
                />
            </div>

            <div className="space-y-3">
                {filteredOps.map(op => (
                    <div key={op.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:border-emerald-200 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-xl ${getTypeColor(op.type)}`}>
                                {getTypeIcon(op.type)}
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h4 className="font-black text-slate-800">{op.fieldName}</h4>
                                    <span className="text-[10px] text-slate-400 font-bold uppercase">{op.date}</span>
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-sm font-bold text-slate-600">{op.productName}</span>
                                    <span className="text-xs text-slate-400">• {op.dosage} {op.unit}</span>
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                            {op.isEcoSchemeRelevant && (
                                <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-100 flex items-center gap-1">
                                    <Leaf size={12} /> Ekoschemat
                                </span>
                            )}
                            {!isAdvisor && (
                                <button 
                                    onClick={() => onDeleteOperation(op.id)}
                                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                    <Trash2 size={18} />
                                </button>
                            )}
                        </div>
                    </div>
                ))}
                {filteredOps.length === 0 && (
                    <div className="p-12 text-center text-slate-400">
                        <ClipboardList size={48} className="mx-auto mb-4 opacity-10" />
                        <p className="font-bold">Brak wpisów w ewidencji.</p>
                    </div>
                )}
            </div>

            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowAddModal(false)}></div>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg relative z-10 animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
                        <div className="p-5 bg-slate-900 text-white flex justify-between items-center">
                            <h3 className="text-sm font-black uppercase tracking-widest">Nowy wpis w ewidencji</h3>
                            <button onClick={() => setShowAddModal(false)}><X size={24} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Data</label>
                                    <input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full border p-2.5 rounded-xl bg-slate-50 font-bold outline-none focus:ring-2 focus:ring-emerald-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Typ</label>
                                    <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as OperationType})} className="w-full border p-2.5 rounded-xl bg-slate-50 font-bold outline-none focus:ring-2 focus:ring-emerald-500">
                                        <option value="NAWOZENIE">Nawożenie</option>
                                        <option value="OPRYSK">Ochrona roślin</option>
                                        <option value="SIEW">Siew/Sadzenie</option>
                                        <option value="UPRAWA">Uprawa roli</option>
                                        <option value="ZBIOR">Zbiór</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Pole</label>
                                <select value={formData.fieldId} onChange={e => setFormData({...formData, fieldId: e.target.value})} className="w-full border p-2.5 rounded-xl bg-slate-50 font-bold outline-none focus:ring-2 focus:ring-emerald-500">
                                    {fields.map(f => <option key={f.id} value={f.id}>{f.name} ({f.registrationNumber})</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Produkt / Preparat</label>
                                <input type="text" required value={formData.productName || ''} onChange={e => setFormData({...formData, productName: e.target.value})} placeholder="np. Mocznik, Afalon..." className="w-full border p-2.5 rounded-xl bg-slate-50 font-bold outline-none focus:ring-2 focus:ring-emerald-500" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Dawka</label>
                                    <input type="text" required value={formData.dosage || ''} onChange={e => setFormData({...formData, dosage: e.target.value})} placeholder="np. 150" className="w-full border p-2.5 rounded-xl bg-slate-50 font-bold outline-none focus:ring-2 focus:ring-emerald-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Jednostka</label>
                                    <select value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} className="w-full border p-2.5 rounded-xl bg-slate-50 font-bold outline-none focus:ring-2 focus:ring-emerald-500">
                                        <option value="kg/ha">kg/ha</option>
                                        <option value="l/ha">l/ha</option>
                                        <option value="t/ha">t/ha</option>
                                        <option value="szt/ha">szt/ha</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                                <input 
                                    type="checkbox" 
                                    id="eco_check"
                                    checked={formData.isEcoSchemeRelevant}
                                    onChange={e => setFormData({...formData, isEcoSchemeRelevant: e.target.checked})}
                                    className="w-5 h-5 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500"
                                />
                                <label htmlFor="eco_check" className="text-xs font-black text-emerald-800 uppercase tracking-tight cursor-pointer">Wpis do dokumentacji ekoschematów</label>
                            </div>

                            <div className="flex gap-2">
                                <button type="button" className="flex-1 py-3 rounded-xl border-2 border-slate-100 font-black text-xs uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
                                    <Camera size={18} /> Foto / PDF
                                </button>
                                <button type="button" className="flex-1 py-3 rounded-xl border-2 border-slate-100 font-black text-xs uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
                                    <MapPin size={18} /> GPS
                                </button>
                            </div>

                            <button type="submit" className="w-full bg-emerald-600 text-white py-4 rounded-xl font-black text-sm uppercase tracking-widest shadow-xl shadow-emerald-200 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 mt-2">
                                <Save size={20} /> Zapisz Zabieg
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OperationsLog;

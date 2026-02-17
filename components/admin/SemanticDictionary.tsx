import React, { useState, useEffect } from 'react';
import { Book, Search, Plus, Save, Trash2, Tag, ArrowRight, Database, Edit2, Check, X } from 'lucide-react';

interface SemanticTerm {
    id: string;
    sourceTerm: string;
    systemTerm: string;
    optimizerTerm: string;
    category: 'CROP' | 'SCHEME' | 'PARAM' | 'OTHER';
    description?: string;
}

const SemanticDictionary: React.FC = () => {
    const [terms, setTerms] = useState<SemanticTerm[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isEditing, setIsEditing] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<SemanticTerm>>({});

    // Load from localStorage on mount (mock isolated DB)
    useEffect(() => {
        const stored = localStorage.getItem('ao_semantic_dict');
        if (stored) {
            setTerms(JSON.parse(stored));
        } else {
            // Seed initial data
            const initial: SemanticTerm[] = [
                { id: '1', sourceTerm: 'Pszenica ozima', systemTerm: 'wheat_winter', optimizerTerm: 'CEREAL_WINTER', category: 'CROP', description: 'Standardowa pszenica ozima' },
                { id: '2', sourceTerm: 'Ekoschemat Rolnictwo Węglowe', systemTerm: 'eco_carbon', optimizerTerm: 'SCHEME_CARBON', category: 'SCHEME', description: 'Pakiet główny' },
            ];
            setTerms(initial);
            localStorage.setItem('ao_semantic_dict', JSON.stringify(initial));
        }
    }, []);

    const saveTerms = (newTerms: SemanticTerm[]) => {
        setTerms(newTerms);
        localStorage.setItem('ao_semantic_dict', JSON.stringify(newTerms));
    };

    const handleAdd = () => {
        const newTerm: SemanticTerm = {
            id: Math.random().toString(36).substr(2, 9),
            sourceTerm: 'Nowe Pojęcie',
            systemTerm: 'new_term',
            optimizerTerm: 'NEW_TERM',
            category: 'OTHER',
            description: ''
        };
        saveTerms([newTerm, ...terms]);
        startEdit(newTerm);
    };

    const handleDelete = (id: string) => {
        if (window.confirm('Czy na pewno usunąć to pojęcie?')) {
            saveTerms(terms.filter(t => t.id !== id));
        }
    };

    const startEdit = (term: SemanticTerm) => {
        setIsEditing(term.id);
        setEditForm({ ...term });
    };

    const cancelEdit = () => {
        setIsEditing(null);
        setEditForm({});
    };

    const saveEdit = () => {
        if (!isEditing) return;
        const updated = terms.map(t => t.id === isEditing ? { ...t, ...editForm } as SemanticTerm : t);
        saveTerms(updated);
        setIsEditing(null);
        setEditForm({});
    };

    const filteredTerms = terms.filter(t =>
        t.sourceTerm.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.systemTerm.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.optimizerTerm.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div>
                    <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                        <Book className="text-emerald-600" /> Słownik Pojęć Semantycznych
                    </h2>
                    <p className="text-slate-500 text-xs mt-1">Centralna przestrzeń nazw (Namespace) mapująca pojęcia między źródłami, systemem a optymalizatorem.</p>
                </div>
                <button
                    onClick={handleAdd}
                    className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200"
                >
                    <Plus size={18} /> Dodaj Pojęcie
                </button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Szukaj pojęcia..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-bold">
                                <th className="p-4 border-b">Źródło (Ustawodawca)</th>
                                <th className="p-4 border-b"><div className="flex items-center gap-1"><ArrowRight size={12} /> System Core</div></th>
                                <th className="p-4 border-b"><div className="flex items-center gap-1"><ArrowRight size={12} /> Optymalizator AI</div></th>
                                <th className="p-4 border-b">Kategoria</th>
                                <th className="p-4 border-b text-right">Akcje</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredTerms.map(term => (
                                <tr key={term.id} className="hover:bg-slate-50/50 transition-colors group">
                                    {isEditing === term.id ? (
                                        <>
                                            <td className="p-3">
                                                <input className="w-full p-2 border rounded-lg font-semibold text-slate-800" value={editForm.sourceTerm} onChange={(e) => setEditForm({ ...editForm, sourceTerm: e.target.value })} />
                                                <input className="w-full p-2 border rounded-lg text-xs mt-1" placeholder="Opis..." value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
                                            </td>
                                            <td className="p-3"><input className="w-full p-2 border rounded-lg font-mono text-xs text-blue-600" value={editForm.systemTerm} onChange={(e) => setEditForm({ ...editForm, systemTerm: e.target.value })} /></td>
                                            <td className="p-3"><input className="w-full p-2 border rounded-lg font-mono text-xs text-purple-600" value={editForm.optimizerTerm} onChange={(e) => setEditForm({ ...editForm, optimizerTerm: e.target.value })} /></td>
                                            <td className="p-3">
                                                <select className="p-2 border rounded-lg text-xs font-bold" value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value as any })}>
                                                    <option value="CROP">UPRAWA</option>
                                                    <option value="SCHEME">EKOSCHEMAT</option>
                                                    <option value="PARAM">PARAMETR</option>
                                                    <option value="OTHER">INNE</option>
                                                </select>
                                            </td>
                                            <td className="p-3 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={saveEdit} className="p-2 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200"><Check size={16} /></button>
                                                    <button onClick={cancelEdit} className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200"><X size={16} /></button>
                                                </div>
                                            </td>
                                        </>
                                    ) : (
                                        <>
                                            <td className="p-4">
                                                <div className="font-bold text-slate-800">{term.sourceTerm}</div>
                                                {term.description && <div className="text-xs text-slate-400 mt-0.5">{term.description}</div>}
                                            </td>
                                            <td className="p-4"><code className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-mono">{term.systemTerm}</code></td>
                                            <td className="p-4"><code className="bg-purple-50 text-purple-700 px-2 py-1 rounded text-xs font-mono">{term.optimizerTerm}</code></td>
                                            <td className="p-4">
                                                <span className={`text-[10px] font-black px-2 py-1 rounded uppercase tracking-wider ${term.category === 'CROP' ? 'bg-green-100 text-green-700' :
                                                        term.category === 'SCHEME' ? 'bg-amber-100 text-amber-700' :
                                                            'bg-slate-100 text-slate-600'
                                                    }`}>
                                                    {term.category}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => startEdit(term)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-blue-600 transition-colors"><Edit2 size={16} /></button>
                                                    <button onClick={() => handleDelete(term.id)} className="p-2 hover:bg-red-50 rounded-lg text-slate-500 hover:text-red-600 transition-colors"><Trash2 size={16} /></button>
                                                </div>
                                            </td>
                                        </>
                                    )}
                                </tr>
                            ))}
                            {filteredTerms.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-slate-400">
                                        <Database size={32} className="mx-auto mb-2 opacity-20" />
                                        <p>Brak pojęć spełniających kryteria.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default SemanticDictionary;

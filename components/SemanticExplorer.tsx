
import React, { useState, useMemo } from 'react';
import { Database, Search, Filter, FileText, ChevronRight, Hash, Info, Layers, Tag, ExternalLink, Sparkles, BrainCircuit } from 'lucide-react';
import { ragEngine } from '../services/ragEngine';
import { KnowledgeChunk } from '../types';

const SemanticExplorer: React.FC = () => {
    const allChunks = ragEngine.getAllChunks();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDocId, setSelectedDocId] = useState<string>('ALL');

    const documents = useMemo(() => {
        const uniqueDocs = new Map<string, string>();
        allChunks.forEach(c => uniqueDocs.set(c.documentId, c.documentName));
        return Array.from(uniqueDocs.entries());
    }, [allChunks]);

    const filteredChunks = allChunks.filter(c => {
        const matchesSearch = c.content.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             c.documentName.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesDoc = selectedDocId === 'ALL' || c.documentId === selectedDocId;
        return matchesSearch && matchesDoc;
    });

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                            <BrainCircuit className="text-emerald-600" size={28} />
                            Eksplorator Bazy Wektorowej
                        </h2>
                        <p className="text-slate-500 text-sm font-medium">Podgląd zindeksowanych fragmentów wiedzy z wygenerowanymi embeddingami.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl border border-emerald-100 flex items-center gap-2">
                            <Layers size={18} />
                            <span className="text-sm font-black">{allChunks.length} wektorów</span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-4 mb-8">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-3 text-slate-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Wyszukiwanie semantyczne..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-slate-700 shadow-inner"
                        />
                    </div>
                    <div className="w-full md:w-64 relative">
                        <Filter className="absolute left-3 top-3 text-slate-400" size={18} />
                        <select 
                            value={selectedDocId}
                            onChange={(e) => setSelectedDocId(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-slate-700 appearance-none"
                        >
                            <option value="ALL">Wszystkie źródła</option>
                            {documents.map(([id, name]) => (
                                <option key={id} value={id}>{name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[600px] overflow-y-auto pr-2 custom-scrollbar p-1">
                    {filteredChunks.length > 0 ? (
                        filteredChunks.map((chunk) => (
                            <div key={chunk.id} className="bg-white rounded-2xl border border-slate-200 p-5 hover:border-emerald-300 hover:shadow-lg transition-all group flex flex-col relative overflow-hidden">
                                {chunk.embedding && (
                                    <div className="absolute top-0 right-0 p-1 bg-emerald-500 text-white rounded-bl-xl shadow-sm" title="Zindeksowano wektorowo">
                                        <Sparkles size={10} />
                                    </div>
                                )}
                                
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 bg-slate-50 rounded-lg border border-slate-200 text-slate-600"><FileText size={14} /></div>
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate max-w-[200px]">{chunk.documentName}</span>
                                    </div>
                                </div>
                                
                                <div className="flex-1 text-xs text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100 mb-4 font-medium italic">
                                    "{chunk.content}"
                                </div>

                                <div className="flex flex-wrap gap-2 mt-auto">
                                    <div className="flex items-center gap-1 text-[9px] font-black text-slate-400 bg-white border border-slate-200 px-2 py-1 rounded-lg shadow-sm">
                                        <Tag size={10} className="text-blue-500" />
                                        {chunk.metadata.section}
                                    </div>
                                    <div className="flex items-center gap-1 text-[9px] font-black text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-lg shadow-sm">
                                        <BrainCircuit size={10} />
                                        Vector size: {chunk.embedding?.length || 0}
                                    </div>
                                    <div className="flex items-center gap-1 text-[9px] font-black text-slate-400 bg-white border border-slate-200 px-2 py-1 rounded-lg shadow-sm">
                                        <Hash size={10} className="text-purple-500" />
                                        {chunk.tokens} tokens
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="col-span-2 h-full flex flex-col items-center justify-center text-slate-300 p-12 border-2 border-dashed border-slate-100 rounded-3xl">
                            <Search size={64} className="mb-4 opacity-10" />
                            <p className="text-lg font-black uppercase tracking-widest">Brak wyników w bazie wektorowej</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SemanticExplorer;

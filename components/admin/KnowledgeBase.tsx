
import React, { useState, useRef, useEffect } from 'react';
import { BookOpen, UploadCloud, FileText, Trash2, Search, Loader2, CheckCircle, AlertTriangle, RefreshCw, Zap } from 'lucide-react';
import { ragEngine } from '../../services/ragEngine';

interface KnowledgeDoc {
    id: string;
    name: string;
    type: string;
    size: string;
    uploadDate: string;
    status: 'INDEXED' | 'PROCESSING' | 'ERROR';
    chunkCount: number;
}

const KnowledgeBase: React.FC = () => {
    const [docs, setDocs] = useState<KnowledgeDoc[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Load from localStorage (mock DB for KB metadata)
    useEffect(() => {
        const stored = localStorage.getItem('ao_knowledge_base');
        if (stored) {
            setDocs(JSON.parse(stored));
        }
    }, []);

    const saveDocs = (newDocs: KnowledgeDoc[]) => {
        setDocs(newDocs);
        localStorage.setItem('ao_knowledge_base', JSON.stringify(newDocs));
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            // 1. Create Doc Metadata
            const newDoc: KnowledgeDoc = {
                id: Math.random().toString(36).substr(2, 9),
                name: file.name,
                type: file.name.split('.').pop()?.toUpperCase() || 'TXT',
                size: `${(file.size / 1024).toFixed(2)} KB`,
                uploadDate: new Date().toISOString(),
                status: 'PROCESSING',
                chunkCount: 0
            };

            const updatedDocs = [newDoc, ...docs];
            saveDocs(updatedDocs);

            // 2. Read File content (Mock extract text)
            // In real app, we would use pdfjs or specific text extractors
            const text = await readFileAsText(file);

            // 3. Index via RAG Engine
            // Using a "SYSTEM_CORE" pseudo-document-type for base knowledge
            await ragEngine.indexDocument({
                id: newDoc.id,
                name: newDoc.name,
                type: 'OTHER', // using compatible type from FarmerDocument
                category: 'INNE',
                campaignYear: '2026',
                uploadDate: newDoc.uploadDate,
                size: newDoc.size,
                extractedText: text
            }, text);

            // 4. Update Status
            newDoc.status = 'INDEXED';
            newDoc.chunkCount = Math.ceil(text.length / 500); // Rough estimate
            saveDocs(updatedDocs.map(d => d.id === newDoc.id ? newDoc : d));

        } catch (error) {
            console.error("Upload failed", error);
            const failedDoc = docs.find(d => d.id === docs[0].id); // assuming it was prepended
            if (failedDoc) {
                failedDoc.status = 'ERROR';
                saveDocs([...docs]);
            }
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const readFileAsText = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.onerror = reject;
            reader.readAsText(file);
        });
    };

    const handleDelete = (id: string) => {
        if (window.confirm('Usunąć ten dokument z Bazy Wiedzy?')) {
            saveDocs(docs.filter(d => d.id !== id));
            // Note: In real RAG, we would also need to delete chunks from vector store
        }
    };

    const handleReindex = async (doc: KnowledgeDoc) => {
        // Placeholder for re-indexing logic
        alert(`Rozpoczęto ponowne indeksowanie: ${doc.name}`);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div>
                    <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                        <BookOpen className="text-blue-600" /> Baza Wiedzy (Legislacja)
                    </h2>
                    <p className="text-slate-500 text-xs mt-1">Zarządzanie dokumentacją ustawodawczą i indeksowanie semantyczne dla silnika reguł.</p>
                </div>
                <div>
                    <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} accept=".txt,.md,.pdf,.csv" />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 disabled:opacity-50"
                    >
                        {isUploading ? <Loader2 size={18} className="animate-spin" /> : <UploadCloud size={18} />}
                        {isUploading ? 'Przetwarzanie...' : 'Wgraj Dokument'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* STATUS CARD */}
                <div className="bg-slate-900 text-white p-6 rounded-2xl flex flex-col justify-between shadow-xl">
                    <div>
                        <div className="bg-white/10 w-10 h-10 rounded-lg flex items-center justify-center mb-4">
                            <Zap className="text-yellow-400" />
                        </div>
                        <h3 className="font-bold text-lg mb-1">Stan Indeksu RAG</h3>
                        <p className="text-slate-400 text-xs">Aktywne wektory wiedzy</p>
                    </div>
                    <div className="mt-8">
                        <div className="text-3xl font-black">{docs.reduce((acc, d) => acc + (d.status === 'INDEXED' ? d.chunkCount : 0), 0)}</div>
                        <div className="text-slate-400 text-xs mt-1">Fragmentów Wiedzy (Chunks)</div>
                    </div>
                </div>

                {/* DOCS LIST */}
                <div className="md:col-span-2 space-y-3">
                    {docs.length === 0 ? (
                        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center text-slate-400 flex flex-col items-center">
                            <UploadCloud size={48} className="mb-4 opacity-20" />
                            <p className="font-bold">Baza wiedzy jest pusta</p>
                            <p className="text-xs mt-2">Wgraj dokumenty ustawodawcze (TXT, MD), aby zasilić silnik AI.</p>
                        </div>
                    ) : (
                        docs.map(doc => (
                            <div key={doc.id} className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between group hover:shadow-md transition-all">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                                        <FileText size={20} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-800 text-sm">{doc.name}</h4>
                                        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium uppercase tracking-wide">
                                            <span>{doc.type}</span>
                                            <span>•</span>
                                            <span>{doc.size}</span>
                                            <span>•</span>
                                            <span>{new Date(doc.uploadDate).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${doc.status === 'INDEXED' ? 'bg-emerald-50 text-emerald-600' :
                                            doc.status === 'PROCESSING' ? 'bg-blue-50 text-blue-600' :
                                                'bg-red-50 text-red-600'
                                        }`}>
                                        {doc.status === 'INDEXED' && <CheckCircle size={12} />}
                                        {doc.status === 'PROCESSING' && <Loader2 size={12} className="animate-spin" />}
                                        {doc.status === 'ERROR' && <AlertTriangle size={12} />}
                                        {doc.status === 'INDEXED' ? 'Zindeksowano' : (doc.status === 'PROCESSING' ? 'Przetwarzanie' : 'Błąd')}
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => handleReindex(doc)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Przeindeksuj"><RefreshCw size={16} /></button>
                                        <button onClick={() => handleDelete(doc.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Usuń"><Trash2 size={16} /></button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default KnowledgeBase;
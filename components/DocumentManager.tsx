
import React, { useRef, useState } from 'react';
import { FileText, Map, FileSpreadsheet, File, UploadCloud, Trash2, Download, Archive, Loader2, Sparkles, AlertCircle, Database } from 'lucide-react';
import { FarmerDocument } from '../types';
import { extractRawText } from '../services/geminiService';
import { ragEngine } from '../services/ragEngine';

interface DocumentManagerProps {
  documents: FarmerDocument[];
  onAddDocument: (doc: FarmerDocument) => void;
  onRemoveDocument: (id: string) => void;
}

const DocumentManager: React.FC<DocumentManagerProps> = ({ documents, onAddDocument, onRemoveDocument }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setIsAnalyzing(true);

      try {
        const base64 = await fileToBase64(file);
        
        // Szybki OCR dla bazy wiedzy RAG bez analizy AI klasyfikacyjnej
        const extractedText = await extractRawText(base64, file.type);

        const newDoc: FarmerDocument = {
          id: Math.random().toString(36).substr(2, 9),
          name: file.name,
          type: file.name.split('.').pop()?.toUpperCase() as any || 'OTHER',
          category: 'INNE',
          campaignYear: '2024', // Default dla tego wczytywania, użytkownik może zmienić
          size: `${(file.size / 1024).toFixed(2)} KB`,
          uploadDate: new Date().toISOString().split('T')[0],
          extractedText: extractedText
        };

        // Indeksowanie w bazie RAG
        if (extractedText) {
            await ragEngine.indexDocument(newDoc, extractedText);
        }
        
        onAddDocument(newDoc);
      } catch (error) {
        console.error("Error processing document:", error);
        alert("Wystąpił błąd podczas odczytu pliku.");
      } finally {
        setIsAnalyzing(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    }
  };

  const getIcon = (type: string) => {
    switch(type) {
      case 'PDF': return <FileText className="text-red-500" size={24} />;
      case 'CSV': return <FileSpreadsheet className="text-green-500" size={24} />;
      case 'GML': 
      case 'SHP': return <Map className="text-blue-500" size={24} />;
      default: return <File className="text-slate-400" size={24} />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Dokumentacja Klienta</h2>
          <p className="text-slate-500">Baza wiedzy zindeksowana semantycznie.</p>
        </div>
        <div className="flex gap-3">
             <div className="bg-emerald-50 border border-emerald-100 px-4 py-2 rounded-xl flex items-center gap-2 text-emerald-700">
                 <Database size={18} />
                 <div className="text-left">
                     <p className="text-[10px] font-black uppercase leading-none mb-0.5">Zasób RAG</p>
                     <p className="text-xs font-bold leading-none">{ragEngine.getAllChunks().length} fragmentów</p>
                 </div>
             </div>
             <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden" 
                accept=".pdf,.csv,.gml,.xml,.shp,.zip"
                disabled={isAnalyzing}
             />
             <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isAnalyzing}
                className={`px-4 py-2 rounded-lg flex items-center space-x-2 transition-all shadow-sm font-bold ${
                  isAnalyzing 
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95'
                }`}
             >
                {isAnalyzing ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    <span>Wczytywanie...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud size={20} />
                    <span>Dodaj PDF</span>
                  </>
                )}
            </button>
        </div>
      </div>

      {isAnalyzing && (
        <div className="bg-emerald-900 text-white rounded-2xl p-8 flex flex-col items-center justify-center animate-pulse shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-400/20 rounded-full blur-3xl"></div>
            <Sparkles className="text-emerald-400 mb-4 animate-bounce" size={48} />
            <h3 className="text-xl font-black mb-2">Wczytywanie dokumentu do RAG</h3>
            <p className="text-emerald-100 text-center max-w-md">Wyodrębniamy tekst i generujemy embeddingi wektorowe dla wybranego rolnika.</p>
        </div>
      )}

      {documents.length === 0 && !isAnalyzing ? (
        <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl p-12 text-center">
            <div className="flex justify-center mb-4">
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100">
                    <Database className="text-slate-300" size={32} />
                </div>
            </div>
            <h3 className="text-lg font-bold text-slate-700">Pusta baza semantyczna</h3>
            <p className="text-slate-500 mb-6 max-w-sm mx-auto">Wgraj dokumenty (PDF), aby AI mogło się na nich uczyć i odpowiadać na pytania.</p>
            <button 
                onClick={() => fileInputRef.current?.click()}
                className="bg-slate-900 text-white px-6 py-3 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-black transition-all"
            >
                Wybierz plik PDF
            </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase text-slate-500 font-black tracking-widest">
                    <tr>
                        <th className="p-4">Nazwa Pliku</th>
                        <th className="p-4">Zasób AI</th>
                        <th className="p-4 text-center">Fragmenty</th>
                        <th className="p-4">Kampania</th>
                        <th className="p-4 text-right">Akcje</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {documents.map((doc) => {
                        const chunkCount = ragEngine.getAllChunks().filter(c => c.documentId === doc.id).length;
                        return (
                            <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                                <td className="p-4">
                                    <div className="flex items-center space-x-3">
                                        <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                                            {getIcon(doc.type)}
                                        </div>
                                        <div>
                                            <span className="font-bold text-slate-900 block">{doc.name}</span>
                                            <span className="text-[10px] text-slate-400 font-bold uppercase">{doc.size}</span>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-4">
                                    {chunkCount > 0 ? (
                                        <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase px-2.5 py-1 rounded-full border border-emerald-200">
                                            <Sparkles size={10} /> Zindeksowano
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-400 text-[10px] font-black uppercase px-2.5 py-1 rounded-full border border-slate-200">
                                            <Database size={10} /> Brak Tekstu
                                        </span>
                                    )}
                                </td>
                                <td className="p-4 text-center">
                                    <span className="text-sm font-mono font-black text-slate-600">{chunkCount}</span>
                                </td>
                                <td className="p-4">
                                    <span className="text-xs font-bold text-slate-500">{doc.campaignYear}</span>
                                </td>
                                <td className="p-4 text-right">
                                    <div className="flex justify-end space-x-2">
                                        <button className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">
                                            <Download size={18} />
                                        </button>
                                        <button 
                                            onClick={() => onRemoveDocument(doc.id)}
                                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
      )}
    </div>
  );
};

export default DocumentManager;

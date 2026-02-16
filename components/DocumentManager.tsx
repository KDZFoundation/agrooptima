
import React, { useRef, useState } from 'react';
import { FileText, Map, FileSpreadsheet, File, UploadCloud, Trash2, Download, Archive, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { FarmerDocument } from '../types';
import { analyzeDocument } from '../services/geminiService';

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
        // AI Analysis
        const analysis = await analyzeDocument(base64, file.type);

        const newDoc: FarmerDocument = {
          id: Math.random().toString(36).substr(2, 9),
          name: file.name,
          type: file.name.split('.').pop()?.toUpperCase() as any || 'OTHER',
          category: analysis.category,
          campaignYear: analysis.campaignYear || '2026',
          size: `${(file.size / 1024).toFixed(2)} KB`,
          uploadDate: new Date().toISOString().split('T')[0]
        };

        // If AI found a producerId that doesn't match, maybe we should warn, 
        // but for now we just populate metadata.
        
        onAddDocument(newDoc);
      } catch (error) {
        console.error("Error processing document:", error);
        alert("Wystąpił błąd podczas analizy dokumentu. Spróbuj ponownie.");
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
          <p className="text-slate-500">Zarządzaj plikami z wykorzystaniem inteligentnej analizy AI.</p>
        </div>
        <div>
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
                    <span>Analiza AI...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud size={20} />
                    <span>Dodaj Dokument</span>
                  </>
                )}
            </button>
        </div>
      </div>

      {isAnalyzing && (
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-6 flex flex-col items-center justify-center animate-pulse">
            <Sparkles className="text-emerald-600 mb-2 animate-bounce" size={32} />
            <h3 className="font-bold text-emerald-800">Przetwarzanie dokumentu przez AI</h3>
            <p className="text-sm text-emerald-600">Wyodrębniamy numer producenta, rok kampanii oraz kategorię...</p>
        </div>
      )}

      {documents.length === 0 && !isAnalyzing ? (
        <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl p-12 text-center">
            <div className="flex justify-center mb-4">
                <UploadCloud className="text-slate-300" size={64} />
            </div>
            <h3 className="text-lg font-medium text-slate-700">Brak dokumentów w bazie</h3>
            <p className="text-slate-500 mb-6">Wgraj wniosek (PDF) lub mapy (GML/SHP) aby automatycznie zasilić system danymi.</p>
            <button 
                onClick={() => fileInputRef.current?.click()}
                className="text-emerald-600 font-semibold hover:underline"
            >
                Wybierz plik z dysku
            </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500">
                    <tr>
                        <th className="p-4 font-semibold">Nazwa Pliku</th>
                        <th className="p-4 font-semibold">Kategoria</th>
                        <th className="p-4 font-semibold">Kampania</th>
                        <th className="p-4 font-semibold">Data</th>
                        <th className="p-4 font-semibold text-right">Akcje</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {documents.map((doc) => (
                        <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-4">
                                <div className="flex items-center space-x-3">
                                    <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                                        {getIcon(doc.type)}
                                    </div>
                                    <div>
                                        <span className="font-medium text-slate-900 block">{doc.name}</span>
                                        <span className="text-xs text-slate-400">{doc.size}</span>
                                    </div>
                                </div>
                            </td>
                            <td className="p-4">
                                <span className={`text-[10px] font-black px-2 py-1 rounded border flex items-center gap-1 w-fit ${
                                    doc.category === 'WNIOSEK' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                    doc.category === 'MAPA' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                    'bg-slate-100 text-slate-600 border-slate-200'
                                }`}>
                                    <Sparkles size={10} className="text-emerald-500" />
                                    {doc.category}
                                </span>
                            </td>
                            <td className="p-4">
                                <span className="flex items-center gap-1 text-slate-700 font-medium text-sm">
                                    <Archive size={14} className="text-slate-400"/>
                                    {doc.campaignYear}
                                </span>
                            </td>
                            <td className="p-4 text-slate-600 text-sm">{doc.uploadDate}</td>
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
                    ))}
                </tbody>
            </table>
        </div>
      )}
    </div>
  );
};

export default DocumentManager;


import React, { useRef, useState } from 'react';
import { FileText, Map, FileSpreadsheet, File, UploadCloud, Trash2, Download, Archive, Loader2, Sparkles, Database } from 'lucide-react';
import { FarmerDocument } from '../types';
import { extractRawText } from '../services/geminiService';

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
        const extractedText = await extractRawText(base64, file.type);

        const newDoc: FarmerDocument = {
          id: Math.random().toString(36).substr(2, 9),
          name: file.name,
          type: file.name.split('.').pop()?.toUpperCase() as any || 'OTHER',
          category: 'INNE',
          campaignYear: '2024',
          size: `${(file.size / 1024).toFixed(2)} KB`,
          uploadDate: new Date().toISOString().split('T')[0],
          extractedText: extractedText
        };
        
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
      <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Dokumentacja Klienta</h2>
          <p className="text-slate-500 font-medium">Baza wgranych plików i e-wniosków.</p>
        </div>
        <div className="flex gap-3">
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
                className={`px-6 py-3 rounded-2xl flex items-center space-x-2 transition-all shadow-lg font-black uppercase text-xs tracking-widest ${
                  isAnalyzing 
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95 shadow-emerald-200'
                }`}
             >
                {isAnalyzing ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Przetwarzanie...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud size={18} />
                    <span>Dodaj Dokument</span>
                  </>
                )}
            </button>
        </div>
      </div>

      {documents.length === 0 && !isAnalyzing ? (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-16 text-center shadow-sm">
            <div className="flex justify-center mb-6">
                <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center border border-slate-100 shadow-inner">
                    <Database className="text-slate-300" size={40} />
                </div>
            </div>
            <h3 className="text-xl font-black text-slate-700">Brak wgranych plików</h3>
            <p className="text-slate-400 mb-8 max-w-sm mx-auto font-medium">Wgraj dokumenty (PDF, CSV), aby ułatwić zarządzanie gospodarstwem.</p>
            <button 
                onClick={() => fileInputRef.current?.click()}
                className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-black transition-all shadow-xl active:scale-95"
            >
                Wybierz plik z dysku
            </button>
        </div>
      ) : (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase text-slate-400 font-black tracking-[0.1em]">
                    <tr>
                        <th className="p-5">Nazwa Pliku</th>
                        <th className="p-5">Rozmiar</th>
                        <th className="p-5">Kampania</th>
                        <th className="p-5 text-right">Akcje</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {documents.map((doc) => (
                        <tr key={doc.id} className="hover:bg-slate-50/50 transition-colors group">
                            <td className="p-5">
                                <div className="flex items-center space-x-4">
                                    <div className="p-3 bg-white rounded-2xl border border-slate-100 shadow-sm">
                                        {getIcon(doc.type)}
                                    </div>
                                    <div>
                                        <span className="font-black text-slate-800 block text-sm">{doc.name}</span>
                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{doc.uploadDate}</span>
                                    </div>
                                </div>
                            </td>
                            <td className="p-5">
                                <span className="text-xs font-black text-slate-500 uppercase">{doc.size}</span>
                            </td>
                            <td className="p-5">
                                <span className="inline-flex px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-black uppercase border border-slate-200">{doc.campaignYear}</span>
                            </td>
                            <td className="p-5 text-right">
                                <div className="flex justify-end space-x-2">
                                    <button className="p-2.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all">
                                        <Download size={20} />
                                    </button>
                                    <button 
                                        onClick={() => onRemoveDocument(doc.id)}
                                        className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                    >
                                        <Trash2 size={20} />
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

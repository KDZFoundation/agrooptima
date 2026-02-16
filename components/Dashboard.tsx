
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ArrowUpRight, Calendar, FileText, Sun, Map, ChevronRight, Layers, Sprout, PieChart, Download, AlertTriangle, CheckCircle, Leaf, AlertOctagon, X, Wallet, Info, UploadCloud, Loader2, Database, AlertCircle, Banknote, TrendingUp } from 'lucide-react';
import { FarmData, FarmerDocument, Field, EcoSchemeCalculation, SubsidyRate } from '../types';
import { analyzeFarmState } from '../services/farmLogic';
import { api } from '../services/api';
import { extractRawText } from '../services/geminiService';
import { ragEngine } from '../services/ragEngine';
import { SUBSIDY_RATES_2026, SUBSIDY_RATES_2025, SUBSIDY_RATES_2024 } from '../constants';

interface DashboardProps {
  farmData: FarmData;
  recentDocuments: FarmerDocument[];
  onViewAllDocuments: () => void;
  onManageFields: (tab?: 'PARCELS' | 'CROPS') => void;
  selectedYear: number;
  setSelectedYear: (year: number) => void;
  onAddDocument: (doc: FarmerDocument) => Promise<void>;
}

const Dashboard: React.FC<DashboardProps> = ({ farmData, recentDocuments = [], onViewAllDocuments, onManageFields, selectedYear, setSelectedYear, onAddDocument }) => {
  const [showSubsidyDetails, setShowSubsidyDetails] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [allRates, setAllRates] = useState<SubsidyRate[]>([]);
  const [isLoadingRates, setIsLoadingRates] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const availableYears = [2026, 2025, 2024, 2023, 2022, 2021];

  useEffect(() => {
    const fetchRates = async () => {
        setIsLoadingRates(true);
        try {
            const rates = await api.getRates();
            if (rates && rates.length > 0) {
                setAllRates(rates);
            } else {
                setAllRates([...SUBSIDY_RATES_2026, ...SUBSIDY_RATES_2025, ...SUBSIDY_RATES_2024]);
            }
        } catch (e) {
            setAllRates([...SUBSIDY_RATES_2026, ...SUBSIDY_RATES_2025, ...SUBSIDY_RATES_2024]);
        } finally {
            setIsLoadingRates(false);
        }
    };
    fetchRates();
  }, [selectedYear]);

  const { 
    totalArea, 
    cropSummary, 
    applicationDoc, 
    analysisReport, 
    basicPaymentsBreakdown, 
    totalBasicSubsidy,
    grandTotalSubsidy,
    registryParcels,
    avgSubsidyPerHa
  } = useMemo(() => {
    const summary: Record<string, number> = {};
    let areaSum = 0;
    const validRegistry: Field[] = [];

    farmData.fields.forEach(field => {
        const histForSelected = field.history?.find(h => h.year === selectedYear);
        if (!histForSelected) return;

        const currentPeg = Number(histForSelected.eligibleArea) || 0;
        areaSum += currentPeg;

        if (currentPeg > 0) {
            validRegistry.push(field);
        }
        
        if (histForSelected.cropParts && histForSelected.cropParts.length > 0) {
            histForSelected.cropParts.forEach(part => {
                const cropName = part.crop || 'Nieznana';
                if (cropName !== 'Nieznana' && cropName !== 'Brak danych') {
                    if (!summary[cropName]) summary[cropName] = 0;
                    summary[cropName] += Number(part.area) || 0;
                }
            });
        } else {
            const cropName = histForSelected.crop || 'Nieznana';
            if (cropName !== 'Nieznana' && cropName !== 'Brak danych') {
                if (!summary[cropName]) summary[cropName] = 0;
                summary[cropName] += Number(histForSelected.area) || Number(field.area) || 0;
            }
        }
    });

    const report = analyzeFarmState({ ...farmData, profile: { ...farmData.profile, totalAreaUR: areaSum } }, selectedYear);
    const appDoc = recentDocuments?.find(d => (d.category === 'WNIOSEK' || d.name.toLowerCase().includes('wniosek')) && d.campaignYear === selectedYear.toString());
    const yearRates = allRates.filter(r => r.year === selectedYear);
    
    const bwsRateObj = yearRates.find(r => r.category === 'DOPLATA' && r.name.toLowerCase().includes('podstawowe')) || { rate: 483.20, unit: 'PLN/ha' };
    const redRateObj = yearRates.find(r => r.category === 'DOPLATA' && r.name.toLowerCase().includes('redystrybucyjna')) || { rate: 168.79, unit: 'PLN/ha' };
    const uppRateObj = yearRates.find(r => r.category === 'DOPLATA' && r.name.toLowerCase().includes('uzupełniająca')) || { rate: 63.22, unit: 'PLN/ha' };

    const bwsTotal = areaSum * bwsRateObj.rate;
    const redArea = Math.min(areaSum, 30);
    const redTotal = redArea * redRateObj.rate;
    const uppTotal = areaSum * uppRateObj.rate;

    const basicBreakdown = [
        { name: 'Podstawowe wsparcie dochodów', rate: bwsRateObj.rate, unit: bwsRateObj.unit, amount: areaSum, total: bwsTotal },
        { name: 'Płatność redystrybucyjna', rate: redRateObj.rate, unit: redRateObj.unit, amount: redArea, total: redTotal },
        { name: 'Uzupełniająca płatność podstawowa', rate: uppRateObj.rate, unit: uppRateObj.unit, amount: areaSum, total: uppTotal }
    ];

    const basicSum = basicBreakdown.reduce((sum, item) => sum + (item.total || 0), 0);
    const grandTotal = basicSum + (Number(report.totalEstimatedValue) || 0);
    const avgPerHa = areaSum > 0 ? grandTotal / areaSum : 0;

    return { 
        totalArea: areaSum, 
        cropSummary: summary,
        applicationDoc: appDoc,
        analysisReport: report,
        basicPaymentsBreakdown: basicBreakdown,
        totalBasicSubsidy: basicSum,
        grandTotalSubsidy: grandTotal,
        registryParcels: validRegistry.sort((a,b) => (a.registrationNumber || '').localeCompare(b.registrationNumber || '')),
        avgSubsidyPerHa: avgPerHa
    };
  }, [farmData, selectedYear, recentDocuments, allRates]);

  const sortedCrops = (Object.entries(cropSummary) as [string, number][]).sort((a, b) => b[1] - a[1]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setIsUploading(true);
      try {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
            const base64 = (reader.result as string).split(',')[1];
            const extractedText = await extractRawText(base64, file.type);
            const newDoc: FarmerDocument = {
                id: `doc_${Date.now()}`,
                name: file.name,
                type: 'PDF',
                category: 'WNIOSEK',
                campaignYear: selectedYear.toString(), 
                size: `${(file.size / 1024).toFixed(1)} KB`,
                uploadDate: new Date().toISOString().split('T')[0],
                extractedText: extractedText
            };
            if (extractedText) await ragEngine.indexDocument(newDoc, extractedText);
            await onAddDocument(newDoc);
            setIsUploading(false);
        };
      } catch (error) {
        setIsUploading(false);
        setUploadError("Błąd analizy pliku.");
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
           <div className="flex items-center gap-3 mb-1">
             <h2 className="text-2xl font-black text-slate-800 tracking-tight">Panel Główny</h2>
             <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-200 flex items-center gap-1">
               <Database size={12} />
               EP: {farmData.profile.producerId || '050237165'}
             </span>
           </div>
           <p className="text-slate-500 font-medium">Rolnik: <span className="text-emerald-600 font-bold">{farmData.farmName || 'Gospodarstwo'}</span></p>
        </div>
        
        <div className="flex items-center gap-4">
            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl shadow-inner px-4 py-2">
                <Calendar size={18} className="text-slate-400 mr-2" />
                <span className="text-xs font-black text-slate-400 mr-3 uppercase tracking-tighter">Kampania:</span>
                <select 
                    value={selectedYear} 
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="bg-transparent font-black text-slate-800 focus:outline-none cursor-pointer text-sm"
                >
                    {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Powierzchnia UR" 
          value={`${totalArea.toFixed(2)} ha`} 
          subtext={`Suma PEG (${selectedYear})`}
          icon={Map}
          color="blue"
        />
        <StatCard 
          title="Szacowane Dopłaty" 
          value={isLoadingRates ? "..." : `${(Number(grandTotalSubsidy) || 0).toLocaleString('pl-PL', { maximumFractionDigits: 0 })} PLN`} 
          subtext={`Średnio ${avgSubsidyPerHa.toLocaleString('pl-PL', { maximumFractionDigits: 2 })} PLN/ha`}
          icon={Banknote}
          color="emerald"
          highlightValue={true}
          onClick={() => setShowSubsidyDetails(true)}
          isInteractive
          badge={`${avgSubsidyPerHa.toFixed(0)} PLN/ha`}
        />
        <StatCard 
          title="Status RW" 
          value={`${(Number(analysisReport.totalPoints) || 0).toFixed(1)} pkt`} 
          subtext={analysisReport.isEntryConditionMet ? "Warunek spełniony" : "Poniżej progu"}
          icon={Leaf}
          color={analysisReport.isEntryConditionMet ? "emerald" : "amber"}
        />
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
             <div className="flex justify-between items-start mb-2">
                <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Wniosek PDF</span>
                {isUploading ? <Loader2 className="animate-spin text-emerald-500" size={18}/> : <FileText className={applicationDoc ? 'text-emerald-500' : 'text-slate-300'} size={18}/>}
             </div>
             <div className="text-lg font-black text-slate-800 truncate">{applicationDoc ? 'Załadowano' : 'Brak pliku'}</div>
             <div className="text-[10px] text-slate-400 font-bold uppercase">{applicationDoc ? applicationDoc.name : 'Kliknij by dodać'}</div>
             <input type="file" ref={fileInputRef} className="hidden" accept=".pdf" onChange={handleFileUpload} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col h-[350px]">
            <div className="flex justify-between items-center mb-4 border-b pb-3">
                <h3 className="font-bold text-slate-800 flex items-center gap-2"><Layers className="text-emerald-600" size={18}/> Działki Ewidencja</h3>
                <button onClick={() => onManageFields('PARCELS')} className="text-[10px] font-black uppercase text-emerald-600">Zarządzaj</button>
            </div>
            <div className="flex-1 overflow-auto">
                {registryParcels.length > 0 ? (
                    <table className="w-full text-xs text-left">
                        <thead className="text-slate-400 uppercase font-black tracking-tighter border-b">
                            <tr><th className="py-2">Numer</th><th className="py-2 text-right">Pow. PEG</th></tr>
                        </thead>
                        <tbody className="divide-y">
                            {registryParcels.map(p => {
                                const h = p.history?.find(x => x.year === selectedYear);
                                return (
                                    <tr key={p.id}><td className="py-2 font-medium">{p.registrationNumber}</td><td className="py-2 text-right font-bold text-emerald-600">{(h?.eligibleArea || 0).toFixed(2)} ha</td></tr>
                                );
                            })}
                        </tbody>
                    </table>
                ) : <div className="h-full flex items-center justify-center text-slate-300 text-xs font-bold uppercase">Brak danych</div>}
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col h-[350px]">
            <div className="flex justify-between items-center mb-4 border-b pb-3">
                <h3 className="font-bold text-slate-800 flex items-center gap-2"><Sprout className="text-emerald-600" size={18}/> Zasiewy</h3>
                <button onClick={() => onManageFields('CROPS')} className="text-[10px] font-black uppercase text-emerald-600">Zarządzaj</button>
            </div>
            <div className="flex-1 overflow-auto space-y-3">
                {sortedCrops.map(([name, area]) => (
                    <div key={name}>
                        <div className="flex justify-between text-xs font-bold mb-1"><span>{name}</span><span>{area.toFixed(2)} ha</span></div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-emerald-500" style={{width: `${(area/totalArea)*100}%`}}></div></div>
                    </div>
                ))}
            </div>
          </div>
      </div>

      {showSubsidyDetails && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                  {/* Header */}
                  <div className="p-6 border-b flex justify-between items-center bg-slate-50">
                      <div>
                          <h3 className="text-xl font-black text-slate-800 flex items-center gap-2"><Wallet className="text-emerald-600"/> Analiza Finansowa {selectedYear}</h3>
                          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Podsumowanie dopłat bezpośrednich i ekoschematów</p>
                      </div>
                      <button onClick={() => setShowSubsidyDetails(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={24}/></button>
                  </div>

                  {/* Profit Summary Ribbon */}
                  <div className="grid grid-cols-2 bg-emerald-600 text-white">
                      <div className="p-6 border-r border-emerald-500/30 flex flex-col items-center">
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-1 text-emerald-100">Suma Szacowana</span>
                          <span className="text-3xl font-black">{grandTotalSubsidy.toLocaleString('pl-PL', {style:'currency', currency:'PLN'})}</span>
                      </div>
                      <div className="p-6 flex flex-col items-center">
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-1 text-emerald-100">Średnia na Hektar</span>
                          <span className="text-3xl font-black text-emerald-200">{avgSubsidyPerHa.toLocaleString('pl-PL', {style:'currency', currency:'PLN'})}/ha</span>
                      </div>
                  </div>

                  {/* Detailed Table */}
                  <div className="flex-1 overflow-y-auto p-8 space-y-8">
                      {/* Płatności Podstawowe */}
                      <div>
                          <div className="flex items-center gap-2 mb-4">
                              <Banknote size={18} className="text-slate-400" />
                              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Płatności Bezpośrednie (Podstawowe)</h4>
                          </div>
                          <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
                              <table className="w-full text-sm text-left">
                                  <thead className="text-[10px] uppercase font-black text-slate-400 bg-slate-100/50 border-b">
                                      <tr>
                                          <th className="px-4 py-3">Interwencja</th>
                                          <th className="px-4 py-3 text-right">Stawka</th>
                                          <th className="px-4 py-3 text-right">Powierzchnia</th>
                                          <th className="px-4 py-3 text-right">Kwota</th>
                                      </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-200">
                                      {basicPaymentsBreakdown.map((item, idx) => (
                                          <tr key={idx} className="group hover:bg-white transition-colors">
                                              <td className="px-4 py-3 font-bold text-slate-700">{item.name}</td>
                                              <td className="px-4 py-3 text-right text-slate-500 font-medium">{item.rate.toFixed(2)} {item.unit}</td>
                                              <td className="px-4 py-3 text-right text-slate-500 font-medium">{item.amount.toFixed(2)} ha</td>
                                              <td className="px-4 py-3 text-right font-black text-emerald-600">{(item.total || 0).toLocaleString('pl-PL', {style:'currency', currency:'PLN'})}</td>
                                          </tr>
                                      ))}
                                  </tbody>
                              </table>
                          </div>
                      </div>

                      {/* Ekoschematy */}
                      <div>
                          <div className="flex items-center gap-2 mb-4">
                              <TrendingUp size={18} className="text-emerald-500" />
                              <h4 className="text-xs font-black text-emerald-600 uppercase tracking-widest">Ekoschematy (Rolnictwo Węglowe i inne)</h4>
                          </div>
                          <div className="bg-emerald-50/30 rounded-2xl border border-emerald-100 overflow-hidden">
                              <table className="w-full text-sm text-left">
                                  <thead className="text-[10px] uppercase font-black text-emerald-600 bg-emerald-100/50 border-b border-emerald-100">
                                      <tr>
                                          <th className="px-4 py-3">Praktyka</th>
                                          <th className="px-4 py-3 text-right">Punkty</th>
                                          <th className="px-4 py-3 text-right">Powierzchnia</th>
                                          <th className="px-4 py-3 text-right">Szacowany Zysk</th>
                                      </tr>
                                  </thead>
                                  <tbody className="divide-y divide-emerald-100">
                                      {analysisReport.ecoSchemes.length > 0 ? analysisReport.ecoSchemes.map((eco, idx) => (
                                          <tr key={idx} className="group hover:bg-white transition-colors">
                                              <td className="px-4 py-3 font-bold text-emerald-800">{eco.schemeCode}</td>
                                              <td className="px-4 py-3 text-right text-emerald-600 font-bold">{eco.totalPoints.toFixed(1)} pkt</td>
                                              <td className="px-4 py-3 text-right text-emerald-600 font-medium">{eco.totalArea.toFixed(2)} ha</td>
                                              <td className="px-4 py-3 text-right font-black text-emerald-600">{eco.estimatedValue.toLocaleString('pl-PL', {style:'currency', currency:'PLN'})}</td>
                                          </tr>
                                      )) : (
                                          <tr>
                                              <td colSpan={4} className="px-4 py-8 text-center text-slate-400 italic font-medium">Brak zadeklarowanych praktyk ekoschematowych.</td>
                                          </tr>
                                      )}
                                  </tbody>
                              </table>
                          </div>
                      </div>
                  </div>

                  <div className="p-4 bg-amber-50 text-[10px] text-amber-700 font-bold text-center uppercase tracking-widest border-t border-amber-100">
                      * Kwoty szacunkowe na podstawie stawek {selectedYear}. Ostateczna kwota zależy od kursu EUR i decyzji ARiMR. Średnia PLN/ha liczona od całkowitej powierzchni kwalifikowanej.
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

const StatCard = ({ title, value, subtext, icon: Icon, color, onClick, isInteractive, highlightValue, badge }: any) => {
    const colors: any = {
        blue: 'bg-blue-100 text-blue-600',
        emerald: 'bg-emerald-100 text-emerald-600',
        amber: 'bg-amber-100 text-amber-600',
        indigo: 'bg-indigo-100 text-indigo-600'
    };

    return (
        <div 
            onClick={onClick}
            className={`bg-white p-6 rounded-xl border border-slate-200 shadow-sm transition-all relative overflow-hidden ${isInteractive ? 'cursor-pointer hover:shadow-lg hover:border-emerald-500 active:scale-95' : ''}`}
        >
            <div className="flex items-center justify-between mb-3 relative z-10">
                <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{title}</span>
                <div className={`p-2 rounded-lg ${colors[color] || 'bg-slate-100 text-slate-600'} shadow-sm`}>
                    <Icon size={18} />
                </div>
            </div>
            <div className="flex items-baseline gap-2 mb-1">
                <div className={`text-2xl font-black tracking-tight ${highlightValue ? 'text-emerald-600' : 'text-slate-800'}`}>{value}</div>
                {badge && (
                    <span className="text-[10px] font-black bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200 uppercase">{badge}</span>
                )}
            </div>
            <div className="text-[10px] text-slate-400 flex items-center justify-between font-bold">
                <span>{subtext}</span>
            </div>
            {highlightValue && (
                <div className="absolute bottom-0 left-0 w-full h-1 bg-emerald-500 opacity-20"></div>
            )}
        </div>
    );
};

export default Dashboard;

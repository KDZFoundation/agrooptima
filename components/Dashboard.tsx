
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Calendar, FileText, Map, ChevronRight, Layers, Sprout, Leaf, X, Wallet, Info, Loader2, Database, Banknote, CheckCircle, AlertTriangle, ArrowRight } from 'lucide-react';
import { FarmData, FarmerDocument, Field, SubsidyRate } from '../types';
import { analyzeFarmState } from '../services/farmLogic';
import { api } from '../services/api';
import { extractRawText } from '../services/geminiService';
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
  const [allRates, setAllRates] = useState<SubsidyRate[]>([]);
  const [isLoadingRates, setIsLoadingRates] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const availableYears = [2026, 2025, 2024, 2023, 2022, 2021];

  useEffect(() => {
    const fetchRates = async () => {
        setIsLoadingRates(true);
        try {
            const rates = await api.getRates();
            setAllRates(rates.length > 0 ? rates : [...SUBSIDY_RATES_2026, ...SUBSIDY_RATES_2025, ...SUBSIDY_RATES_2024]);
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
    grandTotalSubsidy,
    registryParcels,
    avgSubsidyPerHa
  } = useMemo(() => {
    let areaSum = 0;
    const summary: Record<string, number> = {};
    const validRegistry: Field[] = [];

    farmData.fields.forEach(field => {
        const h = field.history?.find(x => x.year === selectedYear);
        if (!h) return;
        const peg = Number(h.eligibleArea) || 0;
        areaSum += peg;
        if (peg > 0) validRegistry.push(field);
        
        const cropName = h.crop || 'Nieznana';
        if (cropName !== 'Nieznana') {
            summary[cropName] = (summary[cropName] || 0) + (Number(h.area) || 0);
        }
    });

    const report = analyzeFarmState({ ...farmData, profile: { ...farmData.profile, totalAreaUR: areaSum } }, selectedYear);
    const yearRates = allRates.filter(r => r.year === selectedYear);
    
    // Płatności bezpośrednie (filtrowanie po kategorii DOPLATA lub specyficznych nazwach)
    const basicPayments = yearRates.filter(r => r.category === 'DOPLATA' || r.name.toLowerCase().includes('podstawowe') || r.name.toLowerCase().includes('redystrybucyjna'));
    
    const breakdown = basicPayments.map(p => {
        let area = areaSum;
        if (p.name.toLowerCase().includes('redystrybucyjna')) area = Math.min(areaSum, 30);
        return { name: p.name, rate: p.rate, unit: p.unit, amount: area, total: area * p.rate };
    });

    // Jeśli brak stawek w bazie, użyj sztywnych wartości dla kampanii 2024
    if (breakdown.length === 0) {
        breakdown.push({ name: 'Podstawowe wsparcie dochodów', rate: 483.20, unit: 'PLN/ha', amount: areaSum, total: areaSum * 483.20 });
        breakdown.push({ name: 'Płatność redystrybucyjna', rate: 168.79, unit: 'PLN/ha', amount: Math.min(areaSum, 30), total: Math.min(areaSum, 30) * 168.79 });
    }

    const basicSum = breakdown.reduce((s, i) => s + i.total, 0);
    const grandTotal = basicSum + report.totalEstimatedValue;
    const avg = areaSum > 0 ? grandTotal / areaSum : 0;

    return {
        totalArea: areaSum,
        cropSummary: summary,
        applicationDoc: recentDocuments.find(d => d.category === 'WNIOSEK' && d.campaignYear === selectedYear.toString()),
        analysisReport: report,
        basicPaymentsBreakdown: breakdown,
        grandTotalSubsidy: grandTotal,
        registryParcels: validRegistry.sort((a,b) => (a.registrationNumber || '').localeCompare(b.registrationNumber || '')),
        avgSubsidyPerHa: avg
    };
  }, [farmData, selectedYear, recentDocuments, allRates]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
           <div className="flex items-center gap-3 mb-1">
             <h2 className="text-2xl font-black text-slate-800 tracking-tight">Panel Główny</h2>
             <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-200 flex items-center gap-1">
               <Database size={12} />
               EP: {farmData.profile.producerId}
             </span>
           </div>
           <p className="text-slate-500 font-medium">Rolnik: <span className="text-emerald-600 font-bold">{farmData.farmName || 'Gospodarstwo'}</span></p>
        </div>
        <div className="flex items-center gap-4">
            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-4 py-2">
                <Calendar size={18} className="text-slate-400 mr-2" />
                <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="bg-transparent font-black text-slate-800 focus:outline-none cursor-pointer text-sm">
                    {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
            </div>
        </div>
      </div>

      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-6">
          <div className={`p-4 rounded-2xl ${analysisReport.isEntryConditionMet ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'} shadow-sm`}>
              <Leaf size={32} />
          </div>
          <div className="flex-1 w-full">
              <div className="flex justify-between items-center mb-2">
                  <h3 className="font-black text-slate-800 text-xs uppercase tracking-widest flex items-center gap-2">
                      Status Rolnictwa Węglowego {selectedYear}
                      {analysisReport.isEntryConditionMet ? <CheckCircle size={14} className="text-emerald-500" /> : <AlertTriangle size={14} className="text-amber-500" />}
                  </h3>
                  <span className="text-sm font-black text-slate-700">{analysisReport.totalPoints.toFixed(1)} / {analysisReport.requiredPoints.toFixed(1)} pkt</span>
              </div>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                  <div className={`h-full transition-all duration-700 ${analysisReport.isEntryConditionMet ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${Math.min((analysisReport.totalPoints / (analysisReport.requiredPoints || 1)) * 100, 100)}%` }}></div>
              </div>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-2">
                  {analysisReport.isEntryConditionMet ? 'Warunek wejścia (25% ha * 5 pkt) został spełniony.' : 'Brakuje punktów do spełnienia warunku wejścia.'}
              </p>
          </div>
          <button onClick={() => onManageFields('CROPS')} className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all">Dostosuj Zasiewy</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard title="Powierzchnia UR" value={`${totalArea.toFixed(2)} ha`} subtext={`Suma PEG (${selectedYear})`} icon={Map} color="blue" />
        <StatCard title="Szacowane Dopłaty" value={isLoadingRates ? "..." : `${(Number(grandTotalSubsidy) || 0).toLocaleString('pl-PL', { maximumFractionDigits: 0 })} PLN`} subtext={`Średnio ${avgSubsidyPerHa.toLocaleString('pl-PL', { maximumFractionDigits: 2 })} PLN/ha`} icon={Banknote} color="emerald" highlightValue={true} onClick={() => setShowSubsidyDetails(true)} isInteractive badge={`${avgSubsidyPerHa.toFixed(0)} PLN/ha`} />
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
             <div className="flex justify-between items-start mb-2">
                <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Wniosek PDF</span>
                {isUploading ? <Loader2 className="animate-spin text-emerald-500" size={18}/> : <FileText className={applicationDoc ? 'text-emerald-500' : 'text-slate-300'} size={18}/>}
             </div>
             <div className="text-lg font-black text-slate-800 truncate">{applicationDoc ? 'Załadowano' : 'Brak pliku'}</div>
             <div className="text-[10px] text-slate-400 font-bold uppercase">{applicationDoc ? applicationDoc.name : 'Dodaj e-Wniosek'}</div>
             <input type="file" ref={fileInputRef} className="hidden" accept=".pdf" onChange={() => {}} />
        </div>
      </div>

      {showSubsidyDetails && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                  <div className="p-6 border-b flex justify-between items-center bg-slate-50">
                      <div>
                          <h3 className="text-xl font-black text-slate-800 flex items-center gap-2"><Wallet className="text-emerald-600"/> Analiza Finansowa {selectedYear}</h3>
                          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Podsumowanie płatności bezpośrednich i ekoschematów</p>
                      </div>
                      <button onClick={() => setShowSubsidyDetails(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={24}/></button>
                  </div>

                  <div className="grid grid-cols-2 bg-emerald-600 text-white">
                      <div className="p-6 border-r border-emerald-500/30 flex flex-col items-center">
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-1 text-emerald-100">Suma szacowana</span>
                          <span className="text-3xl font-black">{grandTotalSubsidy.toLocaleString('pl-PL', {style:'currency', currency:'PLN'})}</span>
                      </div>
                      <div className="p-6 flex flex-col items-center">
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-1 text-emerald-100">Średnia na hektar</span>
                          <span className="text-3xl font-black text-emerald-200">{avgSubsidyPerHa.toLocaleString('pl-PL', {style:'currency', currency:'PLN'})}/ha</span>
                      </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-8 space-y-6">
                      <div className="space-y-3">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2"><Banknote size={14} className="text-blue-500" /> Płatności Bezpośrednie</h4>
                        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                            <table className="w-full text-sm text-left">
                                <thead className="text-[10px] uppercase font-black text-slate-400 bg-slate-50 border-b">
                                    <tr><th className="px-4 py-3">Interwencja</th><th className="px-4 py-3 text-right">Stawka</th><th className="px-4 py-3 text-right">Powierzchnia</th><th className="px-4 py-3 text-right">Kwota</th></tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {basicPaymentsBreakdown.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50/50">
                                            <td className="px-4 py-3 font-bold text-slate-700">{item.name}</td>
                                            <td className="px-4 py-3 text-right text-slate-500">{item.rate.toFixed(2)} {item.unit}</td>
                                            <td className="px-4 py-3 text-right text-slate-500">{item.amount.toFixed(2)} ha</td>
                                            <td className="px-4 py-3 text-right font-black text-slate-800">{item.total.toLocaleString('pl-PL', {style:'currency', currency:'PLN'})}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2"><Leaf size={14} className="text-emerald-500" /> Ekoschematy i Praktyki</h4>
                        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                            <table className="w-full text-sm text-left">
                                <thead className="text-[10px] uppercase font-black text-slate-400 bg-slate-50 border-b">
                                    <tr><th className="px-4 py-3">Kod Praktyki</th><th className="px-4 py-3 text-right">Punkty/Stawka</th><th className="px-4 py-3 text-right">Obszar</th><th className="px-4 py-3 text-right">Wartość</th></tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {analysisReport.ecoSchemes.length > 0 ? analysisReport.ecoSchemes.map((eco, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50/50">
                                            <td className="px-4 py-3 font-bold text-emerald-700">{eco.schemeCode}</td>
                                            <td className="px-4 py-3 text-right text-slate-500">{eco.totalPoints > 0 ? `${eco.totalPoints.toFixed(1)} pkt` : 'Stawka ha'}</td>
                                            <td className="px-4 py-3 text-right text-slate-500">{eco.totalArea.toFixed(2)} ha</td>
                                            <td className="px-4 py-3 text-right font-black text-emerald-600">{eco.estimatedValue.toLocaleString('pl-PL', {style:'currency', currency:'PLN'})}</td>
                                        </tr>
                                    )) : <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400 italic font-medium">Brak zadeklarowanych ekoschematów.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

const StatCard = ({ title, value, subtext, icon: Icon, color, onClick, isInteractive, highlightValue, badge }: any) => {
    const colors: any = { blue: 'bg-blue-100 text-blue-600', emerald: 'bg-emerald-100 text-emerald-600', amber: 'bg-amber-100 text-amber-600' };
    return (
        <div onClick={onClick} className={`bg-white p-6 rounded-xl border border-slate-200 shadow-sm transition-all relative overflow-hidden ${isInteractive ? 'cursor-pointer hover:shadow-lg active:scale-95' : ''}`}>
            <div className="flex items-center justify-between mb-3">
                <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{title}</span>
                <div className={`p-2 rounded-lg ${colors[color] || 'bg-slate-100'}`}><Icon size={18} /></div>
            </div>
            <div className="flex items-baseline gap-2 mb-1">
                <div className={`text-2xl font-black tracking-tight ${highlightValue ? 'text-emerald-600' : 'text-slate-800'}`}>{value}</div>
                {badge && <span className="text-[10px] font-black bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200 uppercase">{badge}</span>}
            </div>
            <div className="text-[10px] text-slate-400 font-bold uppercase">{subtext}</div>
        </div>
    );
};

export default Dashboard;

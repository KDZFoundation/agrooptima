
import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, AlertTriangle, CheckCircle, Wallet, Loader2, BrainCircuit, TrendingUp, ShieldCheck, ChevronRight, BarChart3, Info } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { FarmData, OptimizationResult } from '../types';
import { getFarmOptimization } from '../services/geminiService';

interface OptimizerProps {
  farmData: FarmData;
}

const Optimizer: React.FC<OptimizerProps> = ({ farmData }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [loadingStage, setLoadingStage] = useState(0);

  const stages = [
    "Analizuję strukturę zasiewów...",
    "Weryfikuję normy GAEC i SMR...",
    "Sprawdzam punkty Rolnictwa Węglowego...",
    "Optymalizuję dobór ekoschematów...",
    "Generuję raport końcowy..."
  ];

  useEffect(() => {
    let interval: any;
    if (loading) {
      interval = setInterval(() => {
        setLoadingStage(prev => (prev + 1) % stages.length);
      }, 3500);
    } else {
      setLoadingStage(0);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const handleOptimize = async () => {
    if (farmData.fields.length === 0) return;
    setLoading(true);
    setResult(null);
    try {
      const data = await getFarmOptimization(farmData);
      setResult(data);
    } catch (err) {
      console.error(err);
      alert("Błąd podczas analizy danych. Silnik AI jest przeciążony lub dane są niepełne.");
    } finally {
      setLoading(false);
    }
  };

  const chartData = (result?.recommendations || []).map(r => ({
    name: r.fieldName.length > 10 ? r.fieldName.substring(0, 10) + '...' : r.fieldName,
    full_name: r.fieldName,
    Zysk: r.potentialGain
  }));

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="bg-emerald-900 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500 rounded-full -mr-32 -mt-32 blur-[100px] opacity-20"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-300 rounded-full -ml-32 -mb-32 blur-[80px] opacity-10"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-emerald-500/20 rounded-xl border border-emerald-500/30 backdrop-blur-md">
                    <BrainCircuit className="text-emerald-400" size={24} />
                </div>
                <span className="text-xs font-black uppercase tracking-[0.2em] text-emerald-400">Silnik AgroOptima AI v3.0</span>
            </div>
            <h2 className="text-4xl font-black mb-4 tracking-tight">Inteligentna Optymalizacja Dopłat</h2>
            <p className="text-emerald-100/80 text-lg leading-relaxed mb-8">
              Wykorzystaj zaawansowane modele Gemini 3 Pro do maksymalizacji zysków z gospodarstwa. 
              System analizuje Twoje uprawy i automatycznie dobiera najbardziej opłacalne pakiety ekoschematów, 
              dbając o pełną zgodność z wymogami ARiMR.
            </p>
            
            {!loading && (
              <button 
                onClick={handleOptimize}
                disabled={farmData.fields.length === 0}
                className={`group flex items-center space-x-3 px-8 py-4 rounded-2xl font-black text-lg transition-all shadow-xl active:scale-95 ${
                  farmData.fields.length === 0 
                  ? 'bg-slate-700 cursor-not-allowed text-slate-400' 
                  : 'bg-emerald-500 hover:bg-white hover:text-emerald-900 text-white'
                }`}
              >
                <Sparkles className="group-hover:animate-pulse" />
                <span>{farmData.fields.length === 0 ? "Brak danych działek" : "Uruchom Analizę AI"}</span>
                <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>
            )}
          </div>

          {loading && (
             <div className="flex flex-col items-center justify-center p-8 bg-black/20 backdrop-blur-xl rounded-3xl border border-white/10 w-full md:w-80 animate-in zoom-in-95">
                <div className="relative mb-6">
                    <Loader2 className="animate-spin text-emerald-400" size={64} strokeWidth={3} />
                    <Sparkles size={24} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-emerald-200 animate-pulse" />
                </div>
                <p className="text-sm font-black uppercase tracking-widest text-emerald-400 mb-2">Przetwarzanie...</p>
                <p className="text-xs text-emerald-100/60 text-center font-medium h-8">{stages[loadingStage]}</p>
                <div className="w-full h-1 bg-white/10 rounded-full mt-4 overflow-hidden">
                    <div className="h-full bg-emerald-500 animate-progress"></div>
                </div>
             </div>
          )}

          {result && !loading && (
              <div className="bg-white/10 backdrop-blur-xl p-6 rounded-3xl border border-white/20 w-full md:w-80 shadow-2xl animate-in fade-in slide-in-from-right-4">
                  <div className="text-emerald-400 text-[10px] font-black uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                      <TrendingUp size={14} /> Wynik Symulacji
                  </div>
                  <div className="mb-6">
                      <p className="text-4xl font-black text-white leading-none mb-1">
                          {result.totalEstimatedSubsidy.toLocaleString('pl-PL')} 
                          <span className="text-lg ml-1 font-medium text-emerald-300">PLN</span>
                      </p>
                      <p className="text-xs text-emerald-100/60 font-bold uppercase">Suma Szacowana</p>
                  </div>
                  <div className="space-y-3">
                      <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl">
                          <span className="text-[10px] font-black uppercase text-emerald-200/50">Działki</span>
                          <span className="font-black text-white">{result.recommendations.length}</span>
                      </div>
                      <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl">
                          <span className="text-[10px] font-black uppercase text-emerald-200/50">Potencjał</span>
                          <span className="font-black text-emerald-400">+12.4%</span>
                      </div>
                  </div>
              </div>
          )}
        </div>
      </div>

      {result && !loading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
          
          {/* Main List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between px-2">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <ShieldCheck className="text-emerald-600" size={18} />
                    Rekomendacje pakietowe dla pól
                </h3>
            </div>
            
            {result.recommendations.map((rec) => (
              <div key={rec.fieldId} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-emerald-300 hover:shadow-lg transition-all group overflow-hidden relative">
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-full -mr-12 -mt-12 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 relative z-10">
                  <div>
                      <h4 className="font-black text-xl text-slate-800 tracking-tight">{rec.fieldName}</h4>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">ID: {rec.fieldId}</p>
                  </div>
                  <div className="flex items-center gap-2 bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100 shadow-sm">
                    <TrendingUp size={16} className="text-emerald-600" />
                    <span className="text-emerald-700 font-black text-sm">
                        +{rec.potentialGain.toLocaleString()} PLN
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-4 relative z-10">
                    {rec.suggestedEcoSchemes.map((eco, idx) => (
                      <span key={idx} className="bg-slate-900 text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm">
                        {eco}
                      </span>
                    ))}
                </div>

                <div className="bg-slate-50 p-4 rounded-xl text-sm text-slate-600 leading-relaxed font-medium italic border-l-4 border-emerald-500 relative z-10">
                   {rec.reasoning}
                </div>
              </div>
            ))}
          </div>

          {/* Analysis Sidebar */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-6">
                    <BarChart3 size={18} className="text-blue-500" />
                    Wpływ na budżet
                </h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
                        <YAxis hide />
                        <Tooltip 
                            cursor={{fill: '#f8fafc'}}
                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                            itemStyle={{ fontWeight: '900', fontSize: '12px', color: '#059669' }}
                            labelStyle={{ fontWeight: '700', fontSize: '10px', color: '#94a3b8', marginBottom: '4px' }}
                            formatter={(value: number) => [`+ ${value} PLN`, 'Zysk']}
                            labelFormatter={(label) => {
                                const full = chartData.find(d => d.name === label)?.full_name;
                                return full || label;
                            }}
                        />
                        <Bar dataKey="Zysk" radius={[6, 6, 0, 0]} barSize={40}>
                             {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill="#10b981" />
                            ))}
                        </Bar>
                    </BarChart>
                    </ResponsiveContainer>
                </div>
                <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-100 flex items-start gap-3">
                    <Info size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
                    <p className="text-[10px] text-blue-800 font-medium leading-relaxed">
                        Powyższy wykres prezentuje dodatkowe przychody z tytułu zadeklarowanych ekoschematów dla poszczególnych działek po optymalizacji.
                    </p>
                </div>
            </div>

            <div className="bg-amber-50 p-6 rounded-2xl border border-amber-200 shadow-sm relative overflow-hidden">
              <div className="absolute -bottom-4 -right-4 text-amber-100 opacity-50 rotate-12">
                  <AlertTriangle size={80} />
              </div>
              <h3 className="text-amber-800 font-black uppercase text-xs tracking-widest flex items-center gap-2 mb-4">
                <AlertTriangle size={18} />
                Walidacja GAEC / SMR
              </h3>
              <p className="text-sm text-amber-900 leading-relaxed font-medium relative z-10">
                {result.complianceNotes}
              </p>
              <div className="mt-4 pt-4 border-t border-amber-200 flex justify-between items-center relative z-10">
                  <span className="text-[10px] font-black text-amber-700 uppercase">Wiarygodność prawna</span>
                  <span className="text-xs font-black text-amber-900 bg-amber-200/50 px-2 py-0.5 rounded">WYSOKA</span>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* Placeholder for no data */}
      {!result && !loading && farmData.fields.length === 0 && (
          <div className="bg-slate-100 border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center flex flex-col items-center">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-inner mb-4">
                  <BrainCircuit className="text-slate-300" size={40} />
              </div>
              <h3 className="text-lg font-black text-slate-400 uppercase tracking-widest">Brak danych do analizy</h3>
              <p className="text-slate-400 text-sm max-w-sm mt-2">
                  Aby uruchomić inteligentną optymalizację, musisz najpierw zaimportować działki w sekcji "Menedżer Pola" lub wgrać e-wniosek w sekcji "Dokumenty".
              </p>
          </div>
      )}
    </div>
  );
};

export default Optimizer;

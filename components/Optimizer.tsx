import React, { useState } from 'react';
import { Sparkles, ArrowRight, AlertTriangle, CheckCircle, Wallet, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { FarmData, OptimizationResult } from '../types';
import { getFarmOptimization } from '../services/geminiService';

interface OptimizerProps {
  farmData: FarmData;
}

const Optimizer: React.FC<OptimizerProps> = ({ farmData }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OptimizationResult | null>(null);

  const handleOptimize = async () => {
    if (farmData.fields.length === 0) return;
    setLoading(true);
    try {
      const data = await getFarmOptimization(farmData);
      setResult(data);
    } catch (err) {
      alert("Błąd podczas analizy danych. Spróbuj ponownie.");
    } finally {
      setLoading(false);
    }
  };

  const chartData = result?.recommendations.map(r => ({
    name: r.fieldName,
    Zysk: r.potentialGain
  }));

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-emerald-800 to-teal-900 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
        <div className="relative z-10">
          <h2 className="text-3xl font-bold mb-4">Inteligentna Optymalizacja WPR</h2>
          <p className="text-emerald-100 max-w-2xl mb-8">
            Wykorzystaj sztuczną inteligencję Gemini, aby przeanalizować swoje uprawy pod kątem ekoschematów. 
            Algorytm sprawdzi zgodność z przepisami ARiMR i zaproponuje konfigurację maksymalizującą dopłaty.
          </p>
          
          {!result && !loading && (
            <button 
              onClick={handleOptimize}
              disabled={farmData.fields.length === 0}
              className={`flex items-center space-x-2 px-8 py-3 rounded-xl font-semibold text-lg transition-all shadow-lg ${
                farmData.fields.length === 0 
                ? 'bg-slate-600 cursor-not-allowed text-slate-400' 
                : 'bg-emerald-500 hover:bg-emerald-400 text-white hover:scale-105'
              }`}
            >
              <Sparkles className={loading ? 'animate-spin' : ''} />
              <span>{farmData.fields.length === 0 ? "Dodaj pola aby rozpocząć" : "Uruchom Analizę AI"}</span>
            </button>
          )}

          {loading && (
             <div className="flex items-center space-x-3 text-emerald-200">
                <Loader2 className="animate-spin" size={24}/>
                <span className="text-lg">Analizuję strukturę zasiewów i przepisy prawne...</span>
             </div>
          )}
        </div>
      </div>

      {result && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
          
          {/* Summary Card */}
          <div className="lg:col-span-3 bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
             <div>
                <h3 className="text-lg font-semibold text-slate-700">Prognozowana Suma Dopłat</h3>
                <p className="text-slate-500 text-sm">Podstawa + Ekoschematy</p>
             </div>
             <div className="flex items-center space-x-4">
                 <div className="p-3 bg-green-100 rounded-full text-green-700">
                    <Wallet size={32} />
                 </div>
                 <div className="text-4xl font-bold text-slate-900">
                    {result.totalEstimatedSubsidy.toLocaleString('pl-PL', {style: 'currency', currency: 'PLN'})}
                 </div>
             </div>
          </div>

          {/* Detailed Recommendations */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <CheckCircle className="text-emerald-600" />
                Rekomendacje dla pól
            </h3>
            {result.recommendations.map((rec) => (
              <div key={rec.fieldId} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-3">
                  <h4 className="font-bold text-lg text-slate-800">{rec.fieldName}</h4>
                  <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full border border-emerald-200">
                    +{rec.potentialGain.toLocaleString('pl-PL', {style: 'currency', currency: 'PLN'})}
                  </span>
                </div>
                <div className="mb-3">
                  <p className="text-xs text-slate-400 uppercase font-semibold mb-1">Sugerowane Ekoschematy:</p>
                  <div className="flex flex-wrap gap-2">
                    {rec.suggestedEcoSchemes.map((eco, idx) => (
                      <span key={idx} className="bg-blue-50 text-blue-700 px-2 py-1 rounded-md text-sm border border-blue-100">
                        {eco}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg text-sm text-slate-600 italic border border-slate-100">
                  "{rec.reasoning}"
                </div>
              </div>
            ))}
          </div>

          {/* Chart & Compliance */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Wzrost dochodowości</h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="name" hide />
                        <YAxis hide />
                        <Tooltip 
                            formatter={(value: number) => [`${value} PLN`, 'Zysk']}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Bar dataKey="Zysk" radius={[4, 4, 0, 0]}>
                             {chartData?.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill="#10b981" />
                            ))}
                        </Bar>
                    </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="bg-amber-50 p-6 rounded-xl border border-amber-200 shadow-sm">
              <h3 className="text-amber-800 font-bold flex items-center gap-2 mb-3">
                <AlertTriangle size={20} />
                Uwagi dot. zgodności
              </h3>
              <p className="text-sm text-amber-900 leading-relaxed">
                {result.complianceNotes}
              </p>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};

export default Optimizer;
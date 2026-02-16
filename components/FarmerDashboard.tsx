
import React, { useMemo } from 'react';
import { Calendar, FileText, Map, TrendingUp, Leaf, CheckCircle, AlertTriangle, ChevronRight, Sun, Layers, AlertCircle } from 'lucide-react';
import { FarmData } from '../types';
import { analyzeFarmState } from '../services/farmLogic';

interface FarmerDashboardProps {
  farmData: FarmData;
  onNavigate: (view: any) => void;
  selectedYear: number;
  setSelectedYear: (year: number) => void;
}

const FarmerDashboard: React.FC<FarmerDashboardProps> = ({ farmData, onNavigate, selectedYear, setSelectedYear }) => {
  const availableYears = [2026, 2025, 2024, 2023, 2022];

  const { stats, cropStructure, applicationDoc } = useMemo(() => {
    // Obliczenia analityczne dla wybranego roku
    const report = analyzeFarmState(farmData, selectedYear);
    
    // Struktura zasiewów
    const structure: Record<string, { area: number, color: string }> = {};
    let totalAreaCalculated = 0;

    farmData.fields.forEach(field => {
        const hist = field.history.find(h => h.year === selectedYear);
        if (hist) {
            const area = hist.area || field.area;
            const crop = hist.crop || 'Nieznana';
            if (!structure[crop]) structure[crop] = { area: 0, color: 'bg-emerald-500' };
            structure[crop].area += area;
            totalAreaCalculated += area;
        }
    });

    // Sortowanie upraw
    const sortedCrops = Object.entries(structure)
        .map(([name, data]) => ({ name, ...data, percentage: (data.area / totalAreaCalculated) * 100 }))
        .sort((a, b) => b.area - a.area);

    // Dokument wniosku
    const doc = farmData.profile.producerId 
        ? undefined // Tutaj można by szukać w dokumentach klienta jeśli byłyby przekazane
        : undefined; 

    return {
        stats: report,
        cropStructure: sortedCrops,
        applicationDoc: doc
    };
  }, [farmData, selectedYear]);

  // Symulacja danych finansowych do widoku (bazując na logice)
  // Dodajemy podstawę (ok. 1000 PLN/ha średnio z wszystkich dopłat podstawowych) do wyliczonych ekoschematów
  const estimatedTotal = stats.totalEstimatedValue + (farmData.profile.totalAreaUR * 1100); 

  return (
    <div className="space-y-6 pb-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
           <h2 className="text-2xl font-black text-slate-800 tracking-tight">Panel Główny</h2>
           <p className="text-slate-500 font-medium">Klient: <span className="text-emerald-600 font-bold">{farmData.farmName || 'Gospodarstwo'}</span></p>
        </div>
        <div className="flex items-center gap-4">
            <div className="px-4 py-2 bg-amber-50 text-amber-700 rounded-xl font-bold text-sm flex items-center gap-2 border border-amber-100 shadow-sm">
                <Sun size={18} className="text-amber-500" /> Dziś: 22°C
            </div>
            <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm">
                <Calendar size={18} className="text-slate-400 mr-2" />
                <span className="text-xs font-black text-slate-500 uppercase tracking-widest mr-2">Rok Kampanii:</span>
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

      {/* Carbon Farming Status */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-2">
                  <Leaf className="text-emerald-500" size={24} />
                  <h3 className="font-black text-slate-800 text-lg">Status Rolnictwa Węglowego</h3>
              </div>
              <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border flex items-center gap-1 ${stats.isEntryConditionMet ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                  {stats.isEntryConditionMet ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
                  {stats.isEntryConditionMet ? 'Warunek Spełniony' : 'Niespełniony'}
              </div>
          </div>

          <div className="flex justify-between items-end mb-2 text-sm">
              <span className="font-bold text-slate-700">Zgromadzone punkty: <span className="text-2xl font-black">{stats.totalPoints.toFixed(1)} pkt</span></span>
              <span className="text-slate-400 font-medium">Wymagane minimum (25% UR): <span className="font-bold text-slate-600">{stats.requiredPoints.toFixed(1)} pkt</span></span>
          </div>

          <div className="h-4 bg-slate-100 rounded-full overflow-hidden mb-3">
              <div 
                  className="h-full bg-emerald-500 transition-all duration-1000 ease-out" 
                  style={{ width: `${Math.min((stats.totalPoints / (stats.requiredPoints || 1)) * 100, 100)}%` }}
              ></div>
          </div>

          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">
              Przelicznik: 1 pkt ≈ 100 PLN. Szacowana wartość ekoschematów: <span className="text-emerald-600">{(stats.totalEstimatedValue).toLocaleString('pl-PL', { minimumFractionDigits: 2 })} zł</span>
          </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1: Area */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative group hover:shadow-md transition-all">
              <div className="flex justify-between items-start mb-4">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Powierzchnia UR (PEG)</span>
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-xl"><Map size={20} /></div>
              </div>
              <div className="text-3xl font-black text-slate-800 mb-1">{farmData.profile.totalAreaUR.toFixed(2)} ha</div>
              <div className="text-[10px] text-slate-400 font-bold uppercase">Suma kwalifikowana ({selectedYear})</div>
          </div>

          {/* Card 2: Subsidies */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative group hover:shadow-md transition-all cursor-pointer" onClick={() => onNavigate('SIMULATION')}>
              <div className="flex justify-between items-start mb-4">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Szacowane Dopłaty</span>
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"><TrendingUp size={20} /></div>
              </div>
              <div className="text-3xl font-black text-slate-800 mb-1">~ {estimatedTotal.toLocaleString('pl-PL', { maximumFractionDigits: 0 })} PLN</div>
              <div className="text-[10px] text-slate-400 font-bold uppercase">Podstawa + Ekoschematy</div>
          </div>

          {/* Card 3: Deadline */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative group hover:shadow-md transition-all">
              <div className="flex justify-between items-start mb-4">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Najbliższy Termin</span>
                  <div className="p-2 bg-amber-50 text-amber-600 rounded-xl"><Calendar size={20} /></div>
              </div>
              <div className="text-3xl font-black text-slate-800 mb-1">Zakończono</div>
              <div className="text-[10px] text-slate-400 font-bold uppercase">Kampania zamknięta</div>
          </div>

          {/* Card 4: Application Doc */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative group hover:shadow-md transition-all cursor-pointer" onClick={() => onNavigate('DOCUMENTS')}>
              <div className="flex justify-between items-start mb-4">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Wniosek o Płatność</span>
                  <div className="p-2 bg-red-50 text-red-500 rounded-xl"><FileText size={20} /></div>
              </div>
              <div className="text-2xl font-black text-slate-400 italic mb-1">Brak pliku</div>
              <div className="text-[10px] text-amber-500 font-bold uppercase flex items-center gap-1"><AlertCircle size={10}/> Nie wgrano PDF</div>
          </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Parcel Window */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[400px]">
              <div className="flex justify-between items-center mb-6">
                  <h3 className="font-black text-slate-800 flex items-center gap-2">
                      <Layers size={20} className="text-emerald-600" />
                      Okno Działek ({selectedYear})
                  </h3>
                  <button onClick={() => onNavigate('FIELDS')} className="text-emerald-600 text-xs font-black uppercase hover:underline">Pełna Ewidencja &gt;</button>
              </div>
              
              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                  <table className="w-full text-left">
                      <thead className="sticky top-0 bg-white text-[10px] uppercase text-slate-400 font-black border-b border-slate-100">
                          <tr>
                              <th className="pb-3 pl-2">Nr/Nazwa</th>
                              <th className="pb-3 text-right pr-2">Pow. PEG</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                          {farmData.fields.map(field => {
                              const hist = field.history.find(h => h.year === selectedYear);
                              if (!hist) return null;
                              return (
                                  <tr key={field.id} className="group hover:bg-slate-50 transition-colors">
                                      <td className="py-3 pl-2">
                                          <div className="font-bold text-slate-700 text-sm">{field.name}</div>
                                          <div className="text-[10px] text-slate-400 font-mono">{field.registrationNumber}</div>
                                      </td>
                                      <td className="py-3 text-right pr-2 text-sm font-medium text-slate-600">
                                          {(hist.eligibleArea || field.eligibleArea || 0).toFixed(2)}
                                      </td>
                                  </tr>
                              );
                          })}
                          {farmData.fields.length === 0 && (
                              <tr><td colSpan={2} className="py-8 text-center text-slate-400 text-xs uppercase">Brak danych działek</td></tr>
                          )}
                      </tbody>
                  </table>
              </div>
          </div>

          {/* Right: Crop Structure */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[400px]">
              <div className="flex justify-between items-center mb-6">
                  <h3 className="font-black text-slate-800 flex items-center gap-2">
                      <Leaf size={20} className="text-emerald-600" />
                      Struktura Zasiewów
                  </h3>
                  <button onClick={() => onNavigate('FIELDS')} className="text-emerald-600 text-xs font-black uppercase hover:underline">Zarządzaj &gt;</button>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-5">
                  {cropStructure.map((crop, idx) => (
                      <div key={idx}>
                          <div className="flex justify-between items-end mb-1">
                              <div className="flex items-center gap-2">
                                  <div className={`w-2 h-2 rounded-full ${crop.color}`}></div>
                                  <span className="font-bold text-slate-700 text-sm">{crop.name}</span>
                              </div>
                              <div className="text-right">
                                  <span className="font-black text-slate-800 text-sm">{crop.area.toFixed(2)} ha</span>
                                  <span className="text-[10px] text-slate-400 ml-1">({crop.percentage.toFixed(1)}%)</span>
                              </div>
                          </div>
                          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                              <div className={`h-full ${crop.color}`} style={{ width: `${crop.percentage}%` }}></div>
                          </div>
                      </div>
                  ))}
                  {cropStructure.length === 0 && (
                       <div className="h-full flex items-center justify-center text-slate-400 text-xs uppercase">Brak zasiewów</div>
                  )}
              </div>
          </div>
      </div>
    </div>
  );
};

export default FarmerDashboard;

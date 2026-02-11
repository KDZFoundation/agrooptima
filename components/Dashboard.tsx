
import React, { useState, useMemo } from 'react';
import { ArrowUpRight, Calendar, FileText, Sun, FileSpreadsheet, Map, File, ChevronRight, Layers, Sprout, PieChart, Download, AlertTriangle, CheckCircle, Search } from 'lucide-react';
import { FarmData, FarmerDocument, Field } from '../types';

interface DashboardProps {
  farmData: FarmData;
  recentDocuments: FarmerDocument[];
  onViewAllDocuments: () => void;
  onManageFields: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ farmData, recentDocuments = [], onViewAllDocuments, onManageFields }) => {
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const availableYears = [2026, 2025, 2024, 2023];

  // 1. Logic to get crop for a specific year
  const getCropForYear = (field: Field, year: number): string => {
    if (year === 2026) {
        return field.crop || 'Nieznana';
    }
    // Fix: Add ?. to history access
    const historyEntry = field.history?.find(h => h.year === year);
    return historyEntry ? historyEntry.crop : 'Brak danych';
  };

  // 2. Calculate Stats based on Selected Year
  const { totalArea, cropSummary, applicationDoc } = useMemo(() => {
    let areaSum = 0;
    const summary: Record<string, number> = {};

    farmData.fields.forEach(field => {
        areaSum += field.area;
        const crop = getCropForYear(field, selectedYear);
        if (!summary[crop]) summary[crop] = 0;
        summary[crop] += field.area;
    });

    // Find PDF Application for the selected year - use optional chaining for safety
    const appDoc = recentDocuments?.find(d => 
        (d.category === 'WNIOSEK' || d.type === 'PDF') && 
        d.campaignYear === selectedYear.toString()
    );

    return { 
        totalArea: areaSum, 
        cropSummary: summary,
        applicationDoc: appDoc
    };
  }, [farmData, selectedYear, recentDocuments]);

  const sortedCrops = (Object.entries(cropSummary) as [string, number][]).sort((a, b) => b[1] - a[1]);

  // Mocked generic deadlines based on year
  const getDeadlineInfo = (year: number) => {
      if (year === 2026) return { date: '15 Maja', desc: 'Termin składania wniosków podstawowych' };
      if (year === 2025) return { date: 'Zakończono', desc: 'Kampania zamknięta' };
      return { date: 'Archiwum', desc: 'Dane historyczne' };
  };
  const deadline = getDeadlineInfo(selectedYear);

  return (
    <div className="space-y-6">
      
      {/* HEADER: TITLE + YEAR SELECTOR */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
           <h2 className="text-2xl font-bold text-slate-800">
             Panel Główny
           </h2>
           <p className="text-slate-500">Klient: <span className="font-semibold text-emerald-600">{farmData.farmName}</span></p>
        </div>
        
        <div className="flex items-center gap-4">
             <div className="hidden md:flex items-center space-x-2 bg-yellow-50 text-yellow-700 px-4 py-2 rounded-full border border-yellow-200 text-sm font-medium">
                <Sun size={16} />
                <span>Dziś: 22°C</span>
            </div>
            
            <div className="flex items-center bg-white border border-slate-300 rounded-lg shadow-sm px-3 py-2">
                <Calendar size={18} className="text-slate-400 mr-2" />
                <span className="text-sm font-semibold text-slate-600 mr-2">Rok Kampanii:</span>
                <select 
                    value={selectedYear} 
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer"
                >
                    {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
            </div>
        </div>
      </div>

      {/* ROW 1: KEY METRICS (Area, Money, Deadline, PDF Application) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* 1. Area */}
        <StatCard 
          title="Powierzchnia UR" 
          value={`${totalArea.toFixed(2)} ha`} 
          subtext={`Suma geometryczna (${selectedYear})`}
          icon={Map}
          color="blue"
        />
        
        {/* 2. Subsidies (Estimated) */}
        <StatCard 
          title="Szacowane Dopłaty" 
          value={selectedYear === 2026 ? "~ 14 500 PLN" : "Zrealizowano"} 
          subtext={selectedYear === 2026 ? "Wymagana optymalizacja" : "Płatność zakończona"}
          icon={ArrowUpRight}
          color="emerald"
        />
        
        {/* 3. Deadlines */}
        <StatCard 
          title="Najbliższy Termin" 
          value={deadline.date} 
          subtext={deadline.desc}
          icon={Calendar}
          color="amber"
        />
        
        {/* 4. Payment Application PDF */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between relative overflow-hidden">
             <div className="absolute top-0 right-0 w-16 h-16 bg-red-50 rounded-bl-full -mr-4 -mt-4 z-0"></div>
             <div className="relative z-10">
                <div className="flex justify-between items-start mb-2">
                    <span className="text-slate-500 text-sm font-medium">Wniosek o Płatność</span>
                    <FileText size={20} className="text-red-500" />
                </div>
                
                {applicationDoc ? (
                    <div>
                        <div className="text-lg font-bold text-slate-800 truncate mb-1" title={applicationDoc.name}>
                            {applicationDoc.name}
                        </div>
                        <div className="flex items-center gap-2">
                             <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">
                                <CheckCircle size={10} /> Przyjęto
                             </span>
                             <span className="text-xs text-slate-400">{applicationDoc.uploadDate}</span>
                        </div>
                    </div>
                ) : (
                    <div>
                        <div className="text-lg font-bold text-slate-400 italic mb-1">
                            Brak pliku
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                             <AlertTriangle size={12} className="text-amber-500" />
                             <span>Nie wgrano wniosku PDF</span>
                        </div>
                    </div>
                )}
             </div>
             
             {applicationDoc && (
                 <button className="mt-4 w-full flex items-center justify-center gap-2 text-sm text-red-600 font-medium hover:bg-red-50 py-1.5 rounded transition-colors">
                    <Download size={14} /> Pobierz
                 </button>
             )}
        </div>
      </div>

      {/* ROW 2: MAIN WINDOWS (Parcels & Crops) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* WINDOW 1: PARCELS (Działki) */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col h-[400px]">
            <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                    <Layers className="text-emerald-600" size={20}/>
                    <h3 className="font-bold text-slate-800">Okno Działek ({selectedYear})</h3>
                </div>
                <button 
                    onClick={onManageFields}
                    className="text-sm text-emerald-600 hover:text-emerald-700 font-medium flex items-center"
                >
                    Pełna Ewidencja <ChevronRight size={16} />
                </button>
            </div>
            
            <div className="flex-1 overflow-auto pr-1">
                {farmData.fields.length > 0 ? (
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 uppercase text-xs sticky top-0 z-10">
                            <tr>
                                <th className="p-2 font-semibold bg-slate-50">Nr/Nazwa</th>
                                <th className="p-2 font-semibold bg-slate-50">Pow.</th>
                                <th className="p-2 font-semibold bg-slate-50">Uprawa w {selectedYear}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {farmData.fields.map(field => (
                                <tr key={field.id} className="hover:bg-slate-50">
                                    <td className="p-2 font-medium text-slate-700">
                                        <div className="truncate max-w-[120px]" title={field.name}>{field.name}</div>
                                        <span className="block text-xs text-slate-400 font-mono">{field.registrationNumber}</span>
                                    </td>
                                    <td className="p-2 text-slate-600">
                                        <div>{field.area.toFixed(2)}</div>
                                        {field.eligibleArea < field.area && (
                                            <div className="text-xs text-amber-600" title="Powierzchnia kwalifikowana">
                                                (kwal. {field.eligibleArea.toFixed(2)})
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-2">
                                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium border border-blue-100">
                                            {getCropForYear(field, selectedYear)}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 p-4">
                        <Layers size={32} className="mb-2 opacity-50"/>
                        <p className="text-sm">Brak zdefiniowanych działek</p>
                    </div>
                )}
            </div>
          </div>

          {/* WINDOW 2: CROPS (Zasiewy) */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col h-[400px]">
            <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                    <Sprout className="text-emerald-600" size={20}/>
                    <h3 className="font-bold text-slate-800">Okno Zasiewów ({selectedYear})</h3>
                </div>
                <button 
                    onClick={onManageFields}
                    className="text-sm text-emerald-600 hover:text-emerald-700 font-medium flex items-center"
                >
                    Zarządzaj <ChevronRight size={16} />
                </button>
            </div>

            <div className="flex-1 overflow-auto pr-1">
                 {sortedCrops.length > 0 ? (
                     <div className="space-y-4">
                        {sortedCrops.map(([crop, area]) => {
                            const percentage = ((area / totalArea) * 100).toFixed(1);
                            return (
                                <div key={crop} className="relative">
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1 bg-emerald-100 rounded text-emerald-700">
                                                <Sprout size={12} />
                                            </div>
                                            <span className="text-sm font-semibold text-slate-700">{crop}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-sm font-bold text-slate-800">{area.toFixed(2)} ha</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-emerald-500 rounded-full" 
                                                style={{ width: `${percentage}%` }}
                                            ></div>
                                        </div>
                                        <span className="text-xs text-slate-400 w-8 text-right">{percentage}%</span>
                                    </div>
                                </div>
                            );
                        })}
                     </div>
                 ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 p-4">
                        <PieChart size={32} className="mb-2 opacity-50"/>
                        <p className="text-sm">Brak danych o zasiewach dla roku {selectedYear}</p>
                    </div>
                 )}
            </div>
          </div>
      </div>

      {/* ROW 3: ARiMR NEWS (Independent of year) */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
                <div className="bg-red-600 text-white p-1 rounded">
                     <span className="font-bold text-xs tracking-wider">ARiMR</span>
                </div>
                <h3 className="font-bold text-slate-800">Komunikaty i Wiadomości</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { date: '12.09', title: 'Zmiana stawek płatności on-line', desc: 'Nowe rozporządzenie w sprawie stawek dla ekoschematu "Rolnictwo węglowe".' },
                    { date: '05.09', title: 'Rejestracja zwierząt w IRZplus', desc: 'Przypomnienie o terminach zgłaszania urodzeń i przemieszczeń bydła.' },
                    { date: '01.09', title: 'Nabór "Rolnictwo 4.0"', desc: 'Przedłużono termin składania wniosków na zakup sprzętu precyzyjnego.' }
                ].map((news, i) => (
                    <div key={i} className="group cursor-pointer">
                        <span className="text-xs font-bold text-slate-400 mb-1 block">{news.date}</span>
                        <h4 className="font-semibold text-slate-800 group-hover:text-emerald-600 transition-colors mb-1">{news.title}</h4>
                        <p className="text-sm text-slate-500 line-clamp-2">{news.desc}</p>
                    </div>
                ))}
            </div>
      </div>

    </div>
  );
};

const StatCard = ({ title, value, subtext, icon: Icon, color }: any) => {
    const colors: any = {
        blue: 'bg-blue-100 text-blue-600',
        emerald: 'bg-emerald-100 text-emerald-600',
        amber: 'bg-amber-100 text-amber-600',
        indigo: 'bg-indigo-100 text-indigo-600'
    };

    return (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
                <span className="text-slate-500 text-sm font-medium">{title}</span>
                <div className={`p-2 rounded-lg ${colors[color]}`}>
                    <Icon size={20} />
                </div>
            </div>
            <div className="text-2xl font-bold text-slate-800 mb-1">{value}</div>
            <div className="text-xs text-slate-400">{subtext}</div>
        </div>
    );
};

export default Dashboard;

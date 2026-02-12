
import React, { useState, useMemo } from 'react';
import { ArrowUpRight, Calendar, FileText, Sun, FileSpreadsheet, Map, File, ChevronRight, Layers, Sprout, PieChart, Download, AlertTriangle, CheckCircle, Search, Leaf, AlertOctagon, AlertCircle } from 'lucide-react';
import { FarmData, FarmerDocument, Field } from '../types';
import { analyzeFarmState } from '../services/farmLogic';

interface DashboardProps {
  farmData: FarmData;
  recentDocuments: FarmerDocument[];
  onViewAllDocuments: () => void;
  onManageFields: (tab?: 'PARCELS' | 'CROPS') => void;
}

const Dashboard: React.FC<DashboardProps> = ({ farmData, recentDocuments = [], onViewAllDocuments, onManageFields }) => {
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const availableYears = [2026, 2025, 2024, 2023, 2022, 2021];

  // 1. Logic to get crop for a specific year
  const getCropForYear = (field: Field, year: number): string => {
    if (year === 2026) {
        return field.crop || 'Nieznana';
    }
    const historyEntry = field.history?.find(h => h.year === year);
    // If we have crop parts, show "Mieszana" or the first one
    if (historyEntry?.cropParts && historyEntry.cropParts.length > 0) {
        return historyEntry.cropParts.length > 1 ? 'Wielu upraw' : historyEntry.cropParts[0].crop;
    }
    return historyEntry ? historyEntry.crop : 'Brak danych';
  };

  // 2. Calculate Stats & Analyze Logic
  const { totalArea, cropSummary, applicationDoc, analysisReport } = useMemo(() => {
    let areaSum = 0;
    const summary: Record<string, number> = {};

    // Basic Stats Calculation
    farmData.fields.forEach(field => {
        const hist = field.history?.find(h => h.year === selectedYear);
        
        // Check if this is a "Part" from crop structure (has designation). If so, we might skip it for total area if it's already counted in the main parcel
        // HOWEVER, for dashboard stats, we usually want unique parcels.
        // Assuming farmData.fields contains distinct parcels now (after import merge fix).
        
        // Use Eligible Area (PEG) as primary dimension if available, otherwise Geodetic Area
        let area = hist?.eligibleArea || hist?.area;
        
        if (area === undefined) {
            if (selectedYear === 2026) area = field.eligibleArea || field.area;
            else if (hist) area = field.eligibleArea || field.area;
            else area = 0;
        }
        
        // Only sum up if it's a root parcel (no designation) to avoid double counting if structure is mixed
        if (!hist || (!hist.designation && !hist.designationZal)) {
             areaSum += area;
        }

        const crop = getCropForYear(field, selectedYear);
        if (crop !== 'Nieznana' && crop !== 'Brak danych') {
            if (!summary[crop]) summary[crop] = 0;
            // For crop summary, we use the area of this specific entry
            summary[crop] += area;
        }
    });

    // Run Business Logic Analysis
    const report = analyzeFarmState(farmData, selectedYear);

    // Find PDF
    const appDoc = recentDocuments?.find(d => 
        (d.category === 'WNIOSEK' || d.type === 'PDF') && 
        d.campaignYear === selectedYear.toString()
    );

    return { 
        totalArea: areaSum, 
        cropSummary: summary,
        applicationDoc: appDoc,
        analysisReport: report
    };
  }, [farmData, selectedYear, recentDocuments]);

  const sortedCrops = (Object.entries(cropSummary) as [string, number][]).sort((a, b) => b[1] - a[1]);

  const getDeadlineInfo = (year: number) => {
      if (year === 2026) return { date: '15 Maja', desc: 'Termin składania wniosków podstawowych' };
      if (year === 2025) return { date: 'Zakończono', desc: 'Kampania zamknięta' };
      return { date: 'Archiwum', desc: 'Dane historyczne' };
  };
  const deadline = getDeadlineInfo(selectedYear);

  // Filter fields for "Okno Działek" - Only show purely Registry Parcels (no crop designations)
  const registryParcels = farmData.fields.filter(field => {
      const hist = field.history?.find(h => h.year === selectedYear);
      // Exclude if it has a designation (it's a crop part)
      if (hist && (hist.designation || hist.designationZal)) return false;
      // Exclude if no history exists for this year (unless it's the planning year)
      if (!hist && selectedYear !== 2026) return false;
      return true;
  });

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

      {/* SECTION: Carbon Farming Status (Rolnictwo Węglowe) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-emerald-50/50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <Leaf className="text-emerald-600" size={20} />
                  Status Rolnictwa Węglowego
              </h3>
              {analysisReport.isEntryConditionMet ? (
                  <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full flex items-center gap-1">
                      <CheckCircle size={14} /> Warunek Spełniony
                  </span>
              ) : (
                  <span className="text-xs font-bold bg-amber-100 text-amber-700 px-3 py-1 rounded-full flex items-center gap-1">
                      <AlertTriangle size={14} /> Poniżej progu
                  </span>
              )}
          </div>
          <div className="p-6">
              <div className="flex flex-col md:flex-row justify-between mb-2 text-sm">
                  <span className="text-slate-500">Zgromadzone punkty: <span className="font-bold text-slate-800 text-lg">{analysisReport.totalPoints.toFixed(1)} pkt</span></span>
                  <span className="text-slate-500">Wymagane minimum (25% UR): <span className="font-bold text-slate-800">{analysisReport.requiredPoints.toFixed(1)} pkt</span></span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-4 overflow-hidden mb-2">
                  <div 
                      className={`h-full rounded-full transition-all duration-500 ${analysisReport.isEntryConditionMet ? 'bg-gradient-to-r from-emerald-500 to-green-400' : 'bg-amber-400'}`}
                      style={{ width: `${Math.min((analysisReport.totalPoints / (analysisReport.requiredPoints || 1)) * 100, 100)}%` }}
                  ></div>
              </div>
              <p className="text-xs text-slate-400">
                  Przelicznik: 1 pkt ≈ 100 PLN. Szacowana wartość ekoschematów: <span className="font-bold text-emerald-600">{analysisReport.totalEstimatedValue.toLocaleString('pl-PL', {style:'currency', currency:'PLN'})}</span>
              </p>
          </div>
      </div>

      {/* SECTION: Validation Issues */}
      {analysisReport.validationIssues.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <h3 className="font-bold text-red-800 flex items-center gap-2 mb-3">
                  <AlertOctagon size={20} />
                  Walidacja Wniosku - Wykryte Błędy
              </h3>
              <div className="space-y-2">
                  {analysisReport.validationIssues.map((issue, idx) => (
                      <div key={idx} className="bg-white p-3 rounded-lg border border-red-100 shadow-sm flex gap-3 items-start">
                          {issue.type === 'ERROR' ? <AlertTriangle className="text-red-500 flex-shrink-0 mt-0.5" size={18}/> : <AlertCircle className="text-amber-500 flex-shrink-0 mt-0.5" size={18}/>}
                          <div>
                              <div className="font-semibold text-slate-800 text-sm">{issue.fieldName}</div>
                              <p className="text-sm text-slate-600">{issue.message}</p>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      )}

      {/* ROW 1: KEY METRICS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Powierzchnia UR (PEG)" 
          value={`${totalArea.toFixed(2)} ha`} 
          subtext={`Suma kwalifikowana (${selectedYear})`}
          icon={Map}
          color="blue"
        />
        <StatCard 
          title="Szacowane Dopłaty" 
          value={`~ ${(analysisReport.totalEstimatedValue + (totalArea * 500)).toLocaleString('pl-PL')} PLN`} 
          subtext="Podstawa + Ekoschematy"
          icon={ArrowUpRight}
          color="emerald"
        />
        <StatCard 
          title="Najbliższy Termin" 
          value={deadline.date} 
          subtext={deadline.desc}
          icon={Calendar}
          color="amber"
        />
        
        {/* PDF Application Card */}
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
          {/* WINDOW 1: PARCELS (FILTERED TO SHOW ONLY REGISTRY) */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col h-[400px]">
            <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                    <Layers className="text-emerald-600" size={20}/>
                    <h3 className="font-bold text-slate-800">Okno Działek ({selectedYear})</h3>
                </div>
                <button 
                    onClick={() => onManageFields('PARCELS')}
                    className="text-sm text-emerald-600 hover:text-emerald-700 font-medium flex items-center"
                >
                    Pełna Ewidencja <ChevronRight size={16} />
                </button>
            </div>
            
            <div className="flex-1 overflow-auto pr-1">
                {registryParcels.length > 0 ? (
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 uppercase text-xs sticky top-0 z-10">
                            <tr>
                                <th className="p-2 font-semibold bg-slate-50">Nr/Nazwa</th>
                                <th className="p-2 font-semibold bg-slate-50">Pow. PEG</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {registryParcels.map(field => {
                                const hist = field.history?.find(h => h.year === selectedYear);
                                // Display PEG (Eligible) if available
                                let area = hist?.eligibleArea || hist?.area || (selectedYear === 2026 ? (field.eligibleArea || field.area) : 0);
                                
                                return (
                                <tr key={field.id} className="hover:bg-slate-50">
                                    <td className="p-2 font-medium text-slate-700">
                                        <div className="truncate max-w-[120px]" title={field.name}>{field.name}</div>
                                        <span className="block text-xs text-slate-400 font-mono">{field.registrationNumber}</span>
                                    </td>
                                    <td className="p-2 text-slate-600">
                                        <div>{area.toFixed(2)}</div>
                                    </td>
                                </tr>
                                );
                            })}
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

          {/* WINDOW 2: CROPS */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col h-[400px]">
            <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                    <Sprout className="text-emerald-600" size={20}/>
                    <h3 className="font-bold text-slate-800">Struktura Zasiewów</h3>
                </div>
                <button 
                    onClick={() => onManageFields('CROPS')}
                    className="text-sm text-emerald-600 hover:text-emerald-700 font-medium flex items-center"
                >
                    Zarządzaj <ChevronRight size={16} />
                </button>
            </div>

            <div className="flex-1 overflow-auto pr-1">
                 {sortedCrops.length > 0 ? (
                     <div className="space-y-4">
                        {sortedCrops.map(([crop, area]) => {
                            const percentage = totalArea > 0 ? ((area / totalArea) * 100).toFixed(1) : "0.0";
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
                        <p className="text-sm">Brak zdefiniowanych upraw dla roku {selectedYear}</p>
                    </div>
                 )}
            </div>
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

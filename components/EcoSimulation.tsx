
import React, { useState, useMemo, useEffect } from 'react';
import { Calculator, Save, Info, CheckCircle, AlertTriangle, Wallet, Leaf, RefreshCw, Layers, ArrowRight, AlertCircle, XCircle } from 'lucide-react';
import { FarmData, Field, SubsidyRate, EcoSchemeCalculation, getCampaignStatus } from '../types';
import { SUBSIDY_RATES_2024, SUBSIDY_RATES_2025, SUBSIDY_RATES_2026 } from '../constants';

interface EcoSimulationProps {
    farmData: FarmData;
    selectedYear: number;
    onApplyPlan: (updatedFields: Field[]) => void;
}

const EcoSimulation: React.FC<EcoSimulationProps> = ({ farmData, selectedYear, onApplyPlan }) => {
    // Local copy of fields for simulation
    const [simulatedFields, setSimulatedFields] = useState<Field[]>([]);

    useEffect(() => {
        setSimulatedFields(JSON.parse(JSON.stringify(farmData.fields)));
    }, [farmData.fields]);

    const activeRates = useMemo(() => {
        if (selectedYear === 2026) return SUBSIDY_RATES_2026;
        if (selectedYear === 2025) return SUBSIDY_RATES_2025;
        return SUBSIDY_RATES_2024;
    }, [selectedYear]);

    const ecoSchemes = useMemo(() => {
        return activeRates.filter(r => r.category === 'EKOSCHEMAT' && r.shortName);
    }, [activeRates]);

    const { stats, conflicts } = useMemo(() => {
        let totalPoints = 0;
        let totalValue = 0;
        const schemeCalc: Record<string, { area: number; value: number; points: number }> = {};
        const detectedConflicts: { fieldName: string; part: string; schemes: string[] }[] = [];

        simulatedFields.forEach(field => {
            const hist = field.history.find(h => h.year === selectedYear);
            if (!hist) return;

            const parts = (hist.cropParts && hist.cropParts.length > 0)
                ? hist.cropParts
                : [{ area: hist.area || field.area, ecoSchemes: hist.appliedEcoSchemes, designation: 'A', crop: hist.crop }];

            parts.forEach(part => {
                // Conflict detection
                part.ecoSchemes.forEach(codeA => {
                    const rateA = activeRates.find(r => r.shortName === codeA);
                    if (rateA?.conflictsWith) {
                        rateA.conflictsWith.forEach(codeB => {
                            if (part.ecoSchemes.includes(codeB)) {
                                const alreadyExists = detectedConflicts.some(c => c.fieldName === field.name && c.part === part.designation && c.schemes.includes(codeA) && c.schemes.includes(codeB));
                                if (!alreadyExists) {
                                    detectedConflicts.push({ fieldName: field.name, part: part.designation, schemes: [codeA, codeB] });
                                }
                            }
                        });
                    }
                });

                // Calculation
                part.ecoSchemes.forEach(code => {
                    const rate = activeRates.find(r => r.shortName === code);
                    if (!rate) return;

                    if (!schemeCalc[code]) schemeCalc[code] = { area: 0, value: 0, points: 0 };

                    const area = part.area;
                    schemeCalc[code].area += area;

                    if (rate.points) {
                        const pts = area * rate.points;
                        schemeCalc[code].points += pts;
                        schemeCalc[code].value += pts * 100; // Approx 100 PLN per point
                        totalPoints += pts;
                        totalValue += pts * 100;
                    } else {
                        const val = area * rate.rate;
                        schemeCalc[code].value += val;
                        totalValue += val;
                    }
                });
            });
        });

        const requiredPoints = (farmData.profile.totalAreaUR * 0.25) * 5.0;

        return {
            stats: {
                totalPoints,
                totalValue,
                requiredPoints,
                isMet: totalPoints >= requiredPoints,
                schemes: Object.entries(schemeCalc).map(([code, data]) => ({ code, ...data }))
            },
            conflicts: detectedConflicts
        };
    }, [simulatedFields, selectedYear, activeRates, farmData.profile.totalAreaUR]);

    const toggleScheme = (fieldId: string, partIdx: number, schemeCode: string) => {
        setSimulatedFields(prev => {
            const next = [...prev];
            const fIdx = next.findIndex(f => f.id === fieldId);
            if (fIdx === -1) return prev;

            const hIdx = next[fIdx].history.findIndex(h => h.year === selectedYear);
            if (hIdx === -1) return prev;

            if (!next[fIdx].history[hIdx].cropParts) {
                next[fIdx].history[hIdx].cropParts = [{
                    designation: 'A',
                    crop: next[fIdx].history[hIdx].crop,
                    area: next[fIdx].history[hIdx].area || next[fIdx].area,
                    ecoSchemes: [...next[fIdx].history[hIdx].appliedEcoSchemes]
                }];
            }

            const currentSchemes = next[fIdx].history[hIdx].cropParts![partIdx].ecoSchemes;
            if (currentSchemes.includes(schemeCode)) {
                next[fIdx].history[hIdx].cropParts![partIdx].ecoSchemes = currentSchemes.filter(s => s !== schemeCode);
            } else {
                next[fIdx].history[hIdx].cropParts![partIdx].ecoSchemes = [...currentSchemes, schemeCode];
            }

            next[fIdx].history[hIdx].appliedEcoSchemes = Array.from(new Set(
                next[fIdx].history[hIdx].cropParts!.flatMap(p => p.ecoSchemes)
            ));

            return next;
        });
    };

    const isConflicted = (fieldId: string, partIdx: number, code: string) => {
        const field = simulatedFields.find(f => f.id === fieldId);
        const hist = field?.history.find(h => h.year === selectedYear);
        const part = hist?.cropParts?.[partIdx];
        if (!part) return false;

        const rate = activeRates.find(r => r.shortName === code);
        return rate?.conflictsWith?.some(forbidden => part.ecoSchemes.includes(forbidden));
    };

    const resetSimulation = () => {
        if (window.confirm("Czy na pewno chcesz zresetować symulację do danych z bazy?")) {
            setSimulatedFields(JSON.parse(JSON.stringify(farmData.fields)));
        }
    };

    return (
        <div className="space-y-6">
            {/* STICKY SUMMARY HEADER */}
            <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 -mx-4 md:-mx-8 px-4 md:px-8 py-4 shadow-sm mb-6">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-2xl ${stats.isMet ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                            <Calculator size={32} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-xl font-black text-slate-800">Symulator Ekoschematów {selectedYear}</h2>
                                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${getCampaignStatus(selectedYear).color}`}>
                                    {getCampaignStatus(selectedYear).label}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Planowanie optymalnych dopłat</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-8">
                        <div className="text-center">
                            <p className="text-[10px] font-black text-slate-400 uppercase">Szacowany Zysk</p>
                            <p className="text-2xl font-black text-emerald-600">~{stats.totalValue.toLocaleString()} <span className="text-sm">PLN</span></p>
                        </div>
                        <div className="text-center border-x border-slate-100 px-8">
                            <p className="text-[10px] font-black text-slate-400 uppercase">Zgromadzone Punkty</p>
                            <div className="flex items-center gap-2">
                                <p className={`text-2xl font-black ${stats.isMet ? 'text-emerald-600' : 'text-amber-500'}`}>
                                    {stats.totalPoints.toFixed(1)} <span className="text-sm">pkt</span>
                                </p>
                                <span className="text-slate-300 text-xs font-bold">/ {stats.requiredPoints.toFixed(1)}</span>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={resetSimulation} className="p-2 text-slate-400 hover:text-slate-600 transition-colors" title="Resetuj"><RefreshCw size={20} /></button>
                            <button
                                onClick={() => onApplyPlan(simulatedFields)}
                                disabled={conflicts.length > 0}
                                className={`px-6 py-2.5 rounded-xl font-black text-sm flex items-center gap-2 transition-all shadow-lg active:scale-95 ${conflicts.length > 0
                                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                                    : 'bg-slate-900 text-white hover:bg-black'
                                    }`}
                            >
                                <Save size={18} /> Zastosuj Plan
                            </button>
                        </div>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto mt-4">
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
                        <div
                            className={`h-full transition-all duration-500 ${stats.isMet ? 'bg-emerald-500' : 'bg-amber-400'}`}
                            style={{ width: `${Math.min((stats.totalPoints / (stats.requiredPoints || 1)) * 100, 100)}%` }}
                        ></div>
                    </div>
                </div>
                {getCampaignStatus(selectedYear).type !== 'DRAFT' && (
                    <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex items-center gap-4 animate-in fade-in slide-in-from-top-4 mt-6">
                        <Info size={24} className="text-blue-600 flex-shrink-0" />
                        <div>
                            <h4 className="font-bold text-blue-800 text-sm">Tryb Podglądu Historycznego</h4>
                            <p className="text-xs text-blue-700">Symulujesz ekoschematy dla kampanii o statusie <strong>{getCampaignStatus(selectedYear).label}</strong>. Zmiany nie wpłyną na bieżący wniosek (2026).</p>
                        </div>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* FIELDS LIST */}
                <div className="lg:col-span-2 space-y-4">
                    {conflicts.length > 0 && (
                        <div className="bg-red-50 border-2 border-red-200 p-4 rounded-2xl flex items-start gap-4 animate-in fade-in slide-in-from-top-4">
                            <XCircle className="text-red-600 mt-1 flex-shrink-0" size={24} />
                            <div>
                                <h4 className="font-black text-red-800 text-sm uppercase tracking-wider">Wykryto kolizje ekoschematów!</h4>
                                <p className="text-red-700 text-sm mb-2">Poniższe połączenia są niedozwolone przez ARiMR. Musisz usunąć jeden z nich, aby móc zapisać plan.</p>
                                <div className="space-y-1">
                                    {conflicts.map((c, i) => (
                                        <div key={i} className="text-xs font-bold text-red-600 flex items-center gap-2">
                                            <ArrowRight size={12} /> {c.fieldName} (cz. {c.part}): {c.schemes.join(' + ')}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex items-center justify-between px-2">
                        <h3 className="font-black text-slate-700 uppercase text-xs tracking-widest flex items-center gap-2">
                            <Layers size={14} className="text-emerald-600" />
                            Działki w symulacji
                        </h3>
                    </div>

                    {simulatedFields.filter(f => f.history.some(h => h.year === selectedYear)).map(field => {
                        const hist = field.history.find(h => h.year === selectedYear)!;
                        const parts = hist.cropParts || [{ designation: 'A', crop: hist.crop, area: hist.area || field.area, ecoSchemes: hist.appliedEcoSchemes }];

                        return (
                            <div key={field.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden group hover:border-emerald-200 transition-all">
                                <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
                                    <div>
                                        <h4 className="font-bold text-slate-800">{field.name}</h4>
                                        <p className="text-[10px] font-mono text-slate-400">{field.registrationNumber} • {field.area} ha PEG</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-slate-700">{hist.crop}</p>
                                    </div>
                                </div>

                                <div className="p-4 space-y-4">
                                    {parts.map((part, pIdx) => (
                                        <div key={pIdx} className="space-y-3">
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="bg-slate-800 text-white px-2 py-0.5 rounded font-black">Część {part.designation}</span>
                                                <span className="font-bold text-slate-500">{part.area.toFixed(2)} ha</span>
                                            </div>

                                            <div className="flex flex-wrap gap-2">
                                                {ecoSchemes.map(eco => {
                                                    const isSelected = part.ecoSchemes.includes(eco.shortName!);
                                                    const hasConflict = !isSelected && isConflicted(field.id, pIdx, eco.shortName!);

                                                    return (
                                                        <button
                                                            key={eco.id}
                                                            onClick={() => toggleScheme(field.id, pIdx, eco.shortName!)}
                                                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tight transition-all border flex items-center gap-1.5 ${isSelected
                                                                ? 'bg-emerald-600 border-emerald-600 text-white shadow-md hover:bg-emerald-700'
                                                                : hasConflict
                                                                    ? 'bg-red-50 border-red-200 text-red-400 cursor-help ring-2 ring-red-100 ring-offset-2 animate-pulse'
                                                                    : 'bg-white border-slate-200 text-slate-400 hover:border-emerald-300 hover:text-emerald-600'
                                                                }`}
                                                            title={hasConflict ? "Ten ekoschemat wyklucza się z już wybranym na tym polu" : ""}
                                                        >
                                                            {hasConflict && <AlertCircle size={12} />}
                                                            {eco.shortName}
                                                            {isSelected && <span className="opacity-70">• {((eco.points || 0) * part.area).toFixed(1)} pkt</span>}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* SIDEBAR */}
                <div className="space-y-6">
                    <div className="bg-emerald-900 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/20 rounded-full blur-2xl -mr-16 -mt-16"></div>
                        <h3 className="text-lg font-black mb-4 flex items-center gap-2">
                            <Leaf size={20} />
                            Podsumowanie
                        </h3>

                        <div className="space-y-4 relative z-10">
                            {stats.schemes.length === 0 ? (
                                <p className="text-emerald-200 text-sm italic">Wybierz ekoschematy na działkach, aby zobaczyć wyliczenia.</p>
                            ) : (
                                stats.schemes.map(s => (
                                    <div key={s.code} className="flex justify-between items-end border-b border-emerald-800 pb-2">
                                        <div>
                                            <p className="text-[10px] font-black text-emerald-400 uppercase">{s.code}</p>
                                            <p className="text-xs font-bold">{s.area.toFixed(2)} ha</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-black">{s.value.toLocaleString()} PLN</p>
                                            <p className="text-[10px] opacity-60">{s.points.toFixed(1)} pkt</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                        <h3 className="font-black text-slate-800 mb-4 flex items-center gap-2 text-sm uppercase tracking-widest">
                            <Info size={16} className="text-blue-500" />
                            Walidacja Wykluczeń
                        </h3>
                        <div className="space-y-4">
                            {conflicts.length === 0 ? (
                                <div className="flex gap-3 text-sm text-emerald-700 bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                                    <CheckCircle size={18} className="flex-shrink-0" />
                                    <p>Brak konfliktów. Wszystkie wybrane praktyki można łączyć na zadeklarowanych polach.</p>
                                </div>
                            ) : (
                                <div className="flex gap-3 text-sm text-red-700 bg-red-50 p-3 rounded-xl border border-red-100">
                                    <AlertTriangle size={18} className="flex-shrink-0" />
                                    <p>Uwaga: Niektóre praktyki (np. <strong>{conflicts[0].schemes.join(' oraz ')}</strong>) nie mogą być realizowane jednocześnie na tej samej powierzchni.</p>
                                </div>
                            )}

                            <div className="p-3 bg-blue-50 rounded-xl text-xs text-blue-700 font-medium border border-blue-100">
                                <p className="font-bold mb-1">Zasada łączenia:</p>
                                <ul className="list-disc ml-4 space-y-1">
                                    <li>E_OBOR wyklucza się z E_GNOJ</li>
                                    <li>E_USU wyklucza się z E_SLOM</li>
                                    <li>Zasiewy muszą być zgodne z ewidencją PEG</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EcoSimulation;




import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ArrowUpRight, Calendar, FileText, Sun, Map, ChevronRight, Layers, Sprout, PieChart, Download, AlertTriangle, CheckCircle, Leaf, AlertOctagon, X, Wallet, Info, UploadCloud, Loader2, Database, AlertCircle } from 'lucide-react';
import { FarmData, FarmerDocument, Field, EcoSchemeCalculation, SubsidyRate, getCampaignStatus } from '../types';
import { analyzeFarmState } from '../services/farmLogic';
import { api } from '../services/api';
import { extractRawText } from '../services/geminiService';
import { ragEngine } from '../services/ragEngine';

interface DashboardProps {
    farmData: FarmData;
    recentDocuments: FarmerDocument[];
    onViewAllDocuments: () => void;
    onManageFields: (tab?: 'PARCELS' | 'CROPS') => void;
    selectedYear: number;
    setSelectedYear: (year: number) => void;
    onAddDocument: (doc: FarmerDocument) => void;
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
                setAllRates(rates);
            } catch (e) {
                console.error("Błąd pobierania stawek do kalkulacji");
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
        hasDataInOtherYears,
        totalBasicSubsidy,
        grandTotalSubsidy,
        registryParcels
    } = useMemo(() => {
        const summary: Record<string, number> = {};
        let otherYears = false;
        let areaSum = 0;

        const validRegistry: Field[] = [];

        farmData.fields.forEach(field => {
            const histForSelected = field.history?.find(h => h.year === selectedYear);
            if (field.history?.some(h => h.year !== selectedYear)) otherYears = true;

            if (!histForSelected) return;

            const currentPeg = histForSelected.eligibleArea || 0;
            areaSum += currentPeg;

            if (currentPeg > 0) {
                validRegistry.push(field);
            }

            if (histForSelected.cropParts && histForSelected.cropParts.length > 0) {
                histForSelected.cropParts.forEach(part => {
                    const cropName = part.crop || 'Nieznana';
                    if (cropName !== 'Nieznana' && cropName !== 'Brak danych') {
                        if (!summary[cropName]) summary[cropName] = 0;
                        summary[cropName] += (part.area || 0);
                    }
                });
            } else {
                const cropName = histForSelected.crop || 'Nieznana';
                if (cropName !== 'Nieznana' && cropName !== 'Brak danych') {
                    if (!summary[cropName]) summary[cropName] = 0;
                    summary[cropName] += (histForSelected.area || field.area || 0);
                }
            }
        });

        const report = analyzeFarmState({ ...farmData, profile: { ...farmData.profile, totalAreaUR: areaSum } }, selectedYear);

        const appDoc = recentDocuments?.find(d =>
            (d.category === 'WNIOSEK' || d.type === 'PDF') &&
            d.campaignYear === selectedYear.toString()
        );

        const yearRates = allRates.filter(r => r.year === selectedYear);

        const bwsRateObj = yearRates.find(r => r.category === 'DOPLATA' && r.name.toLowerCase().includes('podstawowe')) || { rate: 0, unit: 'PLN/ha' as const };
        const redRateObj = yearRates.find(r => r.category === 'DOPLATA' && r.name.toLowerCase().includes('redystrybucyjna')) || { rate: 0, unit: 'PLN/ha' as const };
        const uppRateObj = yearRates.find(r => r.category === 'DOPLATA' && r.name.toLowerCase().includes('uzupełniająca')) || { rate: 0, unit: 'PLN/ha' as const };

        const bwsRate = bwsRateObj.rate || 0;
        const redRate = redRateObj.rate || 0;
        const uppRate = uppRateObj.rate || 0;

        const bwsTotal = areaSum * bwsRate;
        const redArea = Math.min(areaSum, 30);
        const redTotal = redArea * redRate;
        const uppTotal = areaSum * uppRate;

        const basicBreakdown = [
            { name: 'Podstawowe wsparcie dochodów (BWS)', rate: bwsRate, unit: bwsRateObj.unit || 'PLN/ha', amount: areaSum, total: bwsTotal },
            { name: 'Płatność redystrybucyjna (do 30 ha)', rate: redRate, unit: redRateObj.unit || 'PLN/ha', amount: redArea, total: redTotal },
            { name: 'Uzupełniająca płatność podstawowa (UPP)', rate: uppRate, unit: uppRateObj.unit || 'PLN/ha', amount: areaSum, total: uppTotal }
        ];

        const basicSum: number = basicBreakdown.reduce((sum: number, item: any) => sum + (Number(item.total) || 0), 0);
        const totalEstValue: number = Number(report.totalEstimatedValue) || 0;
        const grandTotal: number = (basicSum as number) + (totalEstValue as number);

        const sortedRegistry = validRegistry.sort((a, b) => (a.registrationNumber || '').localeCompare(b.registrationNumber || ''));

        return {
            totalArea: areaSum,
            cropSummary: summary,
            applicationDoc: appDoc,
            analysisReport: report,
            basicPaymentsBreakdown: basicBreakdown,
            hasDataInOtherYears: otherYears && areaSum === 0,
            totalBasicSubsidy: basicSum,
            grandTotalSubsidy: grandTotal,
            registryParcels: sortedRegistry
        };
    }, [farmData, selectedYear, recentDocuments, allRates]);

    const sortedCrops = (Object.entries(cropSummary) as [string, number][]).sort((a, b) => b[1] - a[1]);

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

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            setIsUploading(true);
            setUploadError(null);

            try {
                const base64 = await fileToBase64(file);

                // OCR — opcjonalny, nie blokuje zapisu dokumentu
                let extractedText = '';
                try {
                    extractedText = await extractRawText(base64, file.type);
                } catch (ocrError) {
                    console.warn("OCR nie powiódł się, dokument zostanie zapisany bez tekstu:", ocrError);
                }

                const newDoc: FarmerDocument = {
                    id: Math.random().toString(36).substr(2, 9),
                    name: file.name,
                    type: file.name.split('.').pop()?.toUpperCase() as any || 'PDF',
                    category: 'WNIOSEK',
                    campaignYear: selectedYear.toString(),
                    size: `${(file.size / 1024).toFixed(2)} KB`,
                    uploadDate: new Date().toISOString().split('T')[0],
                    extractedText: extractedText || undefined
                };

                // Indeksowanie w bazie RAG — opcjonalne
                if (extractedText) {
                    try {
                        await ragEngine.indexDocument(newDoc, extractedText);
                    } catch (ragError) {
                        console.warn("Indeksowanie RAG nie powiodło się:", ragError);
                    }
                }

                onAddDocument(newDoc);

            } catch (error) {
                console.error("Error processing document:", error);
                setUploadError("Wystąpił błąd podczas wczytywania pliku. Spróbuj ponownie.");
            } finally {
                setIsUploading(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        }
    };

    const getDeadlineInfo = (year: number) => {
        if (year === 2026) return { date: '15 Maja', desc: 'Termin składania wniosków' };
        if (year === 2025) return { date: 'Zakończono', desc: 'Kampania zamknięta' };
        return { date: 'Archiwum', desc: 'Dane historyczne' };
    };
    const deadline = getDeadlineInfo(selectedYear);

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
                    <p className="text-slate-500 font-medium">Klient: <span className="text-emerald-600 font-bold">{farmData.farmName || 'Gospodarstwo'}</span></p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="hidden md:flex items-center space-x-2 bg-yellow-50 text-yellow-700 px-4 py-2 rounded-full border border-yellow-200 text-sm font-medium shadow-sm">
                        <Sun size={16} className="animate-pulse" />
                        <span>Dziś: 22°C</span>
                    </div>

                    <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl shadow-inner px-4 py-2 gap-3">
                        <Calendar size={18} className="text-slate-400" />
                        <span className="text-xs font-black text-slate-400 uppercase tracking-tighter">Kampania:</span>
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                            className="bg-transparent font-black text-slate-800 focus:outline-none cursor-pointer text-sm"
                        >
                            {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${getCampaignStatus(selectedYear).color}`}>
                            {getCampaignStatus(selectedYear).label}
                        </span>
                    </div>
                </div>
            </div>

            {hasDataInOtherYears && (
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-center gap-4 animate-bounce shadow-sm">
                    <div className="bg-amber-100 p-2 rounded-lg text-amber-600">
                        <AlertOctagon size={24} />
                    </div>
                    <div className="flex-1">
                        <h4 className="font-black text-amber-800 text-sm">Uwaga: Brak danych dla roku {selectedYear}</h4>
                        <p className="text-xs text-amber-700">W bazie znajdują się dane dla innych lat kampanii. Przełącz rok w prawym górnym rogu.</p>
                    </div>
                </div>
            )}

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
                        <span className="text-slate-500 font-medium">Zgromadzone punkty: <span className="font-black text-slate-800 text-xl ml-1">{(Number(analysisReport.totalPoints) || 0).toFixed(1)} pkt</span></span>
                        <span className="text-slate-500 font-medium">Wymagane minimum (25% UR): <span className="font-bold text-slate-800 ml-1">{(Number(analysisReport.requiredPoints) || 0).toFixed(1)} pkt</span></span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-4 overflow-hidden mb-2 shadow-inner">
                        <div
                            className={`h-full rounded-full transition-all duration-700 ${analysisReport.isEntryConditionMet ? 'bg-gradient-to-r from-emerald-500 to-green-400' : 'bg-amber-400'}`}
                            style={{ width: `${Math.min((Number(analysisReport.totalPoints) / (Number(analysisReport.requiredPoints) || 1)) * 100, 100)}%` }}
                        ></div>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Szacowana wartość ekoschematów: <span className="font-black text-emerald-600">{(Number(analysisReport.totalEstimatedValue) || 0).toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' })}</span>
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Powierzchnia UR (PEG)"
                    value={`${totalArea.toFixed(2)} ha`}
                    subtext={`Suma matematyczna (${selectedYear})`}
                    icon={Map}
                    color="blue"
                />
                <StatCard
                    title="Szacowane Dopłaty"
                    value={isLoadingRates ? "..." : `~ ${(Number(grandTotalSubsidy) || 0).toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} PLN`}
                    subtext="Podstawa + Ekoschematy"
                    icon={ArrowUpRight}
                    color="emerald"
                    onClick={() => setShowSubsidyDetails(true)}
                    isInteractive
                />
                <StatCard
                    title="Najbliższy Termin"
                    value={deadline.date}
                    subtext={deadline.desc}
                    icon={Calendar}
                    color="amber"
                />

                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between relative overflow-hidden group/doc">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-red-50 rounded-bl-full -mr-4 -mt-4 z-0 transition-all group-hover/doc:w-20 group-hover/doc:h-20"></div>
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-slate-500 text-xs font-black uppercase tracking-widest">E-Wniosek</span>
                            {isUploading ? <Loader2 size={20} className="text-emerald-500 animate-spin" /> : <FileText size={20} className={`transition-colors ${applicationDoc ? 'text-emerald-600' : 'text-red-500'}`} />}
                        </div>
                        {applicationDoc ? (
                            <div>
                                <div className="text-lg font-bold text-slate-800 truncate mb-1" title={applicationDoc.name}>
                                    {applicationDoc.name}
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
                                        <CheckCircle size={10} /> Przyjęto
                                    </span>
                                    <span className="text-xs text-slate-400">{applicationDoc.uploadDate}</span>
                                </div>
                            </div>
                        ) : (
                            <div
                                className={`cursor-pointer transition-all ${isUploading ? 'opacity-50' : 'hover:scale-[1.02]'}`}
                                onClick={() => !isUploading && fileInputRef.current?.click()}
                            >
                                <div className={`text-lg font-bold italic mb-1 flex items-center gap-2 ${uploadError ? 'text-red-400' : 'text-slate-400'}`}>
                                    {isUploading ? 'Wczytywanie...' : (uploadError ? 'Błąd' : 'Brak pliku')}
                                    {!isUploading && <UploadCloud size={16} className={uploadError ? 'text-red-300' : 'text-slate-300'} />}
                                </div>
                                <div className="flex flex-col gap-1 text-xs text-slate-400 font-medium">
                                    {uploadError ? (
                                        <span className="text-red-500 flex items-center gap-1"><AlertTriangle size={12} /> {uploadError}</span>
                                    ) : (
                                        <span className="flex items-center gap-1"><AlertTriangle size={12} className="text-amber-500" /> Wczytaj dokument PDF</span>
                                    )}
                                </div>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept=".pdf"
                                    onChange={handleFileUpload}
                                />
                            </div>
                        )}
                    </div>
                    {applicationDoc && (
                        <button className="mt-4 w-full flex items-center justify-center gap-2 text-xs text-emerald-600 font-black uppercase tracking-widest hover:bg-emerald-50 py-1.5 rounded transition-colors border border-emerald-100">
                            <Download size={14} /> Pobierz
                        </button>
                    )}
                    {!applicationDoc && !isUploading && (
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className={`mt-4 w-full flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest py-2 rounded-lg border transition-all shadow-sm ${uploadError ? 'bg-red-50 text-red-600 border-red-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100'}`}
                        >
                            <UploadCloud size={14} /> {uploadError ? 'Spróbuj ponownie' : 'Wczytaj e-Wniosek'}
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col h-[400px]">
                    <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2">
                            <Layers className="text-emerald-600" size={20} />
                            <h3 className="font-bold text-slate-800">Okno Działek ({selectedYear})</h3>
                        </div>
                        <button onClick={() => onManageFields('PARCELS')} className="text-xs text-emerald-600 hover:text-emerald-700 font-black uppercase tracking-widest flex items-center">
                            Zarządzaj <ChevronRight size={16} />
                        </button>
                    </div>
                    <div className="flex-1 overflow-auto pr-1">
                        {registryParcels.length > 0 ? (
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-black sticky top-0 z-10">
                                    <tr>
                                        <th className="p-2 bg-slate-50">Nr/Nazwa</th>
                                        <th className="p-2 bg-slate-50 text-right">Pow. PEG</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {registryParcels.map(field => {
                                        const hist = field.history?.find(h => h.year === selectedYear);
                                        let area = hist?.eligibleArea || 0;
                                        return (
                                            <tr key={field.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="p-2 font-medium text-slate-700">
                                                    <div className="truncate max-w-[150px]" title={field.name}>{field.name}</div>
                                                    <span className="block text-[10px] text-slate-400 font-mono">{field.registrationNumber}</span>
                                                </td>
                                                <td className="p-2 text-right text-slate-600 font-mono font-bold text-emerald-600">{area.toFixed(2)} ha</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 p-4">
                                <Layers size={32} className="mb-2 opacity-30" />
                                <p className="text-sm text-center font-medium">Brak danych ewidencji na rok {selectedYear}.</p>
                                <p className="text-[10px] text-slate-300 text-center mt-1 uppercase font-black">Użyj Menedżera Pól</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col h-[400px]">
                    <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2">
                            <Sprout className="text-emerald-600" size={20} />
                            <h3 className="font-bold text-slate-800">Struktura Zasiewów</h3>
                        </div>
                        <button onClick={() => onManageFields('CROPS')} className="text-xs text-emerald-600 hover:text-emerald-700 font-black uppercase tracking-widest flex items-center">
                            Zarządzaj <ChevronRight size={16} />
                        </button>
                    </div>
                    <div className="flex-1 overflow-auto pr-1">
                        {sortedCrops.length > 0 ? (
                            <div className="space-y-4">
                                {sortedCrops.map(([crop, area]) => {
                                    const totalCropArea = Object.values(cropSummary).reduce<number>((acc, val) => acc + (val as number), 0);
                                    const percentage = totalCropArea > 0 ? ((area / totalCropArea) * 100).toFixed(1) : "0.0";
                                    return (
                                        <div key={crop} className="relative">
                                            <div className="flex items-center justify-between mb-1">
                                                <div className="flex items-center gap-2">
                                                    <div className="p-1 bg-emerald-50 rounded text-emerald-600 border border-emerald-100"><Sprout size={12} /></div>
                                                    <span className="text-sm font-bold text-slate-700">{crop}</span>
                                                </div>
                                                <span className="text-sm font-black text-slate-800 font-mono">{area.toFixed(2)} ha</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                                                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${percentage}%` }}></div>
                                                </div>
                                                <span className="text-[10px] text-slate-400 w-8 text-right font-black">{percentage}%</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 p-4">
                                <PieChart size={32} className="mb-2 opacity-30" />
                                <p className="text-sm text-center font-medium">Brak upraw na rok {selectedYear}.</p>
                                <p className="text-[10px] text-slate-300 text-center mt-1 uppercase font-black">Użyj Menedżera Pól</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {showSubsidyDetails && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200">
                        <div className="bg-emerald-700 p-8 text-white flex justify-between items-center relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                            <div className="flex items-center gap-4 relative z-10">
                                <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                                    <Wallet size={32} />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black tracking-tight">Kalkulacja Płatności</h3>
                                    <p className="text-emerald-100 text-xs font-black uppercase tracking-widest opacity-80">Symulacja kampanii {selectedYear}</p>
                                </div>
                            </div>
                            <button onClick={() => setShowSubsidyDetails(false)} className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition-all hover:rotate-90 relative z-10">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 space-y-10 bg-slate-50/50">
                            <section>
                                <div className="flex items-center gap-3 mb-4">
                                    <CheckCircle size={24} className="text-emerald-600" />
                                    <h4 className="text-xl font-bold text-slate-800">Płatności Bezpośrednie</h4>
                                </div>
                                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-slate-100 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-black tracking-wider">
                                            <tr>
                                                <th className="p-4">Nazwa Płatności</th>
                                                <th className="p-4 text-right">Stawka</th>
                                                <th className="p-4 text-right">Powierzchnia</th>
                                                <th className="p-4 text-right">Suma (PLN)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {basicPaymentsBreakdown.map((item: any, idx: number) => (
                                                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                                    <td className="p-4 font-bold text-slate-700">{item.name}</td>
                                                    <td className="p-4 text-right text-slate-500 font-mono">{Number(item.rate).toFixed(2)} {item.unit}</td>
                                                    <td className="p-4 text-right text-slate-500 font-mono">{Number(item.amount).toFixed(2)} ha</td>
                                                    <td className="p-4 text-right font-black text-slate-900">{Number(item.total).toLocaleString('pl-PL', { minimumFractionDigits: 2 })}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="bg-emerald-50 font-black border-t-2 border-emerald-100">
                                            <tr>
                                                <td colSpan={3} className="p-4 text-right text-emerald-800 uppercase text-xs tracking-widest">Suma Płatności Podstawowych:</td>
                                                <td className="p-4 text-right text-emerald-900 text-lg font-black">{(Number(totalBasicSubsidy) || 0).toLocaleString('pl-PL', { minimumFractionDigits: 2 })} PLN</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </section>

                            <section>
                                <div className="flex items-center gap-3 mb-4">
                                    <Leaf size={24} className="text-emerald-600" />
                                    <h4 className="text-xl font-bold text-slate-800">Ekoschematy (Zasiewy)</h4>
                                </div>
                                {analysisReport.ecoSchemes.length > 0 ? (
                                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-slate-100 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-black tracking-wider">
                                                <tr>
                                                    <th className="p-4">Kod</th>
                                                    <th className="p-4 text-right">Punkty/ha</th>
                                                    <th className="p-4 text-right">Deklaracja</th>
                                                    <th className="p-4 text-right">Suma (PLN)</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {analysisReport.ecoSchemes.map((eco: EcoSchemeCalculation, idx: number) => {
                                                    const pts: number = Number(eco.totalPoints) || 0;
                                                    const ecoArea: number = Number(eco.totalArea) || 0;
                                                    const ecoVal: number = Number(eco.estimatedValue) || 0;

                                                    return (
                                                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                                            <td className="p-4">
                                                                <span className="bg-emerald-600 text-white px-2.5 py-1 rounded-lg text-xs font-black shadow-sm">{eco.schemeCode}</span>
                                                            </td>
                                                            <td className="p-4 text-right text-slate-500 font-mono">
                                                                {(pts > 0 && ecoArea > 0) ? `${(pts / ecoArea).toFixed(1)} pkt` : '-'}
                                                            </td>
                                                            <td className="p-4 text-right text-slate-500 font-mono">{ecoArea.toFixed(2)} ha</td>
                                                            <td className="p-4 text-right font-black text-slate-900">{ecoVal.toLocaleString('pl-PL', { minimumFractionDigits: 2 })}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                            <tfoot className="bg-emerald-50 font-black border-t-2 border-emerald-100">
                                                <tr>
                                                    <td colSpan={3} className="p-4 text-right text-emerald-800 uppercase text-xs tracking-widest">Suma Ekoschematów:</td>
                                                    <td className="p-4 text-right text-emerald-900 text-lg font-black">{(Number(analysisReport.totalEstimatedValue) || 0).toLocaleString('pl-PL', { minimumFractionDigits: 2 })} PLN</td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="p-10 text-center bg-white border-2 border-dashed border-slate-200 rounded-3xl text-slate-400">
                                        <div className="mx-auto mb-4 opacity-40">
                                            <Info size={40} />
                                        </div>
                                        <p className="font-medium">Brak przypisanych ekoschematów w kampanii {selectedYear}.</p>
                                    </div>
                                )}
                            </section>

                            <div className="p-10 bg-gradient-to-br from-emerald-800 to-teal-900 rounded-[2.5rem] text-white shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8 border-4 border-emerald-600/30 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl group-hover:scale-110 transition-transform duration-700"></div>
                                <div className="relative z-10">
                                    <p className="text-emerald-300 uppercase tracking-[0.2em] text-[10px] font-black mb-2">Szacowana Wypłata Łączna</p>
                                    <h3 className="text-5xl font-black tracking-tighter">{(Number(grandTotalSubsidy) || 0).toLocaleString('pl-PL', { minimumFractionDigits: 2 })} <span className="text-2xl font-light opacity-60">PLN</span></h3>
                                </div>
                                <div className="bg-white/10 backdrop-blur-xl p-6 rounded-3xl border border-white/20 text-center md:text-right relative z-10 shadow-inner">
                                    <p className="text-xs text-emerald-100/70 mb-1 font-bold">Średnia dopłata:</p>
                                    <p className="text-3xl font-black">{(Number(grandTotalSubsidy) / (Number(totalArea) || 1)).toLocaleString('pl-PL', { minimumFractionDigits: 0 })} <span className="text-sm font-medium opacity-60">zł/ha</span></p>
                                </div>
                            </div>
                        </div>

                        <div className="p-8 border-t border-slate-100 bg-white flex flex-col md:flex-row justify-between items-center gap-4">
                            <p className="text-[10px] text-slate-400 italic max-w-md text-center md:text-left font-medium uppercase tracking-tighter">
                                * Wyliczenia oparte na danych słownikowych dla kampanii {selectedYear}. Kwoty zależą od poprawności konfiguracji stawek w panelu admina.
                            </p>
                            <button onClick={() => setShowSubsidyDetails(false)} className="w-full md:w-auto bg-slate-900 hover:bg-black text-white px-10 py-3 rounded-2xl font-black transition-all shadow-lg active:scale-95 text-sm uppercase tracking-widest">
                                Zamknij Panel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const StatCard = ({ title, value, subtext, icon: Icon, color, onClick, isInteractive }: any) => {
    const colors: any = {
        blue: 'bg-blue-100 text-blue-600',
        emerald: 'bg-emerald-100 text-emerald-600',
        amber: 'bg-amber-100 text-amber-600',
        indigo: 'bg-indigo-100 text-indigo-600'
    };

    return (
        <div
            onClick={onClick}
            className={`bg-white p-6 rounded-xl border border-slate-200 shadow-sm transition-all duration-300 relative group overflow-hidden ${isInteractive ? 'cursor-pointer hover:shadow-xl hover:border-emerald-500 active:scale-[0.98]' : 'hover:shadow-md'}`}
        >
            {isInteractive && <div className="absolute top-0 right-0 w-2 h-full bg-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>}
            <div className="flex items-center justify-between mb-3 relative z-10">
                <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest group-hover:text-emerald-600 transition-colors">{title}</span>
                <div className={`p-2 rounded-lg ${colors[color]} group-hover:scale-110 transition-transform duration-300 shadow-sm`}>
                    <Icon size={18} />
                </div>
            </div>
            <div className={`text-xl font-black text-slate-800 mb-1 tracking-tight ${isInteractive ? 'group-hover:text-emerald-700' : ''}`}>{value}</div>
            <div className="text-[10px] text-slate-400 flex items-center justify-between relative z-10 font-bold">
                <span>{subtext}</span>
                {isInteractive && (
                    <div className="bg-emerald-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all shadow-md">
                        <ArrowUpRight size={12} />
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;
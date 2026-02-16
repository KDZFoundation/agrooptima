
import React, { useState } from 'react';
import { ClipboardCheck, ShieldAlert, Tractor, User, HelpCircle, Save, CheckCircle2, ChevronRight, Info, Sparkles, Loader2 } from 'lucide-react';
import { FarmerApplicationData, FarmData } from '../types';
import { autofillApplicationFromRag } from '../services/geminiService';

interface FarmerApplicationProps {
    farmData: FarmData;
}

const FarmerApplication: React.FC<FarmerApplicationProps> = ({ farmData }) => {
    const [isScanning, setIsScanning] = useState(false);
    const [formData, setFormData] = useState<FarmerApplicationData>({
        submissionType: 'Wniosek',
        commitments: {
            rsk_prow: false, rsk_wpr: false, eko_prow: false, eko_wpr: false, zalesienie: false, premie_lesne: false
        },
        directPayments: {
            pwd_red: false,
            mro: false,
            ekoschematy: false,
            carbon_farming: {
                active: false,
                tuz_obsada: false, miedzyplony: false, plan_nawozenia: false, zroznicowana_struktura: false,
                obornik_12h: false, nawozy_plynne: false, uproszczone_uprawy: false, wymieszanie_slomy: false
            },
            ipr: false, bou: false, retencjonowanie: false, gwp: false
        },
        nationalSupport: { upp: false, tyton: false },
        ruralDevelopment: { onw: false, prsk1420: false, re1420: false, zrsk2327: false, re2327: false },
        youngFarmerStatement: '',
        rskChangeStatement: false,
        gaec7Resignation: false
    });

    const handleAutoFill = async () => {
        setIsScanning(true);
        try {
            const result = await autofillApplicationFromRag(farmData);
            setFormData(prev => ({
                ...prev,
                ...result,
                directPayments: { ...prev.directPayments, ...result.directPayments },
                ruralDevelopment: { ...prev.ruralDevelopment, ...result.ruralDevelopment }
            }));
            alert("Wniosek został uzupełniony na podstawie danych z PDF.");
        } catch (e) {
            alert("Nie znaleziono wystarczających danych w bazie dokumentów.");
        } finally {
            setIsScanning(false);
        }
    };

    const toggleCommitment = (key: keyof FarmerApplicationData['commitments']) => {
        setFormData(prev => ({
            ...prev,
            commitments: { ...prev.commitments, [key]: !prev.commitments[key] }
        }));
    };

    const toggleDirect = (key: keyof FarmerApplicationData['directPayments']) => {
        if (typeof formData.directPayments[key] === 'boolean') {
            setFormData(prev => ({
                ...prev,
                directPayments: { ...prev.directPayments, [key]: !prev.directPayments[key] } as any
            }));
        }
    };

    const toggleCarbon = (key: keyof FarmerApplicationData['directPayments']['carbon_farming']) => {
        setFormData(prev => ({
            ...prev,
            directPayments: {
                ...prev.directPayments,
                carbon_farming: {
                    ...prev.directPayments.carbon_farming,
                    [key]: !prev.directPayments.carbon_farming[key]
                }
            }
        }));
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-24">
            {/* Header */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                        <ClipboardCheck className="text-emerald-600" size={28} />
                        Deklaracja WPR 2024
                    </h1>
                    <p className="text-slate-500 font-medium">Ustaw interwencje zgodnie ze złożonym e-Wnioskiem.</p>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={handleAutoFill}
                        disabled={isScanning}
                        className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl border border-emerald-200 font-black text-xs uppercase tracking-widest hover:bg-emerald-100 transition-all"
                    >
                        {isScanning ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                        {isScanning ? 'Skanowanie...' : 'Analizuj z PDF'}
                    </button>
                    <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                        {['Wniosek', 'Zmiana'].map((type) => (
                            <button
                                key={type}
                                onClick={() => setFormData(prev => ({ ...prev, submissionType: type as any }))}
                                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                                    formData.submissionType === type ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500'
                                }`}
                            >
                                {type}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Section I: Przejęcie zobowiązania */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
                    <ShieldAlert size={20} className="text-amber-500" />
                    <h2 className="font-black text-slate-700 uppercase text-xs tracking-widest">I. Przejęcie zobowiązania</h2>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <CommitmentCard label="RSK (PROW 14/20)" active={formData.commitments.rsk_prow} onClick={() => toggleCommitment('rsk_prow')} />
                    <CommitmentCard label="RSK (WPR 23/27)" active={formData.commitments.rsk_wpr} onClick={() => toggleCommitment('rsk_wpr')} />
                    <CommitmentCard label="Ekologiczne (PROW 14/20)" active={formData.commitments.eko_prow} onClick={() => toggleCommitment('eko_prow')} />
                    <CommitmentCard label="Ekologiczne (WPR 23/27)" active={formData.commitments.eko_wpr} onClick={() => toggleCommitment('eko_wpr')} />
                </div>
            </div>

            {/* Section V: Płatności Bezpośrednie */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 bg-emerald-50 border-b border-emerald-100 flex items-center gap-2">
                    <Tractor size={20} className="text-emerald-600" />
                    <h2 className="font-black text-emerald-800 uppercase text-xs tracking-widest">V. Płatności Bezpośrednie</h2>
                </div>
                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <PaymentToggle label="Podstawowe dochody (PWD/RED)" active={formData.directPayments.pwd_red} onClick={() => toggleDirect('pwd_red')} />
                        <PaymentToggle label="Młody Rolnik (MRO)" active={formData.directPayments.mro} onClick={() => toggleDirect('mro')} />
                    </div>

                    <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
                            <Info size={16} className="text-emerald-600" />
                            Rolnictwo węglowe (E_WNIOSEK)
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <CarbonSubItem label="Ekstensywne TUZ" active={formData.directPayments.carbon_farming.tuz_obsada} onClick={() => toggleCarbon('tuz_obsada')} />
                            <CarbonSubItem label="Międzyplony / wsiewki" active={formData.directPayments.carbon_farming.miedzyplony} onClick={() => toggleCarbon('miedzyplony')} />
                            <CarbonSubItem label="Plan nawożenia" active={formData.directPayments.carbon_farming.plan_nawozenia} onClick={() => toggleCarbon('plan_nawozenia')} />
                            <CarbonSubItem label="Zróżnicowana struktura" active={formData.directPayments.carbon_farming.zroznicowana_struktura} onClick={() => toggleCarbon('zroznicowana_struktura')} />
                            <CarbonSubItem label="Uproszczone systemy" active={formData.directPayments.carbon_farming.uproszczone_uprawy} onClick={() => toggleCarbon('uproszczone_uprawy')} />
                            <CarbonSubItem label="Wymieszanie słomy" active={formData.directPayments.carbon_farming.wymieszanie_slomy} onClick={() => toggleCarbon('wymieszanie_slomy')} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Rozwój Obszarów Wiejskich */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200 font-black text-slate-700 uppercase text-xs tracking-widest">
                    Płatności i Premie ROW
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <PaymentToggle label="Płatność ONW" active={formData.ruralDevelopment.onw} onClick={() => setFormData(p => ({...p, ruralDevelopment: {...p.ruralDevelopment, onw: !p.ruralDevelopment.onw}}))} />
                    <PaymentToggle label="PRSK 2014-2020" active={formData.ruralDevelopment.prsk1420} onClick={() => setFormData(p => ({...p, ruralDevelopment: {...p.ruralDevelopment, prsk1420: !p.ruralDevelopment.prsk1420}}))} />
                </div>
            </div>

            {/* GAEC 7 */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6">
                    <div className="flex items-start gap-4 p-4 rounded-xl bg-amber-50 border border-amber-100">
                        <input 
                            type="checkbox" 
                            checked={formData.gaec7Resignation} 
                            onChange={() => setFormData(prev => ({...prev, gaec7Resignation: !prev.gaec7Resignation}))}
                            className="mt-1 w-5 h-5 rounded border-amber-300 text-emerald-600 focus:ring-emerald-500" 
                        />
                        <div className="text-sm">
                            <p className="font-black text-amber-900 mb-1 tracking-tight">Oświadczenie GAEC 7</p>
                            <p className="text-amber-800 leading-snug font-medium">
                                Rezygnuję z prawa zwolnienia z obowiązku przestrzegania normy GAEC 7 (Płodozmian).
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Bar */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 shadow-2xl flex justify-center md:justify-end gap-4 z-50 md:left-64">
                <div className="max-w-4xl w-full flex justify-end gap-3 px-4">
                    <button className="px-10 py-3 rounded-xl bg-emerald-600 text-white font-black uppercase text-sm tracking-widest shadow-lg shadow-emerald-200 hover:bg-emerald-700 active:scale-95 transition-all flex items-center gap-2">
                        <Save size={18} />
                        Zatwierdź Deklarację
                    </button>
                </div>
            </div>
        </div>
    );
};

const CommitmentCard = ({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) => (
    <div 
        onClick={onClick}
        className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between group ${
            active ? 'border-emerald-500 bg-emerald-50' : 'border-slate-100 hover:border-emerald-200'
        }`}
    >
        <span className={`text-xs font-bold ${active ? 'text-emerald-900' : 'text-slate-600'}`}>{label}</span>
        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
            active ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-200 group-hover:border-emerald-300'
        }`}>
            {active && <CheckCircle2 size={14} />}
        </div>
    </div>
);

const PaymentToggle = ({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) => (
    <div 
        onClick={onClick}
        className={`p-4 rounded-2xl border-2 flex items-center justify-between cursor-pointer transition-all ${
            active ? 'border-emerald-600 bg-white shadow-md' : 'border-slate-100 bg-slate-50/50'
        }`}
    >
        <span className={`text-sm font-black flex-1 pr-4 ${active ? 'text-emerald-900' : 'text-slate-500'}`}>{label}</span>
        <div className={`w-10 h-5 rounded-full relative transition-colors ${active ? 'bg-emerald-600' : 'bg-slate-300'}`}>
            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${active ? 'left-5.5' : 'left-0.5'}`}></div>
        </div>
    </div>
);

const CarbonSubItem = ({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) => (
    <button 
        onClick={onClick}
        className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left group ${
            active ? 'bg-white border-emerald-500 shadow-sm' : 'bg-transparent border-slate-200 hover:border-emerald-300'
        }`}
    >
        <div className={`w-4 h-4 rounded border-2 transition-colors flex items-center justify-center flex-shrink-0 ${
            active ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 group-hover:border-emerald-400'
        }`}>
            {active && <CheckCircle2 size={12} />}
        </div>
        <span className={`text-[10px] font-bold leading-tight ${active ? 'text-emerald-900' : 'text-slate-500'}`}>{label}</span>
    </button>
);

export default FarmerApplication;

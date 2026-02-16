
import React, { useState } from 'react';
import { ClipboardCheck, ShieldAlert, Tractor, Save, CheckCircle2, Info } from 'lucide-react';
import { FarmerApplicationData, FarmData } from '../types';

interface FarmerApplicationProps {
    farmData: FarmData;
}

const FarmerApplication: React.FC<FarmerApplicationProps> = ({ farmData }) => {
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
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                        <ClipboardCheck className="text-emerald-600" size={32} />
                        Deklaracja WPR 2024
                    </h1>
                    <p className="text-slate-500 font-medium mt-1">Ustaw interwencje zgodnie ze złożonym e-Wnioskiem.</p>
                </div>
                <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
                    {['Wniosek', 'Zmiana'].map((type) => (
                        <button
                            key={type}
                            onClick={() => setFormData(prev => ({ ...prev, submissionType: type as any }))}
                            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                formData.submissionType === type ? 'bg-white text-emerald-700 shadow-lg' : 'text-slate-500'
                            }`}
                        >
                            {type}
                        </button>
                    ))}
                </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-5 bg-slate-50 border-b border-slate-200 flex items-center gap-3">
                    <ShieldAlert size={20} className="text-amber-500" />
                    <h2 className="font-black text-slate-700 uppercase text-xs tracking-widest">I. Przejęcie zobowiązania</h2>
                </div>
                <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <CommitmentCard label="RSK (PROW 14/20)" active={formData.commitments.rsk_prow} onClick={() => toggleCommitment('rsk_prow')} />
                    <CommitmentCard label="RSK (WPR 23/27)" active={formData.commitments.rsk_wpr} onClick={() => toggleCommitment('rsk_wpr')} />
                    <CommitmentCard label="Ekologiczne (PROW 14/20)" active={formData.commitments.eko_prow} onClick={() => toggleCommitment('eko_prow')} />
                    <CommitmentCard label="Ekologiczne (WPR 23/27)" active={formData.commitments.eko_wpr} onClick={() => toggleCommitment('eko_wpr')} />
                </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-5 bg-emerald-50 border-b border-emerald-100 flex items-center gap-3">
                    <Tractor size={20} className="text-emerald-600" />
                    <h2 className="font-black text-emerald-800 uppercase text-xs tracking-widest">V. Płatności Bezpośrednie</h2>
                </div>
                <div className="p-8 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <PaymentToggle label="Podstawowe dochody (PWD/RED)" active={formData.directPayments.pwd_red} onClick={() => toggleDirect('pwd_red')} />
                        <PaymentToggle label="Młody Rolnik (MRO)" active={formData.directPayments.mro} onClick={() => toggleDirect('mro')} />
                    </div>

                    <div className="bg-slate-50 rounded-[2rem] p-6 border border-slate-200">
                        <h3 className="font-black text-slate-800 flex items-center gap-3 mb-6 uppercase text-xs tracking-widest">
                            <Info size={18} className="text-emerald-600" />
                            Rolnictwo węglowe
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

            <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-slate-200 p-4 shadow-2xl flex justify-center md:justify-end gap-4 z-50 md:left-64">
                <div className="max-w-4xl w-full flex justify-end gap-3 px-4">
                    <button className="px-12 py-4 rounded-2xl bg-emerald-600 text-white font-black uppercase text-sm tracking-widest shadow-xl shadow-emerald-200 hover:bg-emerald-700 active:scale-95 transition-all flex items-center gap-3">
                        <Save size={20} />
                        Zapisz Deklarację
                    </button>
                </div>
            </div>
        </div>
    );
};

const CommitmentCard = ({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) => (
    <div 
        onClick={onClick}
        className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between group ${
            active ? 'border-emerald-500 bg-emerald-50 shadow-inner' : 'border-slate-100 bg-white hover:border-emerald-200'
        }`}
    >
        <span className={`text-xs font-black uppercase tracking-tight ${active ? 'text-emerald-900' : 'text-slate-500'}`}>{label}</span>
        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
            active ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-200 group-hover:border-emerald-300'
        }`}>
            {active && <CheckCircle2 size={16} />}
        </div>
    </div>
);

const PaymentToggle = ({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) => (
    <div 
        onClick={onClick}
        className={`p-6 rounded-3xl border-2 flex items-center justify-between cursor-pointer transition-all ${
            active ? 'border-emerald-600 bg-white shadow-xl scale-[1.02]' : 'border-slate-50 bg-slate-50/50'
        }`}
    >
        <span className={`text-sm font-black flex-1 pr-4 uppercase tracking-tighter ${active ? 'text-emerald-900' : 'text-slate-400'}`}>{label}</span>
        <div className={`w-12 h-6 rounded-full relative transition-colors ${active ? 'bg-emerald-600' : 'bg-slate-300'}`}>
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${active ? 'left-7' : 'left-1'}`}></div>
        </div>
    </div>
);

const CarbonSubItem = ({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) => (
    <button 
        onClick={onClick}
        className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left group ${
            active ? 'bg-white border-emerald-500 shadow-md' : 'bg-transparent border-slate-100 hover:border-emerald-200'
        }`}
    >
        <div className={`w-5 h-5 rounded-lg border-2 transition-colors flex items-center justify-center flex-shrink-0 ${
            active ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-200 group-hover:border-emerald-400'
        }`}>
            {active && <CheckCircle2 size={14} />}
        </div>
        <span className={`text-[10px] font-black uppercase tracking-widest leading-tight ${active ? 'text-emerald-900' : 'text-slate-400'}`}>{label}</span>
    </button>
);

export default FarmerApplication;

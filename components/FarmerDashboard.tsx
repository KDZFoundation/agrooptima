
import React from 'react';
import { CloudSun, Sprout, FileText, AlertCircle, ChevronRight, Camera, ClipboardList } from 'lucide-react';
import { FarmData } from '../types';
import AgroWeather from './AgroWeather';

interface FarmerDashboardProps {
  farmData: FarmData;
  onNavigate: (view: any) => void;
}

const FarmerDashboard: React.FC<FarmerDashboardProps> = ({ farmData, onNavigate }) => {
  const currentDate = new Date().toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="space-y-6 pb-20">
      {/* Welcome Header */}
      <div className="bg-emerald-600 text-white rounded-3xl p-6 shadow-lg relative overflow-hidden">
         <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 -mr-10 -mt-10"></div>
         <div className="relative z-10">
             <div className="flex justify-between items-start mb-4">
                 <div>
                     <p className="text-emerald-100 text-sm font-medium">Witaj w gospodarstwie,</p>
                     <h2 className="text-2xl font-black tracking-tight">{farmData.farmName || 'Gospodarstwo'}</h2>
                     <p className="text-emerald-200 text-xs font-bold uppercase mt-1">{currentDate}</p>
                 </div>
                 <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md border border-white/20">
                    <Sprout size={32} className="text-emerald-200" />
                 </div>
             </div>
             <div className="bg-emerald-700/50 rounded-xl p-3 flex items-center gap-3 backdrop-blur-sm">
                 <AlertCircle size={20} className="text-emerald-200 flex-shrink-0" />
                 <p className="text-xs text-emerald-50 leading-tight font-medium">
                     Masz 1 nowe zalecenie od doradcy dotyczące ekoschematów.
                 </p>
             </div>
         </div>
      </div>

      {/* NEW: Agro Weather Analysis */}
      <AgroWeather fields={farmData.fields} />

      {/* Quick Actions Grid */}
      <div>
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-3 px-1">Narzędzia pracy</h3>
        <div className="grid grid-cols-2 gap-4">
            <button 
                onClick={() => onNavigate('OPERATIONS_LOG')}
                className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-start gap-4 active:scale-95 transition-all hover:border-emerald-200"
            >
                <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                    <ClipboardList size={20} />
                </div>
                <div>
                    <span className="font-black text-slate-800 text-sm block">Ewidencja</span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Zabiegi polowe</span>
                </div>
            </button>
            <button 
                onClick={() => onNavigate('DOCUMENTS')}
                className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-start gap-4 active:scale-95 transition-all hover:border-blue-200"
            >
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                    <Camera size={20} />
                </div>
                <div>
                    <span className="font-black text-slate-800 text-sm block">Dokumenty</span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Skanowanie AI</span>
                </div>
            </button>
        </div>
      </div>

      {/* Farm Stats Summary */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-6">
              <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest">Status Gospodarstwa</h3>
              <button onClick={() => onNavigate('FIELDS')} className="text-[10px] font-black text-emerald-600 uppercase bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 hover:bg-emerald-100 transition-colors">SZCZEGÓŁY</button>
          </div>
          
          <div className="space-y-5">
              <div className="flex justify-between items-center pb-4 border-b border-slate-50">
                  <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-slate-50 rounded-xl text-slate-500 border border-slate-100">
                          <Sprout size={20} />
                      </div>
                      <div>
                          <p className="text-sm font-black text-slate-700">Powierzchnia UR</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">Suma gruntów (PEG)</p>
                      </div>
                  </div>
                  <span className="text-lg font-black text-slate-800">{farmData.profile.totalAreaUR.toFixed(2)} ha</span>
              </div>
              
              <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-slate-50 rounded-xl text-slate-500 border border-slate-100">
                          <FileText size={20} />
                      </div>
                      <div>
                          <p className="text-sm font-black text-slate-700">Nr Producenta</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">Identyfikator ARiMR</p>
                      </div>
                  </div>
                  <span className="text-xs font-mono font-black text-slate-500 bg-slate-100 px-2 py-1 rounded border border-slate-200">{farmData.profile.producerId}</span>
              </div>
          </div>
      </div>

      {/* Recent News */}
      <div>
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-3 px-1">Komunikaty i Aktualności</h3>
          <div className="space-y-3">
              {[
                  { title: "Zaliczki 2025", date: "Dziś", desc: "Twoje zaliczki są w trakcie weryfikacji przez system.", color: "text-blue-600", bg: "bg-blue-50" },
                  { title: "Nowe stawki dopłat", date: "2 dni temu", desc: "Zaktualizowano stawki dla rolnictwa węglowego 2026.", color: "text-emerald-600", bg: "bg-emerald-50" }
              ].map((item, i) => (
                  <div key={i} className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex justify-between items-center group active:scale-[0.98] transition-all">
                      <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                             <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${item.bg} ${item.color}`}>{item.date}</span>
                             <h4 className="font-black text-slate-700 text-sm">{item.title}</h4>
                          </div>
                          <p className="text-xs text-slate-400 font-medium line-clamp-1">{item.desc}</p>
                      </div>
                      <ChevronRight size={18} className="text-slate-200 group-hover:text-emerald-500 transition-colors" />
                  </div>
              ))}
          </div>
      </div>
    </div>
  );
};

export default FarmerDashboard;

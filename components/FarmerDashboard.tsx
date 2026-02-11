
import React from 'react';
import { CloudSun, Sprout, FileText, AlertCircle, ChevronRight, Camera } from 'lucide-react';
import { FarmData } from '../types';

interface FarmerDashboardProps {
  farmData: FarmData;
  onNavigate: (view: any) => void;
}

const FarmerDashboard: React.FC<FarmerDashboardProps> = ({ farmData, onNavigate }) => {
  const currentDate = new Date().toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="space-y-6 pb-20">
      {/* Welcome & Weather */}
      <div className="bg-emerald-600 text-white rounded-3xl p-6 shadow-lg relative overflow-hidden">
         <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 -mr-10 -mt-10"></div>
         <div className="relative z-10">
             <div className="flex justify-between items-start mb-4">
                 <div>
                     <p className="text-emerald-100 text-sm font-medium">Dzień dobry, dzisiaj jest {currentDate}</p>
                     <h2 className="text-2xl font-bold">{farmData.farmName}</h2>
                 </div>
                 <div className="flex flex-col items-end">
                     <CloudSun size={32} className="mb-1" />
                     <span className="text-xl font-bold">22°C</span>
                 </div>
             </div>
             <div className="bg-emerald-700/50 rounded-xl p-3 flex items-center gap-3 backdrop-blur-sm">
                 <AlertCircle size={20} className="text-emerald-200 flex-shrink-0" />
                 <p className="text-xs text-emerald-50 leading-tight">
                     Pamiętaj o terminie składania wniosków o dopłaty bezpośrednie do 15 maja.
                 </p>
             </div>
         </div>
      </div>

      {/* Quick Actions Grid */}
      <div>
        <h3 className="text-lg font-bold text-slate-800 mb-3 px-1">Szybkie Akcje</h3>
        <div className="grid grid-cols-2 gap-4">
            <button 
                onClick={() => onNavigate('DOCUMENTS')}
                className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center gap-3 active:scale-95 transition-transform"
            >
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
                    <Camera size={24} />
                </div>
                <span className="font-semibold text-slate-700 text-sm">Skanuj Dok.</span>
            </button>
            <button 
                onClick={() => onNavigate('FIELDS')}
                className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center gap-3 active:scale-95 transition-transform"
            >
                <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center">
                    <Sprout size={24} />
                </div>
                <span className="font-semibold text-slate-700 text-sm">Przegląd Pól</span>
            </button>
        </div>
      </div>

      {/* Farm Stats Summary */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-800">Twoje Gospodarstwo</h3>
              <button onClick={() => onNavigate('FIELDS')} className="text-xs text-emerald-600 font-bold">ZOBACZ WSZYSTKIE</button>
          </div>
          
          <div className="space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-slate-50">
                  <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-50 rounded-lg text-slate-500">
                          <Sprout size={18} />
                      </div>
                      <div>
                          <p className="text-sm font-bold text-slate-700">Powierzchnia UR</p>
                          <p className="text-xs text-slate-400">Suma gruntów ornych</p>
                      </div>
                  </div>
                  <span className="text-lg font-bold text-slate-800">{farmData.profile.totalAreaUR.toFixed(2)} ha</span>
              </div>
              
              <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-50 rounded-lg text-slate-500">
                          <FileText size={18} />
                      </div>
                      <div>
                          <p className="text-sm font-bold text-slate-700">Nr Producenta</p>
                          <p className="text-xs text-slate-400">Identyfikator ARiMR</p>
                      </div>
                  </div>
                  <span className="text-sm font-mono font-bold text-slate-600">{farmData.profile.producerId}</span>
              </div>
          </div>
      </div>

      {/* Recent Activity / News */}
      <div>
          <h3 className="text-lg font-bold text-slate-800 mb-3 px-1">Aktualności ARiMR</h3>
          <div className="space-y-3">
              {[
                  { title: "Wypłata zaliczek", date: "Wczoraj", desc: "Rozpoczęto wypłatę zaliczek na poczet płatności bezpośrednich." },
                  { title: "Nowe ekoschematy", date: "2 dni temu", desc: "Zaktualizowano listę dostępnych ekoschematów na rok 2026." }
              ].map((item, i) => (
                  <div key={i} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center">
                      <div>
                          <p className="text-xs text-emerald-600 font-bold mb-1">{item.date}</p>
                          <h4 className="font-bold text-slate-700 text-sm">{item.title}</h4>
                          <p className="text-xs text-slate-400 mt-1 line-clamp-1">{item.desc}</p>
                      </div>
                      <ChevronRight size={16} className="text-slate-300" />
                  </div>
              ))}
          </div>
      </div>
    </div>
  );
};

export default FarmerDashboard;

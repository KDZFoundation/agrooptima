
import React from 'react';
import { LayoutDashboard, Sprout, FileText, MessageSquare, Calendar, Calculator, ClipboardCheck } from 'lucide-react';
import { ViewState } from '../types';

interface MobileNavigationProps {
  currentView: ViewState;
  setView: (view: ViewState) => void;
}

const MobileNavigation: React.FC<MobileNavigationProps> = ({ currentView, setView }) => {
  const NavItem = ({ view, icon: Icon, label }: { view: ViewState; icon: any; label: string }) => (
    <button
      onClick={() => setView(view)}
      className={`flex flex-col items-center justify-center space-y-1 w-full py-2 transition-colors ${
        currentView === view 
          ? 'text-emerald-600' 
          : 'text-slate-400 hover:text-slate-600'
      }`}
    >
      <Icon size={24} className={currentView === view ? 'fill-emerald-100' : ''} />
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-40 md:hidden">
      <div className="flex justify-around items-center h-16 safe-area-pb">
        <NavItem view="DASHBOARD" icon={LayoutDashboard} label="Pulpit" />
        <NavItem view="OPERATIONS_LOG" icon={ClipboardCheck} label="Zabiegi" />
        <NavItem view="FIELDS" icon={Sprout} label="Pola" />
        <NavItem view="DOCUMENTS" icon={FileText} label="Pliki" />
        <NavItem view="CHAT" icon={MessageSquare} label="Asystent" />
      </div>
    </div>
  );
};

export default MobileNavigation;

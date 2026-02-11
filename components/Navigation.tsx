
import React from 'react';
import { LayoutDashboard, Sprout, TrendingUp, MessageSquare, Calendar, Tractor, UserCircle, LogOut, Users, FileText, Settings } from 'lucide-react';
import { ViewState } from '../types';

interface NavigationProps {
  currentView: ViewState;
  setView: (view: ViewState) => void;
  onLogout: () => void;
}

const Navigation: React.FC<NavigationProps> = ({ currentView, setView, onLogout }) => {
  const NavItem = ({ view, icon: Icon, label }: { view: ViewState; icon: any; label: string }) => (
    <button
      onClick={() => setView(view)}
      className={`flex items-center space-x-3 w-full px-4 py-3 rounded-lg transition-colors ${
        currentView === view 
          ? 'bg-emerald-600 text-white shadow-md' 
          : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
      }`}
    >
      <Icon size={20} />
      <span className="font-medium">{label}</span>
    </button>
  );

  return (
    <div className="w-64 bg-white h-screen fixed left-0 top-0 border-r border-slate-200 flex flex-col z-20 hidden md:flex">
      <div className="p-6 border-b border-slate-100">
        <div className="flex items-center space-x-2 text-emerald-700">
          <Tractor size={28} />
          <span className="text-xl font-bold tracking-tight">AgroOptima</span>
        </div>
        <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-semibold">
            Platforma Doradcy
        </p>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        <NavItem view="DASHBOARD" icon={LayoutDashboard} label="Pulpit" />
        <NavItem view="FARMERS_LIST" icon={Users} label="Moi Rolnicy" />
        <NavItem view="DOCUMENTS" icon={FileText} label="Dokumenty" />
        <NavItem view="OPTIMIZATION" icon={TrendingUp} label="Optymalizacja WPR" />
        <NavItem view="CALENDAR" icon={Calendar} label="Terminarz" />
        <NavItem view="CHAT" icon={MessageSquare} label="Asystent Prawny" />
        
        <div className="pt-4 mt-4 border-t border-slate-100">
             <NavItem view="ADMIN" icon={Settings} label="Panel Admina" />
        </div>
      </nav>

      <div className="p-4 border-t border-slate-100 bg-slate-50">
        <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2 overflow-hidden">
                <UserCircle className="text-slate-400 flex-shrink-0" size={32} />
                <div className="text-sm truncate">
                    <p className="font-semibold text-slate-700 truncate">
                        Anna Nowak
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                        Doradca ODR
                    </p>
                </div>
            </div>
        </div>
        <button 
            onClick={onLogout}
            className="w-full flex items-center justify-center space-x-2 text-xs font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 py-2 rounded-lg transition-colors"
        >
            <LogOut size={14} />
            <span>Wyloguj się</span>
        </button>
      </div>
    </div>
  );
};

export default Navigation;

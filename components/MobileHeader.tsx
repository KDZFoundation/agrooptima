import React from 'react';
import { Tractor, Menu } from 'lucide-react';

interface MobileHeaderProps {
    toggleSidebar: () => void;
}

const MobileHeader: React.FC<MobileHeaderProps> = ({ toggleSidebar }) => {
  return (
    <div className="md:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center space-x-2 text-emerald-700">
        <Tractor size={24} />
        <span className="text-lg font-bold">AgroOptima</span>
      </div>
      <button onClick={toggleSidebar} className="text-slate-600">
        <Menu size={24} />
      </button>
    </div>
  );
};

export default MobileHeader;

import React, { useState, useEffect } from 'react';
import { Tractor, ChevronRight, Lock, Sprout, Briefcase, Wifi, WifiOff, Loader2 } from 'lucide-react';
import { UserRole } from '../types';
import { api } from '../services/api';

interface LoginScreenProps {
  onLogin: (role: UserRole) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [role, setRole] = useState<UserRole>('ADVISOR');
  const [email, setEmail] = useState('user@agrooptima.pl');
  const [password, setPassword] = useState('password');
  const [loading, setLoading] = useState(false);
  const [apiStatus, setApiStatus] = useState<'CHECKING' | 'ONLINE' | 'OFFLINE'>('CHECKING');

  useEffect(() => {
      // Check API connection on mount to help user verify deployment status
      api.checkConnection().then(isOnline => {
          setApiStatus(isOnline ? 'ONLINE' : 'OFFLINE');
      });
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate API delay
    setTimeout(() => {
      setLoading(false);
      onLogin(role);
    }, 1000);
  };

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-emerald-900 relative overflow-hidden flex-col justify-between p-12 text-white">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1625246333195-78d9c38ad449?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-20"></div>
        <div className="relative z-10">
            <div className="flex items-center space-x-3 text-emerald-400 mb-6">
                <Tractor size={40} />
                <span className="text-3xl font-bold tracking-tight">AgroOptima</span>
            </div>
            <h1 className="text-5xl font-bold leading-tight mb-6">
                {role === 'ADVISOR' ? 'Platforma Doradcza WPR 2023-2027' : 'Mobilny Asystent Rolnika'}
            </h1>
            <p className="text-lg text-emerald-100 max-w-md leading-relaxed">
                {role === 'ADVISOR' 
                    ? 'Kompleksowe narzędzie do zarządzania gospodarstwami klientów. Automatyzacja wniosków i optymalizacja ekoschematów.'
                    : 'Zarządzaj swoim gospodarstwem prosto z telefonu. Przesyłaj dokumenty, sprawdzaj pola i korzystaj z porad AI.'
                }
            </p>
        </div>
        
        <div className="relative z-10">
            <div className="flex items-center space-x-4 text-sm font-medium">
                <span className="text-emerald-300">© 2024 AgroOptima Systems. v2.3</span>
                
                {/* Connection Status Indicator */}
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full bg-black/20 backdrop-blur-sm border ${apiStatus === 'ONLINE' ? 'border-emerald-500/50' : 'border-red-500/50'}`}>
                    {apiStatus === 'CHECKING' && <Loader2 size={14} className="animate-spin text-emerald-200" />}
                    {apiStatus === 'ONLINE' && <Wifi size={14} className="text-emerald-400" />}
                    {apiStatus === 'OFFLINE' && <WifiOff size={14} className="text-red-400" />}
                    
                    <span className={apiStatus === 'ONLINE' ? 'text-emerald-100' : 'text-red-100'}>
                        {apiStatus === 'CHECKING' ? 'Łączenie...' : (apiStatus === 'ONLINE' ? 'System Online' : 'Tryb Offline')}
                    </span>
                </div>
            </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-slate-900">Witaj w AgroOptima</h2>
            <p className="text-slate-500 mt-2">Wybierz tryb logowania, aby kontynuować.</p>
          </div>

          {/* Role Toggle */}
          <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-xl">
              <button
                type="button"
                onClick={() => setRole('ADVISOR')}
                className={`flex items-center justify-center space-x-2 py-3 rounded-lg font-semibold transition-all ${
                    role === 'ADVISOR' 
                    ? 'bg-white text-emerald-700 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                  <Briefcase size={18} />
                  <span>Doradca</span>
              </button>
              <button
                type="button"
                onClick={() => setRole('FARMER')}
                className={`flex items-center justify-center space-x-2 py-3 rounded-lg font-semibold transition-all ${
                    role === 'FARMER' 
                    ? 'bg-white text-emerald-700 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                  <Sprout size={18} />
                  <span>Rolnik</span>
              </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {role === 'ADVISOR' ? 'Email Służbowy' : 'Email / Nr Producenta'}
              </label>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-shadow"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Hasło
              </label>
              <div className="relative">
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-shadow"
                    required
                />
                <Lock className="absolute right-3 top-3.5 text-slate-400" size={18} />
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
                <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="checkbox" className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                    <span className="text-slate-600">Zapamiętaj mnie</span>
                </label>
                <a href="#" className="text-emerald-600 hover:text-emerald-500 font-medium">Nie pamiętasz hasła?</a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 text-white py-3 rounded-lg font-semibold hover:bg-emerald-700 focus:ring-4 focus:ring-emerald-500/30 transition-all flex items-center justify-center space-x-2"
            >
              {loading ? (
                 <span>Logowanie...</span>
              ) : (
                 <>
                    <span>Zaloguj jako {role === 'ADVISOR' ? 'Doradca' : 'Rolnik'}</span>
                    <ChevronRight size={20} />
                 </>
              )}
            </button>
          </form>

          <div className="pt-6 border-t border-slate-200 text-center">
             <p className="text-sm text-slate-500">
                Nie masz konta?{' '}
                <a href="#" className="text-emerald-600 font-semibold hover:underline">Zarejestruj gospodarstwo</a>
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;

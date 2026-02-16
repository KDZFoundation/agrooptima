
import React, { useState, useEffect } from 'react';
import { Tractor, ChevronRight, Lock, Sprout, Briefcase, Wifi, WifiOff, Loader2, User, Mail } from 'lucide-react';
import { UserRole } from '../types';
import { api } from '../services/api';

interface LoginScreenProps {
  onLogin: (token: string, user: any) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [role, setRole] = useState<UserRole>('ADVISOR');
  const [email, setEmail] = useState('demo@agro.pl');
  const [password, setPassword] = useState('haslo123');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiStatus, setApiStatus] = useState<'CHECKING' | 'ONLINE' | 'OFFLINE'>('CHECKING');

  useEffect(() => {
      api.checkConnection().then(isOnline => {
          setApiStatus(isOnline ? 'ONLINE' : 'OFFLINE');
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
        if (isRegistering) {
            const res = await api.register({ email, password, fullName, role });
            onLogin(res.token, res.user);
        } else {
            const res = await api.login(email, password);
            onLogin(res.token, res.user);
        }
    } catch (err: any) {
        setError(err.message || 'Wystąpił błąd podczas logowania.');
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-emerald-950 relative overflow-hidden flex-col justify-between p-16 text-white border-r border-emerald-900/30">
        <div className="absolute inset-0 z-0">
            <img 
                src="https://images.unsplash.com/photo-1625246333195-78d9c38ad449?q=80&w=2070&auto=format&fit=crop" 
                alt="Agricultural fields"
                className="w-full h-full object-cover opacity-35 scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-emerald-950/80 via-emerald-900/60 to-emerald-950/90"></div>
        </div>
        
        <div className="relative z-10">
            <div className="flex items-center space-x-4 text-emerald-400 mb-10 drop-shadow-lg">
                <Tractor size={56} className="filter drop-shadow-md" />
                <span className="text-4xl font-black tracking-tighter">AgroOptima</span>
            </div>
            <h1 className="text-6xl font-black leading-tight mb-8 tracking-tighter">
                {isRegistering ? 'Dołącz do społeczności' : (role === 'ADVISOR' ? 'Inteligentne Doradztwo WPR' : 'Twój Asystent Polowy')}
            </h1>
        </div>
        
        <div className="relative z-10">
            <div className="flex flex-wrap items-center gap-6 text-sm font-bold uppercase tracking-widest text-emerald-300/80">
                <span>© 2025 AGROOPTIMA AI</span>
                <div className={`flex items-center gap-2 px-4 py-1.5 rounded-2xl bg-black/40 backdrop-blur-xl border ${apiStatus === 'ONLINE' ? 'border-emerald-500/50' : 'border-red-500/50'}`}>
                    {apiStatus === 'CHECKING' && <Loader2 size={14} className="animate-spin text-emerald-200" />}
                    {apiStatus === 'ONLINE' && <Wifi size={14} className="text-emerald-400" />}
                    {apiStatus === 'OFFLINE' && <WifiOff size={14} className="text-red-400" />}
                    <span className={apiStatus === 'ONLINE' ? 'text-emerald-200' : 'text-red-200'}>
                        {apiStatus === 'CHECKING' ? 'Synchronizacja...' : (apiStatus === 'ONLINE' ? 'System Online' : 'Tryb Lokalny')}
                    </span>
                </div>
            </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white md:bg-slate-50 overflow-y-auto">
        <div className="w-full max-w-md space-y-8 py-12">
          <div className="text-center">
            <div className="lg:hidden flex justify-center mb-6">
                <Tractor size={48} className="text-emerald-600" />
            </div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight">{isRegistering ? 'Zarejestruj się' : 'Witaj ponownie'}</h2>
            <p className="text-slate-500 mt-2 font-medium">Podaj swoje dane, aby uzyskać dostęp.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
                <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm font-bold rounded-2xl animate-in fade-in duration-300">
                    {error}
                </div>
            )}

            {isRegistering && (
                <>
                    <div className="grid grid-cols-2 gap-3 bg-slate-200/50 p-2 rounded-[1.5rem] border border-slate-200 shadow-inner">
                        <button
                            type="button"
                            onClick={() => setRole('ADVISOR')}
                            className={`flex items-center justify-center space-x-2 py-3 rounded-2xl font-black transition-all duration-300 ${role === 'ADVISOR' ? 'bg-white text-emerald-700 shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <Briefcase size={18} />
                            <span>DORADCA</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setRole('FARMER')}
                            className={`flex items-center justify-center space-x-2 py-3 rounded-2xl font-black transition-all duration-300 ${role === 'FARMER' ? 'bg-white text-emerald-700 shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <Sprout size={18} />
                            <span>ROLNIK</span>
                        </button>
                    </div>

                    <div className="group">
                        <label className="block text-xs font-black text-slate-500 mb-2 uppercase tracking-widest">Imię i Nazwisko</label>
                        <div className="relative">
                            <input
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="w-full pl-12 pr-5 py-4 bg-white border-2 border-slate-200 rounded-2xl focus:border-emerald-500 focus:outline-none transition-all shadow-sm font-bold text-slate-800"
                                placeholder="Anna Nowak"
                                required
                            />
                            <User className="absolute left-4 top-4.5 text-slate-300" size={20} />
                        </div>
                    </div>
                </>
            )}

            <div className="group">
              <label className="block text-xs font-black text-slate-500 mb-2 uppercase tracking-widest">Email</label>
              <div className="relative">
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-5 py-4 bg-white border-2 border-slate-200 rounded-2xl focus:border-emerald-500 focus:outline-none transition-all shadow-sm font-bold text-slate-800"
                    placeholder="example@agro.pl"
                    required
                />
                <Mail className="absolute left-4 top-4.5 text-slate-300" size={20} />
              </div>
            </div>
            
            <div className="group">
              <label className="block text-xs font-black text-slate-500 mb-2 uppercase tracking-widest">Hasło</label>
              <div className="relative">
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-5 py-4 bg-white border-2 border-slate-200 rounded-2xl focus:border-emerald-500 focus:outline-none transition-all shadow-sm font-bold text-slate-800"
                    placeholder="••••••••"
                    required
                />
                <Lock className="absolute left-4 top-4.5 text-slate-300" size={20} />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-black text-lg hover:bg-emerald-700 hover:shadow-xl hover:-translate-y-0.5 focus:ring-4 focus:ring-emerald-500/20 transition-all flex items-center justify-center space-x-3 active:scale-95"
            >
              {loading ? <Loader2 className="animate-spin" /> : (
                 <>
                    <span>{isRegistering ? 'UTWÓRZ KONTO' : 'ZALOGUJ SIĘ'}</span>
                    <ChevronRight size={24} />
                 </>
              )}
            </button>
            <div className="text-center">
                <p className="text-xs text-slate-400">
                    Tryb demo: <strong>demo@agro.pl</strong> / <strong>haslo123</strong>
                </p>
            </div>
          </form>

          <div className="pt-6 border-t border-slate-200 text-center">
             <button 
                onClick={() => setIsRegistering(!isRegistering)}
                className="text-sm font-medium text-slate-500"
             >
                {isRegistering ? 'Masz już konto?' : 'Nie masz jeszcze konta?'} {' '}
                <span className="text-emerald-600 font-black hover:underline underline-offset-4">
                    {isRegistering ? 'Zaloguj się' : 'Zarejestruj się teraz'}
                </span>
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;


import React, { useState, useEffect, useCallback } from 'react';
import Navigation from './components/Navigation';
import MobileHeader from './components/MobileHeader';
import MobileNavigation from './components/MobileNavigation';
import Dashboard from './components/Dashboard';
import FarmerDashboard from './components/FarmerDashboard';
import FieldManager from './components/FieldManager';
import DocumentManager from './components/DocumentManager';
import Optimizer from './components/Optimizer';
import AIChat from './components/AIChat';
import LoginScreen from './components/LoginScreen';
import FarmerList from './components/FarmerList';
import AdminPanel from './components/AdminPanel';
import FarmPlanner from './components/FarmPlanner';
import EcoSimulation from './components/EcoSimulation';
import FarmerApplication from './components/FarmerApplication';
import { ViewState, FarmData, FarmerClient, Field, FarmerDocument, CsvTemplate, UserRole, FarmTask, User } from './types';
import { DEFAULT_CSV_TEMPLATES, MOCK_TASKS } from './constants';
import { api } from './services/api';
import { WifiOff, LogOut, Loader2 } from 'lucide-react';

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<ViewState>('DASHBOARD');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [clients, setClients] = useState<FarmerClient[]>([]);
  const [isAppLoading, setIsAppLoading] = useState(true);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [fieldManagerTab, setFieldManagerTab] = useState<'PARCELS' | 'CROPS'>('PARCELS');
  const [isOffline, setIsOffline] = useState(false);
  const [csvTemplates, setCsvTemplates] = useState<CsvTemplate[]>(DEFAULT_CSV_TEMPLATES);
  const [selectedYear, setSelectedYear] = useState<number>(2025);

  const [farmData, setFarmData] = useState<FarmData>({
    farmName: '',
    profile: { producerId: '', totalAreaUR: 0, entryConditionPoints: 0 },
    fields: []
  });

  const [tasks, setTasks] = useState<FarmTask[]>(MOCK_TASKS);

  // Auth Initialization
  useEffect(() => {
    const token = localStorage.getItem('ao_token');
    const savedUser = localStorage.getItem('ao_user');
    if (token && savedUser) {
        try {
            const user = JSON.parse(savedUser);
            setIsLoggedIn(true);
            setCurrentUser(user);
            if (user.role === 'ADVISOR') {
                setCurrentView('FARMERS_LIST');
            }
        } catch (e) {
            console.error("Auth recovery failed");
        }
    }
    setIsAppLoading(false);
  }, []);

  const calculateUniqueArea = useCallback((fields: Field[], year: number) => {
    let total = 0;
    fields.forEach(f => {
        const entry = f.history?.find(h => h.year === year);
        if (entry && entry.eligibleArea) {
            total += entry.eligibleArea;
        }
    });
    return parseFloat(total.toFixed(2));
  }, []);

  const loadFarmDataForClient = useCallback(async (clientId: string) => {
    if (!clientId) return;
    try {
        const apiFields = await api.getClientFields(clientId);
        const calculatedArea = calculateUniqueArea(apiFields, selectedYear);
        const client = clients.find(c => c.producerId === clientId);

        setFarmData({
            farmName: client?.farmName || `${client?.lastName || 'Gospodarstwo'} ${client?.firstName || ''}`,
            profile: {
                producerId: clientId,
                totalAreaUR: calculatedArea,
                entryConditionPoints: parseFloat((calculatedArea * 0.25 * 5).toFixed(2))
            },
            fields: apiFields
        });
    } catch (e) {
        console.error("Failed to load client fields");
    }
  }, [clients, selectedYear, calculateUniqueArea]);

  useEffect(() => {
      if (isLoggedIn && selectedClientId) {
          loadFarmDataForClient(selectedClientId);
      }
  }, [selectedClientId, selectedYear, isLoggedIn, loadFarmDataForClient]);

  useEffect(() => {
    const initData = async () => {
        const online = await api.checkConnection();
        setIsOffline(!online);
        
        if (isLoggedIn) {
            const [tpls, cls] = await Promise.all([api.getTemplates(), api.getClients()]);
            if (tpls && tpls.length > 0) setCsvTemplates(prev => [...prev.filter(t => !t.id.startsWith('default')), ...tpls]);
            if (cls) {
                setClients(cls);
                if (currentUser?.role === 'FARMER' && !selectedClientId && cls.length > 0) {
                    setSelectedClientId(cls[0].producerId);
                }
            }
        }
    };
    initData();
  }, [isLoggedIn, currentUser?.role, selectedClientId]);

  const handleAuth = (token: string, user: User) => {
    localStorage.setItem('ao_token', token);
    localStorage.setItem('ao_user', JSON.stringify(user));
    setCurrentUser(user);
    setIsLoggedIn(true);
    if (user.role === 'ADVISOR') {
        setCurrentView('FARMERS_LIST');
    } else {
        setCurrentView('DASHBOARD');
    }
  };

  const handleLogout = () => {
      setIsLoggedIn(false);
      setCurrentUser(null);
      setSelectedClientId(null);
      localStorage.removeItem('ao_token');
      localStorage.removeItem('ao_user');
      setCurrentView('DASHBOARD');
  };

  const handleSelectClient = (client: FarmerClient) => {
    setSelectedClientId(client.producerId);
    setCurrentView('DASHBOARD');
  };

  const handleAddClient = async (client: FarmerClient) => {
      await api.createOrUpdateClient(client);
      setClients(await api.getClients());
  };

  const handleUpdateClient = async (client: FarmerClient) => {
      await api.createOrUpdateClient(client);
      setClients(await api.getClients());
  };

  const handleDeleteClient = async (id: string) => {
      if(window.confirm("Czy na pewno chcesz usunąć tego rolnika?")) {
        await api.deleteClient(id);
        setClients(await api.getClients());
        if (selectedClientId === id) setSelectedClientId(null);
      }
  };

  const updateFields = (newFieldsInput: any) => { 
     setFarmData(prev => {
        const updatedFields = typeof newFieldsInput === 'function' ? newFieldsInput(prev.fields) : newFieldsInput;
        const calculatedArea = calculateUniqueArea(updatedFields, selectedYear);

        return { 
            ...prev, 
            fields: updatedFields,
            profile: {
                ...prev.profile,
                totalAreaUR: calculatedArea,
                entryConditionPoints: parseFloat((calculatedArea * 0.25 * 5).toFixed(2))
            }
        };
     });
  };

  const handleSaveFields = async (currentFields: Field[]) => {
      const pid = selectedClientId || farmData.profile.producerId;
      if (!pid) return false;
      try {
          await api.saveClientFields(pid, currentFields);
          return true;
      } catch (e) {
          return false;
      }
  };

  const handleAddDocument = async (doc: FarmerDocument) => {
    const clientId = selectedClientId || farmData.profile.producerId;
    if (!clientId) return;
    await api.addDocument(clientId, doc);
    setClients(await api.getClients());
  };

  const handleRemoveDocument = async (id: string) => {
    const clientId = selectedClientId || farmData.profile.producerId;
    if (!clientId) return;
    await api.removeDocument(clientId, id);
    setClients(await api.getClients());
  };

  if (isAppLoading) {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
              <Loader2 className="animate-spin text-emerald-600 mb-4" size={48} />
              <p className="text-slate-500 font-bold">Ładowanie AgroOptima...</p>
          </div>
      );
  }

  if (!isLoggedIn) return <LoginScreen onLogin={handleAuth} />;

  const renderContent = () => {
    const currentClient = clients.find(c => c.producerId === (selectedClientId || farmData.profile.producerId));
    
    switch (currentView) {
      case 'DASHBOARD':
        return currentUser?.role === 'ADVISOR' ? (
            <Dashboard 
                farmData={farmData} 
                recentDocuments={currentClient?.documents || []} 
                onViewAllDocuments={() => setCurrentView('DOCUMENTS')} 
                onManageFields={(tab) => { if (tab) setFieldManagerTab(tab); setCurrentView('FIELDS'); }}
                selectedYear={selectedYear}
                setSelectedYear={setSelectedYear}
                onAddDocument={handleAddDocument}
            />
        ) : (
            <FarmerDashboard farmData={farmData} onNavigate={setCurrentView} />
        );
      case 'FARMERS_LIST':
        return <FarmerList clients={clients} onSelectClient={handleSelectClient} onAddClient={handleAddClient} onUpdateClient={handleUpdateClient} onDeleteClient={handleDeleteClient} />;
      case 'FIELDS':
        return (
            <FieldManager 
                fields={farmData.fields} 
                setFields={updateFields} 
                csvTemplates={csvTemplates} 
                initialTab={fieldManagerTab} 
                selectedYear={selectedYear}
                setSelectedYear={setSelectedYear}
                onSave={handleSaveFields} 
            />
        );
      case 'SIMULATION':
        return <EcoSimulation farmData={farmData} selectedYear={selectedYear} onApplyPlan={(fields) => { updateFields(fields); handleSaveFields(fields); setCurrentView('DASHBOARD'); }} />;
      case 'FARMER_APPLICATION':
        return <FarmerApplication farmData={farmData} />;
      case 'CHAT': return <AIChat farmData={farmData} />;
      case 'DOCUMENTS': return <DocumentManager documents={currentClient?.documents || []} onAddDocument={handleAddDocument} onRemoveDocument={handleRemoveDocument} />;
      case 'OPTIMIZATION': return <Optimizer farmData={farmData} />;
      case 'ADMIN': return <AdminPanel clients={clients} templates={csvTemplates} onSaveTemplate={(t) => setCsvTemplates(p => [...p.filter(x => x.id !== t.id), t])} onDeleteTemplate={(id) => setCsvTemplates(p => p.filter(x => x.id !== id))} selectedGlobalYear={selectedYear} />;
      case 'CALENDAR': return <FarmPlanner tasks={tasks} fields={farmData.fields} setTasks={setTasks} isAdvisor={currentUser?.role === 'ADVISOR'} />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {currentUser?.role === 'ADVISOR' && <Navigation currentView={currentView} setView={setCurrentView} onLogout={handleLogout} />}
      <div className={`flex-1 ${currentUser?.role === 'ADVISOR' ? 'md:ml-64' : ''} relative w-full pb-16 md:pb-0`}>
        <div className="md:hidden">
            <MobileHeader toggleSidebar={() => currentUser?.role === 'ADVISOR' && setSidebarOpen(!sidebarOpen)} />
            {currentUser?.role === 'FARMER' && <div className="absolute top-4 right-4 z-50"><button onClick={handleLogout} className="text-slate-500 hover:text-red-500"><LogOut size={20}/></button></div>}
        </div>
        {isOffline && <div className="bg-red-500 text-white px-4 py-2 text-sm text-center font-medium flex items-center justify-center gap-2"><WifiOff size={16} /><span>Tryb Offline - Dane w przeglądarce</span></div>}
        <main className={`p-4 ${currentUser?.role === 'ADVISOR' ? 'md:p-8' : 'md:max-w-md md:mx-auto md:bg-white md:shadow-xl md:min-h-screen md:border-x md:border-slate-100'} max-w-7xl mx-auto`}>
          {currentUser?.role === 'ADVISOR' && selectedClientId && (
              <div className="mb-6 bg-slate-800 text-white px-4 py-2 rounded-lg flex justify-between items-center text-sm shadow-md">
                 <div className="flex items-center gap-2 overflow-hidden"><span className="text-slate-400 hidden sm:inline">Klient:</span><span className="font-semibold truncate">{farmData.farmName}</span></div>
                 <button onClick={() => setCurrentView('FARMERS_LIST')} className="text-emerald-400 hover:text-emerald-300 font-medium whitespace-nowrap ml-2">Zmień</button>
              </div>
          )}
          {renderContent()}
        </main>
        {currentUser?.role === 'FARMER' && <MobileNavigation currentView={currentView} setView={setCurrentView} />}
      </div>
    </div>
  );
};

export default App;


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
import OperationsLog from './components/OperationsLog';
import { ViewState, FarmData, FarmerClient, Field, FarmerDocument, CsvTemplate, UserRole, FarmTask, User, FieldOperation } from './types';
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
  const [operations, setOperations] = useState<FieldOperation[]>([]);

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

  const fetchClients = useCallback(async () => {
    const cls = await api.getClients();
    if (cls) {
        setClients(cls);
        if (currentUser?.role === 'FARMER' && !selectedClientId && cls.length > 0) {
            setSelectedClientId(cls[0].producerId);
        }
    }
  }, [currentUser?.role, selectedClientId]);

  const loadFarmDataForClient = useCallback(async (clientId: string) => {
    if (!clientId) return;
    try {
        const apiFields = await api.getClientFields(clientId);
        const apiOps = await api.getOperations(clientId);
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
        setOperations(apiOps);
    } catch (e) {
        console.error("Failed to load client data");
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
            fetchClients();
        }
    };
    initData();
  }, [isLoggedIn, fetchClients]);

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

  // HANDLERY DLA FARMER_LIST - POPRAWIONE ZAPISYWANIE
  const handleAddClient = async (client: FarmerClient) => {
    const saved = await api.createOrUpdateClient(client);
    if (saved) {
      await fetchClients();
    }
  };

  const handleUpdateClient = async (client: FarmerClient) => {
    const saved = await api.createOrUpdateClient(client);
    if (saved) {
      await fetchClients();
    }
  };

  const handleDeleteClient = async (id: string) => {
    if (window.confirm("Czy na pewno chcesz usunąć tego rolnika z bazy?")) {
      const ok = await api.deleteClient(id);
      if (ok) {
        await fetchClients();
        if (selectedClientId === id) {
          setSelectedClientId(null);
        }
      }
    }
  };

  const handleAddDocument = async (doc: FarmerDocument): Promise<void> => {
    const clientId = selectedClientId || farmData.profile.producerId;
    if (!clientId) return;
    await api.addDocument(clientId, doc);
    await fetchClients();
  };

  const handleRemoveDocument = async (id: string) => {
    const clientId = selectedClientId || farmData.profile.producerId;
    if (!clientId) return;
    await api.removeDocument(clientId, id);
    await fetchClients();
  };

  const handleAddOperation = async (op: FieldOperation) => {
      const clientId = selectedClientId || farmData.profile.producerId;
      if (!clientId) return;
      try {
          await api.saveOperation(clientId, op);
          const apiOps = await api.getOperations(clientId);
          setOperations(apiOps);
      } catch (e) {
          console.error("Operation save failed");
      }
  };

  const handleDeleteOperation = async (id: string) => {
      const clientId = selectedClientId || farmData.profile.producerId;
      if (!clientId) return;
      try {
          await api.deleteOperation(clientId, id);
          const apiOps = await api.getOperations(clientId);
          setOperations(apiOps);
      } catch (e) {
          console.error("Operation delete failed");
      }
  };

  const handleSaveFields = async (updatedFields: Field[]) => {
    const clientId = selectedClientId || farmData.profile.producerId;
    if (!clientId) return false;
    try {
        await api.saveClientFields(clientId, updatedFields);
        await loadFarmDataForClient(clientId);
        return true;
    } catch (e) {
        return false;
    }
  };

  // --- TEMPLATE HANDLERS ---
  const handleSaveTemplate = async (template: CsvTemplate) => {
      await api.saveTemplate(template);
      // Update local state immediately
      setCsvTemplates(prev => {
          const idx = prev.findIndex(t => t.id === template.id);
          if (idx >= 0) {
              const next = [...prev];
              next[idx] = template;
              return next;
          }
          return [...prev, template];
      });
  };

  const handleDeleteTemplate = async (id: string) => {
      // Assuming api.deleteTemplate(id) would exist, but since it's not in the shared api.ts, we handle local state
      setCsvTemplates(prev => prev.filter(t => t.id !== id));
  };

  if (isAppLoading) {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
              <Loader2 className="animate-spin text-emerald-600 mb-4" size={48} />
              <p className="text-slate-500 font-black uppercase tracking-widest text-xs">AgroOptima Core v3.2</p>
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
            <FarmerDashboard 
                farmData={farmData} 
                onNavigate={setCurrentView}
                selectedYear={selectedYear}
                setSelectedYear={setSelectedYear}
            />
        );
      case 'FARMERS_LIST':
        return <FarmerList 
                  clients={clients} 
                  onSelectClient={handleSelectClient} 
                  onAddClient={handleAddClient} 
                  onUpdateClient={handleUpdateClient} 
                  onDeleteClient={handleDeleteClient} 
                />;
      case 'FIELDS':
        return (
            <FieldManager 
                fields={farmData.fields} 
                setFields={(updater) => {
                    const newFields = typeof updater === 'function' ? updater(farmData.fields) : updater;
                    setFarmData(prev => ({ ...prev, fields: newFields }));
                }} 
                csvTemplates={csvTemplates} 
                initialTab={fieldManagerTab} 
                selectedYear={selectedYear}
                setSelectedYear={setSelectedYear}
                onSave={handleSaveFields}
            />
        );
      case 'SIMULATION':
        return <EcoSimulation farmData={farmData} selectedYear={selectedYear} onApplyPlan={() => {}} />;
      case 'FARMER_APPLICATION':
        return <FarmerApplication farmData={farmData} />;
      case 'OPERATIONS_LOG':
        return <OperationsLog operations={operations} fields={farmData.fields} onAddOperation={handleAddOperation} onDeleteOperation={handleDeleteOperation} isAdvisor={currentUser?.role === 'ADVISOR'} />;
      case 'CHAT': return <AIChat farmData={farmData} />;
      case 'DOCUMENTS': return <DocumentManager documents={currentClient?.documents || []} onAddDocument={handleAddDocument} onRemoveDocument={handleRemoveDocument} />;
      case 'OPTIMIZATION': return <Optimizer farmData={farmData} />;
      case 'ADMIN': return <AdminPanel clients={clients} templates={csvTemplates} onSaveTemplate={handleSaveTemplate} onDeleteTemplate={handleDeleteTemplate} selectedGlobalYear={selectedYear} />;
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
        </div>
        {isOffline && <div className="bg-red-50 text-white px-4 py-2 text-[10px] font-black uppercase tracking-widest text-center flex items-center justify-center gap-2"><WifiOff size={14} /><span>Tryb Pracy Lokalnej</span></div>}
        <main className={`p-4 ${currentUser?.role === 'ADVISOR' ? 'md:p-8' : ''} max-w-7xl mx-auto`}>
          {currentUser?.role === 'ADVISOR' && selectedClientId && (
              <div className="mb-6 bg-slate-900 text-white px-5 py-3 rounded-2xl flex justify-between items-center text-sm shadow-xl border border-slate-800">
                 <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-xs font-black">
                        {farmData.farmName.charAt(0)}
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest leading-none">Aktywny Klient</span>
                        <span className="font-black truncate text-emerald-400">{farmData.farmName}</span>
                    </div>
                 </div>
                 <button onClick={() => setCurrentView('FARMERS_LIST')} className="bg-white/10 hover:bg-white/20 text-white px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">Zmień</button>
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

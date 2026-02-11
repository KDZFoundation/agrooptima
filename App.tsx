
import React, { useState, useEffect } from 'react';
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
import { ViewState, FarmData, FarmerClient, Field, FarmerDocument, CsvTemplate, UserRole, FarmTask } from './types';
import { MOCK_FIELDS, DEFAULT_CSV_TEMPLATES, MOCK_CLIENTS, MOCK_TASKS } from './constants';
import { api } from './services/api';
import { WifiOff, LogOut } from 'lucide-react';

const App: React.FC = () => {
  // Auth State
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>('ADVISOR');

  // View State
  const [currentView, setCurrentView] = useState<ViewState>('DASHBOARD');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Data State
  const [clients, setClients] = useState<FarmerClient[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [tasks, setTasks] = useState<FarmTask[]>(MOCK_TASKS);

  // Active Client State (For Advisor) - uses producerId (EP)
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  // Persistence: CSV Templates
  const [csvTemplates, setCsvTemplates] = useState<CsvTemplate[]>(() => {
      const saved = localStorage.getItem('ao_csv_templates');
      return saved ? JSON.parse(saved) : DEFAULT_CSV_TEMPLATES;
  });

  useEffect(() => {
      localStorage.setItem('ao_csv_templates', JSON.stringify(csvTemplates));
  }, [csvTemplates]);

  // Check connection on load
  useEffect(() => {
    api.checkConnection().then(online => setIsOffline(!online));
  }, []);

  // Data State (Current Farm Context - Shared for Advisor viewing Client OR Farmer viewing self)
  const [farmData, setFarmData] = useState<FarmData>({
    farmName: '',
    profile: {
        producerId: '',
        totalAreaUR: 0, 
        entryConditionPoints: 0
    },
    fields: []
  });

  // --- DATA LOADING HELPERS ---

  const loadFarmDataForClient = async (client: FarmerClient) => {
    // 1. Load Fields from API (Guard with offline check)
    let loadedFields: Field[] = [];
    
    if (!isOffline) {
        loadedFields = await api.getClientFields(client.producerId);
    }
    
    // 2. Fallback for demo/mock logic (Generic Mock Fields if list is empty or offline)
    if (loadedFields.length === 0) {
        if (isOffline) {
             loadedFields = MOCK_FIELDS;
        }
    }

    // 3. Determine Area Logic
    const applicationDoc = client.documents?.find(d => d.category === 'WNIOSEK');
    const calculatedArea = applicationDoc 
        ? client.totalArea 
        : (loadedFields.length > 0 ? parseFloat(loadedFields.reduce((sum, f) => sum + f.area, 0).toFixed(2)) : client.totalArea);

    // Compute display farm name
    const displayFarmName = `${client.lastName} ${client.firstName}`;

    setFarmData({
        farmName: displayFarmName,
        profile: {
            producerId: client.producerId,
            totalAreaUR: calculatedArea,
            entryConditionPoints: parseFloat((calculatedArea * 0.25 * 5).toFixed(2))
        },
        fields: loadedFields
    });
  };

  // --- INITIAL DATA FETCH ---
  useEffect(() => {
      if (isLoggedIn && userRole === 'ADVISOR') {
          fetchClients();
      }
  }, [isLoggedIn, userRole]);

  const fetchClients = async () => {
      setLoadingClients(true);
      
      // Check connection first to decide strategy
      const online = await api.checkConnection();
      setIsOffline(!online);
      
      let data: FarmerClient[] = [];

      if (online) {
          data = await api.getClients();
      } else {
          // If offline, default to mocks immediately without trying fetch
          data = MOCK_CLIENTS;
      }
      
      // Safety check: if online but API returned empty (e.g. DB empty), fallback to mock for demo? 
      // Optional: keep strict. Here we assume if online && empty => empty list.
      if (online && data.length === 0) {
          // Maybe we want to seed mocks even if online if empty? 
          // For now, let's respect API result.
      }
      
      setClients(data);
      setLoadingClients(false);
  };

  // --- AUTH HANDLERS ---

  const handleLogin = async (role: UserRole) => {
    setUserRole(role);
    setIsLoggedIn(true);
    
    if (role === 'ADVISOR') {
        setCurrentView('FARMERS_LIST');
    } else {
        setCurrentView('DASHBOARD');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setSelectedClientId(null);
    setUserRole('ADVISOR');
  };

  // --- CLIENT/DATA ACTIONS ---

  const handleSelectClient = async (client: FarmerClient) => {
    setSelectedClientId(client.producerId);
    await loadFarmDataForClient(client);
    setCurrentView('DASHBOARD');
  };

  const updateFields = (newFieldsInput: any) => { 
     setFarmData(prev => {
        const updatedFields = typeof newFieldsInput === 'function' ? newFieldsInput(prev.fields) : newFieldsInput;
        
        // Save to API (Guard with offline check)
        // Side-effect in state setter is generally avoided but used here for simplicity in functional update flow
        if (selectedClientId && !isOffline) {
            api.saveClientFields(selectedClientId, updatedFields).catch(err => console.error("Save error", err));
        }
        return { ...prev, fields: updatedFields };
     });
  };

  // --- DOCUMENT HANDLERS ---
  const handleAddDocument = async (doc: FarmerDocument) => {
    if (!selectedClientId) return;

    let extractedArea: number | null = null;
    if (doc.category === 'WNIOSEK') {
        const currentFieldSum = farmData.fields.reduce((sum, f) => sum + f.area, 0);
        const baseArea = currentFieldSum > 0 ? currentFieldSum : 10;
        extractedArea = parseFloat((baseArea * (1 + (Math.random() * 0.02 - 0.01))).toFixed(2));
        alert(`Wczytano plik: "${doc.name}"\nZaktualizowano powierzchnię UR w systemie: ${extractedArea} ha.`);
    }

    if (!isOffline) {
        await api.addDocument(selectedClientId, doc);
    }

    setClients(prev => prev.map(client => {
        if (client.producerId === selectedClientId) {
            const updatedDocs = [doc, ...(client.documents || [])]; 
            const updatedArea = extractedArea !== null ? extractedArea : client.totalArea;
            return { ...client, totalArea: updatedArea, documents: updatedDocs };
        }
        return client;
    }));

    if (extractedArea !== null) {
        setFarmData(prev => ({
            ...prev,
            profile: { ...prev.profile, totalAreaUR: extractedArea as number }
        }));
    }
  };

  const handleRemoveDocument = async (docId: string) => {
    if (!selectedClientId) return;
    
    if (!isOffline) {
        await api.removeDocument(selectedClientId, docId);
    }
    
    setClients(prev => prev.map(client => {
        if (client.producerId === selectedClientId) {
            return { ...client, documents: (client.documents || []).filter(d => d.id !== docId) };
        }
        return client;
    }));
  };

  // --- TEMPLATE HANDLERS (Admin) ---
  const handleSaveTemplate = (template: CsvTemplate) => {
      setCsvTemplates(prev => {
          const exists = prev.find(t => t.id === template.id);
          if (exists) return prev.map(t => t.id === template.id ? template : t);
          return [...prev, template];
      });
  };

  const handleDeleteTemplate = (id: string) => {
      setCsvTemplates(prev => prev.filter(t => t.id !== id));
  };
  
  // --- ADMIN / ADVISOR SPECIFIC HANDLERS ---
  
  const handleAddClient = async (newClient: FarmerClient) => {
    // 1. Optimistic Update (Show immediately)
    setClients(prev => [...prev, newClient]);
    
    // 2. API Call (Guard with offline check)
    if (!isOffline) {
        const saved = await api.createOrUpdateClient(newClient);
        
        // 3. Rollback on failure
        if (!saved) {
            alert("Błąd: Nie udało się zapisać rolnika w bazie danych! Zmiany zostały cofnięte.");
            setClients(prev => prev.filter(c => c.producerId !== newClient.producerId));
        }
    }
  };

  const handleUpdateClient = async (updatedClient: FarmerClient) => {
    // 1. Snapshot previous state
    const previousClients = [...clients];
    
    // 2. Optimistic Update
    setClients(prev => prev.map(c => c.producerId === updatedClient.producerId ? updatedClient : c));
    
    // 3. API Call (Guard)
    if (!isOffline) {
        const saved = await api.createOrUpdateClient(updatedClient);
        
        // 4. Rollback on failure
        if (!saved) {
            alert("Błąd: Nie udało się zaktualizować danych rolnika.");
            setClients(previousClients);
        }
    }
  };

  const handleDeleteClient = async (producerId: string) => {
    if (window.confirm('Czy na pewno chcesz usunąć tego rolnika z bazy?')) {
        // 1. Snapshot
        const previousClients = [...clients];
        
        // 2. Optimistic Update
        setClients(prev => prev.filter(c => c.producerId !== producerId));
        if (selectedClientId === producerId) {
            setSelectedClientId(null);
            setCurrentView('FARMERS_LIST');
        }

        // 3. API Call (Guard)
        if (!isOffline) {
            const success = await api.deleteClient(producerId);

            // 4. Rollback
            if (!success) {
                alert("Błąd: Nie udało się usunąć rolnika z bazy.");
                setClients(previousClients);
            }
        }
    }
  };

  // --- RENDER CONTENT ---

  const getSelectedClientDocuments = () => {
      if (!selectedClientId) return [];
      const client = clients.find(c => c.producerId === selectedClientId);
      return client?.documents || [];
  };

  const renderContent = () => {
    switch (currentView) {
      case 'DASHBOARD':
        return userRole === 'ADVISOR' ? (
            <Dashboard 
                farmData={farmData} 
                recentDocuments={getSelectedClientDocuments()}
                onViewAllDocuments={() => setCurrentView('DOCUMENTS')}
                onManageFields={() => setCurrentView('FIELDS')}
            />
        ) : (
            <FarmerDashboard 
                farmData={farmData} 
                onNavigate={setCurrentView}
            />
        );
      case 'FARMERS_LIST':
        return (
            <FarmerList 
                clients={clients}
                onSelectClient={handleSelectClient} 
                onAddClient={handleAddClient}
                onUpdateClient={handleUpdateClient}
                onDeleteClient={handleDeleteClient}
            />
        );
      case 'FIELDS':
        return <FieldManager fields={farmData.fields} setFields={updateFields} csvTemplates={csvTemplates} />;
      case 'DOCUMENTS':
        return (
            <DocumentManager 
                documents={getSelectedClientDocuments()}
                onAddDocument={handleAddDocument}
                onRemoveDocument={handleRemoveDocument}
            />
        );
      case 'OPTIMIZATION':
        return <Optimizer farmData={farmData} />;
      case 'CHAT':
        return <AIChat />;
      case 'ADMIN':
        return (
            <AdminPanel 
                templates={csvTemplates}
                onSaveTemplate={handleSaveTemplate}
                onDeleteTemplate={handleDeleteTemplate}
            />
        );
      case 'CALENDAR':
        return (
            <FarmPlanner 
                tasks={tasks}
                fields={farmData.fields}
                setTasks={setTasks}
                isAdvisor={userRole === 'ADVISOR'}
            />
        );
      default:
        return null;
    }
  };

  if (!isLoggedIn) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar - ONLY FOR ADVISOR */}
      {userRole === 'ADVISOR' && (
          <Navigation 
            currentView={currentView} 
            setView={(view) => { setCurrentView(view); setSidebarOpen(false); }}
            onLogout={handleLogout}
          />
      )}

      {/* Main Content Area */}
      <div className={`flex-1 ${userRole === 'ADVISOR' ? 'md:ml-64' : ''} relative w-full pb-16 md:pb-0`}>
        
        {/* Mobile Header logic */}
        <div className="md:hidden">
            <MobileHeader toggleSidebar={() => userRole === 'ADVISOR' && setSidebarOpen(!sidebarOpen)} />
            {userRole === 'FARMER' && (
                 <div className="absolute top-4 right-4 z-50">
                     <button onClick={handleLogout} className="text-slate-500 hover:text-red-500">
                         <LogOut size={20}/>
                     </button>
                 </div>
            )}
        </div>
        
        {/* Offline Banner */}
        {isOffline && (
            <div className="bg-red-500 text-white px-4 py-2 text-sm text-center font-medium flex items-center justify-center gap-2">
                <WifiOff size={16} />
                <span>Tryb Offline - Dane zapisywane lokalnie (symulacja)</span>
            </div>
        )}
        
        {/* Mobile Sidebar Overlay - ONLY FOR ADVISOR */}
        {sidebarOpen && userRole === 'ADVISOR' && (
            <div className="fixed inset-0 z-40 md:hidden">
                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSidebarOpen(false)}></div>
                <div className="absolute left-0 top-0 h-full w-64 bg-white shadow-xl z-50">
                     {/* Simplified Mobile Sidebar Content */}
                     <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                        <span className="font-bold text-emerald-800">Menu</span>
                        <button onClick={() => setSidebarOpen(false)} className="text-slate-400">✕</button>
                     </div>
                     <div className="p-4 flex flex-col space-y-2">
                        <button onClick={() => { setCurrentView('FARMERS_LIST'); setSidebarOpen(false); }} className="text-left px-4 py-3 rounded-lg bg-emerald-50 text-emerald-800 font-medium">Lista Rolników</button>
                        <button onClick={() => { setCurrentView('DASHBOARD'); setSidebarOpen(false); }} className="text-left px-4 py-3 rounded-lg text-slate-600">Pulpit</button>
                        <button onClick={handleLogout} className="text-left px-4 py-3 text-red-600 font-medium mt-4">Wyloguj</button>
                     </div>
                </div>
            </div>
        )}

        <main className={`p-4 ${userRole === 'ADVISOR' ? 'md:p-8' : 'md:max-w-md md:mx-auto md:bg-white md:shadow-xl md:min-h-screen md:border-x md:border-slate-100'} max-w-7xl mx-auto`}>
          
          {/* Top Context Bar - ONLY FOR ADVISOR when inside a client view */}
          {userRole === 'ADVISOR' && currentView !== 'FARMERS_LIST' && currentView !== 'ADMIN' && (
              <div className="mb-6 bg-slate-800 text-white px-4 py-2 rounded-lg flex justify-between items-center text-sm shadow-md">
                 <div className="flex items-center gap-2 overflow-hidden">
                    <span className="text-slate-400 hidden sm:inline">Obsługiwany klient:</span>
                    <span className="font-semibold truncate">{farmData.farmName}</span>
                 </div>
                 <button 
                    onClick={() => setCurrentView('FARMERS_LIST')}
                    className="text-emerald-400 hover:text-emerald-300 font-medium whitespace-nowrap ml-2"
                 >
                    Zmień
                 </button>
              </div>
          )}

          {renderContent()}
        </main>

        {/* Bottom Navigation - ONLY FOR FARMER */}
        {userRole === 'FARMER' && (
            <MobileNavigation currentView={currentView} setView={setCurrentView} />
        )}

      </div>
    </div>
  );
};

export default App;


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
  const [fieldManagerTab, setFieldManagerTab] = useState<'PARCELS' | 'CROPS'>('PARCELS');
  
  // Data State
  const [clients, setClients] = useState<FarmerClient[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  
  // Persistence: Tasks
  const [tasks, setTasks] = useState<FarmTask[]>(() => {
      try {
          const saved = localStorage.getItem('ao_tasks');
          return saved ? JSON.parse(saved) : MOCK_TASKS;
      } catch (e) {
          console.error("Error loading tasks", e);
          return MOCK_TASKS;
      }
  });

  useEffect(() => {
      localStorage.setItem('ao_tasks', JSON.stringify(tasks));
  }, [tasks]);

  // Active Client State (For Advisor) - uses producerId (EP)
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  // Persistence: CSV Templates
  const [csvTemplates, setCsvTemplates] = useState<CsvTemplate[]>(() => {
      try {
          const saved = localStorage.getItem('ao_csv_templates');
          if (saved) {
              const parsed = JSON.parse(saved);
              if (Array.isArray(parsed) && parsed.length > 0) {
                  return parsed;
              }
          }
      } catch (e) {
          console.error("Error loading CSV templates", e);
      }
      return DEFAULT_CSV_TEMPLATES;
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
    // Strategy:
    // 1. If Online -> Fetch from API (Master of Truth).
    // 2. If API returns EMPTY list (or fails), CHECK LocalStorage. 
    //    This is crucial for "Remember Import" functionality if backend is reset or empty.
    // 3. If LocalStorage empty -> Use Mocks (unless it's the specific demo user 050237165).

    let loadedFields: Field[] = [];
    let loadedFromApi = false;

    // 1. Try API first if online
    if (!isOffline) {
        try {
            const apiFields = await api.getClientFields(client.producerId);
            if (apiFields && apiFields.length > 0) {
                loadedFields = apiFields;
                loadedFromApi = true;
                console.log(`Loaded ${loadedFields.length} fields from API for ${client.producerId}`);
            } else {
                console.log("API returned 0 fields. Checking local storage...");
            }
        } catch (e) {
            console.warn("API load failed, falling back to local storage", e);
        }
    }

    // 2. Fallback/Recovery from LocalStorage
    // If API failed OR returned 0 fields, we try to recover from LocalStorage
    if (!loadedFromApi || loadedFields.length === 0) {
        const storageKey = `fields_${client.producerId}`;
        const localFieldsJson = localStorage.getItem(storageKey);
        if (localFieldsJson) {
            try {
                const parsed = JSON.parse(localFieldsJson);
                if (parsed.length > 0) {
                    loadedFields = parsed;
                    console.log(`Loaded ${loadedFields.length} fields from LocalStorage (Recovery) for ${client.producerId}`);
                }
            } catch (e) {
                console.error("Error parsing local storage fields", e);
            }
        }
    }
    
    // 3. Fallback for demo/mock logic (Generic Mock Fields if list is empty AND offline)
    // We want Linkowski (050237165) to start empty if nothing saved.
    if (loadedFields.length === 0 && !loadedFromApi) {
        if (isOffline && client.producerId !== "050237165") {
             loadedFields = MOCK_FIELDS;
        }
    }

    // 3. Determine Area Logic
    const applicationDoc = client.documents?.find(d => d.category === 'WNIOSEK');
    const calculatedArea = applicationDoc 
        ? client.totalArea 
        : (loadedFields.length > 0 ? parseFloat(loadedFields.reduce((sum, f) => sum + f.area, 0).toFixed(2)) : client.totalArea);

    // Compute display farm name
    const displayFarmName = client.farmName || `${client.lastName} ${client.firstName}`;

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

      // Try LocalStorage for Clients list to remember documents added in previous sessions
      const localClients = localStorage.getItem('agro_clients_list');
      
      if (localClients) {
          data = JSON.parse(localClients);
      } else if (online) {
          data = await api.getClients();
      } else {
          // If offline and no local data, default to mocks
          data = MOCK_CLIENTS;
      }
      
      setClients(data);
      setLoadingClients(false);
  };

  // Save clients to local storage whenever they change to persist documents/status
  useEffect(() => {
      if (clients.length > 0) {
          localStorage.setItem('agro_clients_list', JSON.stringify(clients));
      }
  }, [clients]);

  // --- AUTH HANDLERS ---

  const handleLogin = async (role: UserRole, loginId?: string) => {
    setUserRole(role);
    setIsLoggedIn(true);
    
    if (role === 'ADVISOR') {
        setCurrentView('FARMERS_LIST');
    } else {
        // Init Farmer Data
        const producerId = loginId || "050237165";
        setSelectedClientId(producerId);

        // Try to find if this client exists in our mock/local list, else create dummy
        const existing = clients.find(c => c.producerId === producerId) || MOCK_CLIENTS.find(c => c.producerId === producerId);
        
        const clientInfo: FarmerClient = existing || {
            producerId: producerId,
            firstName: "Rolnik", 
            lastName: "Testowy",
            totalArea: 0,
            status: "ACTIVE",
            lastContact: "",
            documents: [],
            farmName: "Moje Gospodarstwo"
        };
        
        await loadFarmDataForClient(clientInfo);
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
        
        // PERSISTENCE: Save to LocalStorage immediately
        // Use selectedClientId (if Advisor) OR fallback to current profile ID (if Farmer/Auto)
        const pid = selectedClientId || prev.profile.producerId;
        
        if (pid) {
            localStorage.setItem(`fields_${pid}`, JSON.stringify(updatedFields));
        }

        // Save to API (Guard with offline check)
        // Note: For heavy updates like imports, we might prefer explicit saves, but this keeps state consistent
        if (pid && !isOffline) {
            api.saveClientFields(pid, updatedFields).catch(err => console.error("Auto-save error", err));
        }
        return { ...prev, fields: updatedFields };
     });
  };
  
  // Explicit Save Handler for Buttons
  const handleForceSave = async () => {
      const pid = selectedClientId || farmData.profile.producerId;
      if (!pid) return false;
      
      // Update local storage first
      localStorage.setItem(`fields_${pid}`, JSON.stringify(farmData.fields));
      
      if (!isOffline) {
          try {
             await api.saveClientFields(pid, farmData.fields);
             return true;
          } catch (e) {
              console.error("Force save failed", e);
              return false;
          }
      }
      return true; // "Saved" locally
  };

  // --- DOCUMENT HANDLERS ---
  const handleAddDocument = async (doc: FarmerDocument) => {
    const pid = selectedClientId || farmData.profile.producerId;
    if (!pid) return;

    let extractedArea: number | null = null;
    if (doc.category === 'WNIOSEK') {
        const currentFieldSum = farmData.fields.reduce((sum, f) => sum + f.area, 0);
        const baseArea = currentFieldSum > 0 ? currentFieldSum : 10;
        extractedArea = parseFloat((baseArea * (1 + (Math.random() * 0.02 - 0.01))).toFixed(2));
        alert(`Wczytano plik: "${doc.name}"\nZaktualizowano powierzchnię UR w systemie: ${extractedArea} ha.`);
    }

    if (!isOffline) {
        await api.addDocument(pid, doc);
    }

    setClients(prev => prev.map(client => {
        if (client.producerId === pid) {
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
    const pid = selectedClientId || farmData.profile.producerId;
    if (!pid) return;
    
    if (!isOffline) {
        await api.removeDocument(pid, docId);
    }
    
    setClients(prev => prev.map(client => {
        if (client.producerId === pid) {
            return { ...client, documents: (client.documents || []).filter(d => d.id !== docId) };
        }
        return client;
    }));
  };

  // --- TEMPLATE HANDLERS (Admin) ---
  const handleSaveTemplate = (template: CsvTemplate) => {
      setCsvTemplates(prev => {
          const exists = prev.find(t => t.id === template.id);
          let newTemplates;
          if (exists) {
              newTemplates = prev.map(t => t.id === template.id ? template : t);
          } else {
              newTemplates = [...prev, template];
          }
          return newTemplates;
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
        // Clear local storage for this client
        localStorage.removeItem(`fields_${producerId}`);

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
      // Logic: if Advisor, use selectedClientId. If Farmer, use farmData.profile.producerId
      const pid = selectedClientId || farmData.profile.producerId;
      if (!pid) return [];
      
      const client = clients.find(c => c.producerId === pid);
      // Fallback for documents if client not in main list (e.g. initial farmer load)
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
                onManageFields={(tab) => {
                    if (tab) setFieldManagerTab(tab);
                    setCurrentView('FIELDS');
                }}
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
        return (
            <FieldManager 
                fields={farmData.fields} 
                setFields={updateFields} 
                csvTemplates={csvTemplates} 
                initialTab={fieldManagerTab}
                onSave={handleForceSave}
            />
        );
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
                    <span className="font-semibold truncate">
                        {farmData.farmName} 
                        <span className="text-emerald-300 font-mono text-xs ml-2 opacity-80 bg-slate-700 px-1.5 py-0.5 rounded">
                            EP: {farmData.profile.producerId}
                        </span>
                    </span>
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

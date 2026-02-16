
import React, { useState, useEffect } from 'react';
import { Settings, FileSpreadsheet, X, Coins, Sprout, Share2, Search, Map, MessageSquare, Bell, Plus, Trash2, Save, Edit2, AlertCircle, CheckCircle } from 'lucide-react';
import { CsvTemplate, SubsidyRate, CropDefinition, FarmerClient } from '../types';
import { DEFAULT_CROP_DICTIONARY, SUBSIDY_RATES_2026, SUBSIDY_RATES_2025, SUBSIDY_RATES_2024 } from '../constants';
import { api } from '../services/api';
import HierarchyExplorer from './HierarchyExplorer';

interface AdminPanelProps {
  templates: CsvTemplate[];
  onSaveTemplate: (template: CsvTemplate) => void;
  onDeleteTemplate: (id: string) => void;
  selectedGlobalYear: number;
  clients: FarmerClient[];
}

interface SystemMessage {
    id: string;
    title: string;
    content: string;
    date: string;
    type: 'INFO' | 'ALERT' | 'SUCCESS';
}

const AdminPanel: React.FC<AdminPanelProps> = ({ templates, onSaveTemplate, onDeleteTemplate, selectedGlobalYear, clients }) => {
  const [activeMainTab, setActiveMainTab] = useState<'PARCELS' | 'CROPS' | 'RATES' | 'MESSAGES' | 'AUDIT'>('PARCELS');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // --- RATES STATE ---
  const [rates, setRates] = useState<SubsidyRate[]>([]);
  const [rateCategoryFilter, setRateCategoryFilter] = useState<'ALL' | 'DOPLATA' | 'EKOSCHEMAT'>('ALL');
  const [selectedRateYear, setSelectedRateYear] = useState<number>(selectedGlobalYear);
  const [editingRate, setEditingRate] = useState<SubsidyRate | null>(null);
  const [rateForm, setRateForm] = useState<Partial<SubsidyRate>>({});

  // --- CROPS STATE ---
  const [crops, setCrops] = useState<CropDefinition[]>([]);
  const [cropSearch, setCropSearch] = useState('');
  const [cropSubTab, setCropSubTab] = useState<'TEMPLATES' | 'DICTIONARY'>('DICTIONARY');

  // --- TEMPLATES STATE ---
  const [editingTemplate, setEditingTemplate] = useState<CsvTemplate | null>(null);

  // --- MESSAGES STATE ---
  const [messages, setMessages] = useState<SystemMessage[]>([
      { id: '1', title: 'Start Kampanii 2025', content: 'Rozpoczynamy nabór wniosków w systemie AgroOptima.', date: '2025-03-15', type: 'INFO' },
      { id: '2', title: 'Zmiana stawek ekoschematów', content: 'Zaktualizowano stawki dla rolnictwa węglowego.', date: '2025-03-20', type: 'ALERT' }
  ]);
  const [newMessage, setNewMessage] = useState<Partial<SystemMessage>>({ type: 'INFO' });

  const availableYears = [2026, 2025, 2024, 2023, 2022, 2021];

  useEffect(() => {
    fetchData();
  }, [activeMainTab]);

  const fetchData = async () => {
    setIsProcessing(true);
    try {
        if (activeMainTab === 'RATES') {
            const data = await api.getRates();
            setRates(data.length > 0 ? data : [...SUBSIDY_RATES_2026, ...SUBSIDY_RATES_2025, ...SUBSIDY_RATES_2024]);
        } else if (activeMainTab === 'CROPS') {
            const data = await api.getCrops();
            setCrops(data.length > 0 ? data : DEFAULT_CROP_DICTIONARY);
        }
    } catch (e) {
        console.error(e);
    } finally {
        setIsProcessing(false);
    }
  };

  const handleSaveRate = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!rateForm.name) return;
      setIsProcessing(true);
      const toSave = { ...rateForm, id: rateForm.id || `rate_${Date.now()}`, year: selectedRateYear } as SubsidyRate;
      try {
          await api.saveRate(toSave);
          await fetchData();
          setEditingRate(null);
      } catch (e) { alert("Błąd zapisu."); } finally { setIsProcessing(false); }
  };

  const handleAddMessage = () => {
      if (!newMessage.title || !newMessage.content) return;
      const msg: SystemMessage = {
          id: Date.now().toString(),
          title: newMessage.title,
          content: newMessage.content,
          date: new Date().toISOString().split('T')[0],
          type: newMessage.type as any || 'INFO'
      };
      setMessages([msg, ...messages]);
      setNewMessage({ type: 'INFO', title: '', content: '' });
  };

  const handleDeleteMessage = (id: string) => {
      setMessages(messages.filter(m => m.id !== id));
  };

  // --- TEMPLATE HANDLERS ---
  const handleCreateTemplate = (type: 'PARCELS' | 'CROPS') => {
      const newTemplate: CsvTemplate = {
          id: `tpl_${Date.now()}`,
          name: type === 'PARCELS' ? 'Nowy Szablon Ewidencji' : 'Nowy Szablon Zasiewów',
          type: type,
          year: selectedGlobalYear,
          separator: ';',
          mappings: type === 'PARCELS' ? {
              name: 'Identyfikator',
              registrationNumber: 'Numer Działki',
              area: 'Powierzchnia',
              eligibleArea: 'PEG',
              commune: 'Gmina',
              precinctName: 'Obręb',
              precinctNumber: 'Nr obrębu',
              mapSheet: 'Arkusz'
          } : {
              registrationNumber: 'Nr działki',
              crop: 'Roślina',
              area: 'Powierzchnia',
              ecoSchemes: 'Ekoschematy'
          }
      };
      setEditingTemplate(newTemplate);
  };

  const handleSaveCurrentTemplate = () => {
      if (editingTemplate) {
          onSaveTemplate(editingTemplate);
          setEditingTemplate(null);
      }
  };

  const updateMapping = (key: string, value: string) => {
      if (editingTemplate) {
          setEditingTemplate({
              ...editingTemplate,
              mappings: { ...editingTemplate.mappings, [key]: value }
          });
      }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
        <div>
            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                <Settings className="text-emerald-600" size={28} />
                Panel Administracyjny
            </h2>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Konfiguracja Systemu WPR</p>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="flex p-1 bg-slate-200/50 rounded-xl w-fit border border-slate-200 shadow-inner overflow-x-auto">
          <button onClick={() => setActiveMainTab('PARCELS')} className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-xs font-black transition-all uppercase tracking-widest whitespace-nowrap ${activeMainTab === 'PARCELS' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              <Map size={16} /> Działki
          </button>
          <button onClick={() => setActiveMainTab('CROPS')} className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-xs font-black transition-all uppercase tracking-widest whitespace-nowrap ${activeMainTab === 'CROPS' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              <Sprout size={16} /> Zasiewy
          </button>
          <button onClick={() => setActiveMainTab('RATES')} className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-xs font-black transition-all uppercase tracking-widest whitespace-nowrap ${activeMainTab === 'RATES' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              <Coins size={16} /> Stawki
          </button>
          <button onClick={() => setActiveMainTab('MESSAGES')} className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-xs font-black transition-all uppercase tracking-widest whitespace-nowrap ${activeMainTab === 'MESSAGES' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              <MessageSquare size={16} /> Wiadomości
          </button>
          <button onClick={() => setActiveMainTab('AUDIT')} className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-xs font-black transition-all uppercase tracking-widest whitespace-nowrap ${activeMainTab === 'AUDIT' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              <Share2 size={16} /> Audyt
          </button>
      </div>

      <div className="min-h-[600px]">
          
          {/* === MODUŁ DZIAŁKI (PARCELS) === */}
          {activeMainTab === 'PARCELS' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-1 space-y-4">
                      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                          <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest mb-4 flex items-center gap-2">
                              <FileSpreadsheet size={18} className="text-blue-600"/> Szablony Ewidencji
                          </h3>
                          <div className="space-y-2">
                              {templates.filter(t => t.type === 'PARCELS').map(tpl => (
                                  <div key={tpl.id} className={`p-4 rounded-xl border-2 flex justify-between items-center transition-all ${editingTemplate?.id === tpl.id ? 'border-emerald-500 bg-emerald-50' : 'border-slate-50 bg-slate-50 hover:border-emerald-200'}`}>
                                      <div onClick={() => setEditingTemplate(tpl)} className="cursor-pointer flex-1 truncate pr-2">
                                          <div className="font-black text-slate-800 text-xs truncate">{tpl.name}</div>
                                          <div className="text-[10px] text-slate-400 font-bold uppercase mt-1">Kampania {tpl.year}</div>
                                      </div>
                                      <button onClick={(e) => {e.stopPropagation(); onDeleteTemplate(tpl.id);}} className="text-slate-300 hover:text-red-500 transition-colors p-1"><Trash2 size={14}/></button>
                                  </div>
                              ))}
                          </div>
                          <button onClick={() => handleCreateTemplate('PARCELS')} className="w-full mt-6 py-3 bg-emerald-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2">
                              <Plus size={16} /> Nowy Szablon Działek
                          </button>
                      </div>
                  </div>
                  <div className="lg:col-span-2">
                      {editingTemplate ? (
                          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                              <div className="flex justify-between items-center mb-6">
                                  <h3 className="text-lg font-black text-slate-800">Edycja Szablonu</h3>
                                  <button onClick={() => setEditingTemplate(null)}><X size={20}/></button>
                              </div>
                              <div className="space-y-6">
                                  <div className="grid grid-cols-2 gap-4">
                                      <div className="col-span-2">
                                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nazwa Szablonu</label>
                                          <input type="text" value={editingTemplate.name} onChange={(e) => setEditingTemplate({...editingTemplate, name: e.target.value})} className="w-full border border-slate-200 p-3 rounded-xl font-bold bg-slate-50" />
                                      </div>
                                      <div>
                                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Rok Kampanii</label>
                                          <select value={editingTemplate.year} onChange={(e) => setEditingTemplate({...editingTemplate, year: Number(e.target.value)})} className="w-full border border-slate-200 p-3 rounded-xl font-bold bg-slate-50">
                                              {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                                          </select>
                                      </div>
                                      <div>
                                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Separator</label>
                                          <input type="text" value={editingTemplate.separator} onChange={(e) => setEditingTemplate({...editingTemplate, separator: e.target.value})} className="w-full border border-slate-200 p-3 rounded-xl font-bold bg-slate-50" placeholder="np. ; lub ," />
                                      </div>
                                  </div>

                                  <div className="border-t border-slate-100 pt-4">
                                      <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest mb-4">Mapowanie Kolumn CSV</h4>
                                      <div className="space-y-4">
                                          {Object.entries(editingTemplate.mappings).map(([key, val]) => (
                                              <div key={key} className="flex items-center gap-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                                  <div className="w-1/3 text-[10px] font-black text-slate-400 uppercase tracking-widest">{key}</div>
                                                  <input type="text" value={val as string} onChange={(e) => updateMapping(key, e.target.value)} className="flex-1 bg-white border border-slate-200 p-2 rounded-lg font-bold text-xs" placeholder={`Nagłówek w pliku CSV dla ${key}`} />
                                              </div>
                                          ))}
                                      </div>
                                  </div>
                              </div>
                              <button onClick={handleSaveCurrentTemplate} className="w-full mt-8 py-4 bg-slate-900 text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-xl flex items-center justify-center gap-2 hover:bg-black transition-all">
                                  <Save size={16} /> Zapisz Szablon
                              </button>
                          </div>
                      ) : (
                          <div className="h-full flex flex-col items-center justify-center text-slate-300 bg-white rounded-2xl border border-slate-200 border-dashed">
                              <Map size={48} className="mb-4 opacity-10" />
                              <p className="font-black uppercase text-xs tracking-widest">Wybierz szablon ewidencji</p>
                          </div>
                      )}
                  </div>
              </div>
          )}

          {/* === MODUŁ ZASIEWY (CROPS) === */}
          {activeMainTab === 'CROPS' && (
              <div className="space-y-6">
                  <div className="flex justify-center">
                       <div className="flex p-1 bg-slate-100 rounded-lg gap-1">
                          <button onClick={() => setCropSubTab('DICTIONARY')} className={`px-6 py-2 rounded-md text-[10px] font-black uppercase transition-all ${cropSubTab === 'DICTIONARY' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-400'}`}>Słownik Roślin</button>
                          <button onClick={() => setCropSubTab('TEMPLATES')} className={`px-6 py-2 rounded-md text-[10px] font-black uppercase transition-all ${cropSubTab === 'TEMPLATES' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-400'}`}>Szablony Importu</button>
                      </div>
                  </div>

                  {cropSubTab === 'DICTIONARY' ? (
                      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h3 className="text-lg font-black text-slate-800">Słownik Upraw Agrotechnicznych</h3>
                                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Baza roślin i parametrów dla ekoschematów</p>
                            </div>
                            <div className="flex gap-4">
                                <div className="relative">
                                    <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                                    <input type="text" placeholder="Szukaj uprawy..." value={cropSearch} onChange={e => setCropSearch(e.target.value)} className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-emerald-500 outline-none" />
                                </div>
                                <button className="bg-emerald-600 text-white px-6 py-2 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg">Dodaj Uprawę</button>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {crops.filter(c => c.name.toLowerCase().includes(cropSearch.toLowerCase())).map(crop => (
                                <div key={crop.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex justify-between items-center group hover:border-emerald-200 transition-all">
                                    <div>
                                        <div className="font-black text-slate-800 text-xs">{crop.name}</div>
                                        <div className="text-[9px] font-bold text-slate-400 uppercase mt-1">{crop.type}</div>
                                    </div>
                                    <div className="flex gap-1">
                                        {crop.isLegume && <span className="w-1.5 h-1.5 rounded-full bg-blue-400" title="Bobowata"></span>}
                                        {crop.isCatchCrop && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Poplonowa"></span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                      </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-1 space-y-4">
                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest mb-4 flex items-center gap-2"><FileSpreadsheet size={18} className="text-emerald-600"/> Szablony Zasiewów</h3>
                                <div className="space-y-2">
                                    {templates.filter(t => t.type === 'CROPS').map(tpl => (
                                        <div key={tpl.id} className={`p-4 rounded-xl border-2 flex justify-between items-center transition-all ${editingTemplate?.id === tpl.id ? 'border-emerald-500 bg-emerald-50' : 'border-slate-50 bg-slate-50 hover:border-emerald-200'}`}>
                                            <div onClick={() => setEditingTemplate(tpl)} className="cursor-pointer flex-1 truncate pr-2">
                                                <div className="font-black text-slate-800 text-xs truncate">{tpl.name}</div>
                                                <div className="text-[10px] text-slate-400 font-bold uppercase mt-1">Kampania {tpl.year}</div>
                                            </div>
                                            <button onClick={(e) => {e.stopPropagation(); onDeleteTemplate(tpl.id);}} className="text-slate-300 hover:text-red-500 transition-colors p-1"><Trash2 size={14}/></button>
                                        </div>
                                    ))}
                                </div>
                                <button onClick={() => handleCreateTemplate('CROPS')} className="w-full mt-6 py-3 bg-emerald-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2">
                                    <Plus size={16} /> Nowy Szablon Zasiewów
                                </button>
                            </div>
                        </div>
                        <div className="lg:col-span-2">
                            {editingTemplate ? (
                                <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="text-lg font-black text-slate-800">Edycja Szablonu</h3>
                                        <button onClick={() => setEditingTemplate(null)}><X size={20}/></button>
                                    </div>
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="col-span-2">
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nazwa Szablonu</label>
                                                <input type="text" value={editingTemplate.name} onChange={(e) => setEditingTemplate({...editingTemplate, name: e.target.value})} className="w-full border border-slate-200 p-3 rounded-xl font-bold bg-slate-50" />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Rok Kampanii</label>
                                                <select value={editingTemplate.year} onChange={(e) => setEditingTemplate({...editingTemplate, year: Number(e.target.value)})} className="w-full border border-slate-200 p-3 rounded-xl font-bold bg-slate-50">
                                                    {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Separator</label>
                                                <input type="text" value={editingTemplate.separator} onChange={(e) => setEditingTemplate({...editingTemplate, separator: e.target.value})} className="w-full border border-slate-200 p-3 rounded-xl font-bold bg-slate-50" placeholder="np. ; lub ," />
                                            </div>
                                        </div>

                                        <div className="border-t border-slate-100 pt-4">
                                            <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest mb-4">Mapowanie Kolumn CSV</h4>
                                            <div className="space-y-4">
                                                {Object.entries(editingTemplate.mappings).map(([key, val]) => (
                                                    <div key={key} className="flex items-center gap-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                                        <div className="w-1/3 text-[10px] font-black text-slate-400 uppercase tracking-widest">{key}</div>
                                                        <input type="text" value={val as string} onChange={(e) => updateMapping(key, e.target.value)} className="flex-1 bg-white border border-slate-200 p-2 rounded-lg font-bold text-xs" placeholder={`Nagłówek w pliku CSV dla ${key}`} />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <button onClick={handleSaveCurrentTemplate} className="w-full mt-8 py-4 bg-slate-900 text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-xl flex items-center justify-center gap-2 hover:bg-black transition-all">
                                        <Save size={16} /> Zapisz Szablon
                                    </button>
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-slate-300 bg-white rounded-2xl border border-slate-200 border-dashed">
                                    <Sprout size={48} className="mb-4 opacity-10" />
                                    <p className="font-black uppercase text-xs tracking-widest">Wybierz szablon zasiewów</p>
                                </div>
                            )}
                        </div>
                    </div>
                  )}
              </div>
          )}

          {/* === MODUŁ STAWKI (RATES) === */}
          {activeMainTab === 'RATES' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[700px]">
                      <div className="space-y-4 mb-6">
                          <select value={selectedRateYear} onChange={(e) => setSelectedRateYear(Number(e.target.value))} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-black text-slate-700 outline-none">
                              {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                          </select>
                          <div className="flex p-1 bg-slate-100 rounded-lg gap-1">
                              <button onClick={() => setRateCategoryFilter('ALL')} className={`flex-1 py-2 rounded-md text-[10px] font-black uppercase transition-all ${rateCategoryFilter === 'ALL' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'}`}>Wszystkie</button>
                              <button onClick={() => setRateCategoryFilter('DOPLATA')} className={`flex-1 py-2 rounded-md text-[10px] font-black uppercase transition-all ${rateCategoryFilter === 'DOPLATA' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>Bezpośrednie</button>
                              <button onClick={() => setRateCategoryFilter('EKOSCHEMAT')} className={`flex-1 py-2 rounded-md text-[10px] font-black uppercase transition-all ${rateCategoryFilter === 'EKOSCHEMAT' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}>Ekoschematy</button>
                          </div>
                      </div>
                      <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                          {rates.filter(r => (rateCategoryFilter === 'ALL' || r.category === rateCategoryFilter) && r.year === selectedRateYear).map(rate => (
                              <div key={rate.id} onClick={() => {setEditingRate(rate); setRateForm(rate);}} className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${editingRate?.id === rate.id ? 'border-emerald-500 bg-emerald-50' : 'border-slate-50 bg-white hover:border-emerald-200'}`}>
                                  <div className="flex justify-between items-start">
                                      <div className="font-black text-slate-800 text-xs line-clamp-1 flex-1 pr-2">{rate.name}</div>
                                      <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border uppercase ${rate.category === 'EKOSCHEMAT' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-blue-100 text-blue-700 border-blue-200'}`}>{rate.category === 'EKOSCHEMAT' ? 'EKO' : 'BEZP'}</span>
                                  </div>
                                  <div className="text-emerald-600 font-black text-xs mt-1">{rate.rate} {rate.unit} {rate.points ? `• ${rate.points} pkt` : ''}</div>
                              </div>
                          ))}
                      </div>
                      <button onClick={() => {setEditingRate(null); setRateForm({category: 'EKOSCHEMAT', unit: 'PLN/ha'});}} className="w-full mt-4 py-3 bg-slate-900 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg">Dodaj Stawkę</button>
                  </div>
                  <div className="lg:col-span-2">
                      {editingRate || rateForm.category ? (
                          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm animate-in fade-in slide-in-from-right-4">
                              <h3 className="text-xl font-black text-slate-800 mb-8">{editingRate ? 'Edycja Stawki' : 'Nowa Definicja Płatności'}</h3>
                              <form onSubmit={handleSaveRate} className="space-y-6">
                                  <div className="grid grid-cols-2 gap-6">
                                      <div className="col-span-2">
                                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nazwa</label>
                                          <input type="text" value={rateForm.name || ''} onChange={e => setRateForm({...rateForm, name: e.target.value})} className="w-full border border-slate-200 p-3 rounded-xl font-bold bg-slate-50" />
                                      </div>
                                      <div>
                                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Kategoria</label>
                                          <select value={rateForm.category || 'EKOSCHEMAT'} onChange={e => setRateForm({...rateForm, category: e.target.value as any})} className="w-full border border-slate-200 p-3 rounded-xl font-bold bg-slate-50">
                                              <option value="DOPLATA">Płatność Bezpośrednia</option>
                                              <option value="EKOSCHEMAT">Ekoschemat</option>
                                          </select>
                                      </div>
                                      <div>
                                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Stawka</label>
                                          <input type="number" step="0.01" value={rateForm.rate || ''} onChange={e => setRateForm({...rateForm, rate: parseFloat(e.target.value)})} className="w-full border border-slate-200 p-3 rounded-xl font-bold bg-slate-50" />
                                      </div>
                                      {rateForm.category === 'EKOSCHEMAT' && (
                                          <div>
                                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Punkty (ha)</label>
                                              <input type="number" step="0.1" value={rateForm.points || ''} onChange={e => setRateForm({...rateForm, points: parseFloat(e.target.value)})} className="w-full border border-emerald-200 p-3 rounded-xl font-bold bg-emerald-50/30" />
                                          </div>
                                      )}
                                  </div>
                                  <div className="flex justify-end gap-3 pt-4">
                                      <button type="button" onClick={() => {setEditingRate(null); setRateForm({});}} className="px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest text-slate-400">Anuluj</button>
                                      <button type="submit" className="px-10 py-3 bg-emerald-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg">Zapisz Stawkę</button>
                                  </div>
                              </form>
                          </div>
                      ) : (
                          <div className="h-full flex flex-col items-center justify-center text-slate-300 bg-white rounded-2xl border border-slate-200 border-dashed">
                              <Coins size={48} className="mb-4 opacity-10" />
                              <p className="font-black uppercase text-xs tracking-widest">Wybierz stawkę do edycji</p>
                          </div>
                      )}
                  </div>
              </div>
          )}

          {/* === MODUŁ WIADOMOŚCI (MESSAGES) === */}
          {activeMainTab === 'MESSAGES' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-4">
                      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                          <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest mb-4 flex items-center gap-2">
                              <Bell size={18} className="text-amber-500" /> Nadaj Komunikat Systemowy
                          </h3>
                          <div className="space-y-4">
                              <input 
                                  type="text" 
                                  placeholder="Tytuł wiadomości..." 
                                  value={newMessage.title || ''}
                                  onChange={e => setNewMessage({...newMessage, title: e.target.value})}
                                  className="w-full border border-slate-200 p-3 rounded-xl font-bold bg-slate-50"
                              />
                              <textarea 
                                  placeholder="Treść komunikatu dla rolników..." 
                                  value={newMessage.content || ''}
                                  onChange={e => setNewMessage({...newMessage, content: e.target.value})}
                                  className="w-full border border-slate-200 p-3 rounded-xl font-medium bg-slate-50 h-32 resize-none"
                              ></textarea>
                              <div className="flex gap-2">
                                  {['INFO', 'ALERT', 'SUCCESS'].map(type => (
                                      <button 
                                          key={type}
                                          onClick={() => setNewMessage({...newMessage, type: type as any})}
                                          className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all ${newMessage.type === type ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-400 border-slate-200'}`}
                                      >
                                          {type}
                                      </button>
                                  ))}
                              </div>
                              <button onClick={handleAddMessage} className="w-full py-3 bg-emerald-600 text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-lg">Wyślij Komunikat</button>
                          </div>
                      </div>
                  </div>
                  
                  <div className="space-y-3">
                      <h3 className="font-black text-slate-400 text-xs uppercase tracking-widest px-2">Historia Wiadomości</h3>
                      {messages.map(msg => (
                          <div key={msg.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex gap-4 items-start group">
                              <div className={`p-2 rounded-lg ${msg.type === 'ALERT' ? 'bg-red-100 text-red-600' : msg.type === 'SUCCESS' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                                  <MessageSquare size={16} />
                              </div>
                              <div className="flex-1">
                                  <div className="flex justify-between items-start">
                                      <h4 className="font-black text-slate-800">{msg.title}</h4>
                                      <span className="text-[10px] text-slate-400 font-bold">{msg.date}</span>
                                  </div>
                                  <p className="text-sm text-slate-500 mt-1">{msg.content}</p>
                              </div>
                              <button onClick={() => handleDeleteMessage(msg.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16}/></button>
                          </div>
                      ))}
                  </div>
              </div>
          )}

          {/* === MODUŁ AUDYT (DAG) === */}
          {activeMainTab === 'AUDIT' && (
              <div className="space-y-6">
                   <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
                       <div className="flex items-center gap-4">
                           <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Share2 size={24}/></div>
                           <div>
                               <h3 className="font-black text-slate-800">Eksplorator Struktury DAG</h3>
                               <p className="text-xs text-slate-500 font-medium uppercase tracking-widest">Weryfikacja logiczna kampanii dopłat</p>
                           </div>
                       </div>
                       <select className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl font-bold text-sm outline-none">
                           {clients.map(c => <option key={c.producerId} value={c.producerId}>{c.lastName} {c.firstName}</option>)}
                       </select>
                   </div>
                   <HierarchyExplorer selectedYear={selectedGlobalYear} farmData={{ farmName: clients[0]?.farmName || 'Gospodarstwo', profile: { producerId: clients[0]?.producerId || '', totalAreaUR: 0, entryConditionPoints: 0 }, fields: [] }} />
              </div>
          )}
      </div>
    </div>
  );
};

export default AdminPanel;

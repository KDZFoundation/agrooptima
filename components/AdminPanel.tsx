
import React, { useState, useEffect, useRef } from 'react';
import { Settings, Plus, Save, Trash2, Edit, FileSpreadsheet, ChevronRight, X, AlertCircle, Coins, DollarSign, Calendar, Copy, UploadCloud, RefreshCw, Sprout, Leaf } from 'lucide-react';
import { CsvTemplate, CsvTemplateType, SubsidyRate, CropDefinition } from '../types';
import { CSV_PARCEL_FIELDS, CSV_CROP_FIELDS, SUBSIDY_RATES_2026, SUBSIDY_RATES_2025, DEFAULT_CROP_DICTIONARY } from '../constants';
import { api } from '../services/api';

interface AdminPanelProps {
  templates: CsvTemplate[];
  onSaveTemplate: (template: CsvTemplate) => void;
  onDeleteTemplate: (id: string) => void;
}

interface MappingRow {
    systemKey: string;
    csvHeader: string;
    label: string;
    isSystem: boolean;
    required: boolean;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ templates, onSaveTemplate, onDeleteTemplate }) => {
  const [activeMainTab, setActiveMainTab] = useState<'CSV' | 'RATES' | 'CROPS'>('CSV');
  
  // CSV State
  const [activeCsvTab, setActiveCsvTab] = useState<CsvTemplateType>('PARCELS');
  const [editingTemplate, setEditingTemplate] = useState<CsvTemplate | null>(null);
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
  
  // Template Form State
  const [formName, setFormName] = useState('');
  const [formSeparator, setFormSeparator] = useState(';');
  const [formYear, setFormYear] = useState<number>(2026);
  const [mappingRows, setMappingRows] = useState<MappingRow[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Rates State
  const [rates, setRates] = useState<SubsidyRate[]>([]);
  const [editingRate, setEditingRate] = useState<SubsidyRate | null>(null);
  const [isCreatingRate, setIsCreatingRate] = useState(false);
  const [rateForm, setRateForm] = useState<Partial<SubsidyRate>>({});
  const [selectedRateYear, setSelectedRateYear] = useState<number>(2026);

  // Crops Dictionary State
  const [crops, setCrops] = useState<CropDefinition[]>([]);
  const [editingCrop, setEditingCrop] = useState<CropDefinition | null>(null);
  const [isCreatingCrop, setIsCreatingCrop] = useState(false);
  const [cropForm, setCropForm] = useState<Partial<CropDefinition>>({});

  const availableYears = [2026, 2025, 2024, 2023];

  useEffect(() => {
    if (activeMainTab === 'RATES') {
        fetchRates();
    } else if (activeMainTab === 'CROPS') {
        fetchCrops();
    }
  }, [activeMainTab]);

  const fetchRates = async () => {
    let data = await api.getRates();
    if (data.length === 0) {
        // Fallback to constants if DB empty
        data = [
            ...SUBSIDY_RATES_2026.map(r => ({...r, year: 2026})),
            ...SUBSIDY_RATES_2025.map(r => ({...r, year: 2025}))
        ];
    }
    setRates(data);
  };

  const fetchCrops = async () => {
      let data = await api.getCrops();
      if (data.length === 0) {
          data = DEFAULT_CROP_DICTIONARY;
      }
      setCrops(data);
  };

  // --- CSV LOGIC ---

  const initializeRows = (templateType: CsvTemplateType, existingMappings: Record<string, string> | null | undefined) => {
      const systemFields = templateType === 'PARCELS' ? CSV_PARCEL_FIELDS : CSV_CROP_FIELDS;
      const rows: MappingRow[] = [];
      const usedKeys = new Set<string>();
      const safeMappings = existingMappings || {};

      systemFields.forEach(field => {
          rows.push({
              systemKey: field.key,
              csvHeader: safeMappings[field.key] || '',
              label: field.label,
              isSystem: true,
              required: field.required
          });
          usedKeys.add(field.key);
      });

      // Add extra mappings found in the template that are not system fields
      Object.entries(safeMappings).forEach(([key, header]) => {
          if (!usedKeys.has(key)) {
              rows.push({
                  systemKey: key,
                  csvHeader: header,
                  label: 'Pole Niestandardowe',
                  isSystem: false,
                  required: false
              });
          }
      });

      return rows;
  };

  const handleEditTemplate = (template: CsvTemplate) => {
    setEditingTemplate(template);
    setIsCreatingTemplate(false);
    setFormName(template.name);
    setFormSeparator(template.separator);
    setFormYear(template.year || 2026);
    setMappingRows(initializeRows(template.type, template.mappings));
  };

  const handleCreateNewTemplate = () => {
    setEditingTemplate(null);
    setIsCreatingTemplate(true);
    setFormName('');
    setFormSeparator(';');
    setFormYear(2026);
    setMappingRows(initializeRows(activeCsvTab, {}));
  };

  const addCustomRow = () => {
      setMappingRows(prev => [
          ...prev, 
          { systemKey: '', csvHeader: '', label: 'Nowa Kolumna', isSystem: false, required: false }
      ]);
  };

  const removeRow = (index: number) => {
      setMappingRows(prev => prev.filter((_, i) => i !== index));
  };

  const updateRow = (index: number, field: keyof MappingRow, value: string) => {
      setMappingRows(prev => prev.map((row, i) => {
          if (i !== index) return row;
          return { ...row, [field]: value };
      }));
  };

  // --- CSV FILE PARSING LOGIC ---
  const handleImportTemplateFromCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (evt) => {
          const text = evt.target?.result as string;
          if (!text) return;

          const firstLine = text.split('\n')[0].trim();
          if (!firstLine) return;

          // Auto-detect separator if not explicitly set by user choice (though we default to semicolon)
          let detectedSeparator = formSeparator;
          if ((firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length) {
              detectedSeparator = ';';
          } else {
              detectedSeparator = ',';
          }
          setFormSeparator(detectedSeparator);

          // Parse Headers
          // Handle quotes roughly
          const headers = firstLine.split(detectedSeparator).map(h => h.trim().replace(/^"|"$/g, ''));

          // Auto-Map Logic
          // We iterate over current mappingRows (System Fields) and try to find a match in CSV headers
          const updatedRows = mappingRows.map(row => {
              if (row.isSystem) {
                  // Heuristic: Try to find a header that contains the label or key
                  const match = headers.find(h => 
                      h.toLowerCase() === row.label.toLowerCase() || 
                      h.toLowerCase().includes(row.label.toLowerCase()) ||
                      h.toLowerCase() === row.systemKey.toLowerCase()
                  );
                  return match ? { ...row, csvHeader: match } : row;
              }
              return row;
          });

          setMappingRows(updatedRows);
          alert(`Wczytano ${headers.length} nagłówków. Dopasowano automatycznie: ${updatedRows.filter(r => r.csvHeader).length} pól.`);
      };
      reader.readAsText(file);
      // Reset input
      if(fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmitTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    const newMappings: Record<string, string> = {};
    mappingRows.forEach(row => {
        if (row.systemKey && row.systemKey.trim()) {
            newMappings[row.systemKey.trim()] = row.csvHeader.trim();
        }
    });

    const newId = `tpl_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const id = editingTemplate ? editingTemplate.id : newId;
    const type = editingTemplate ? editingTemplate.type : activeCsvTab;

    const templateToSave: CsvTemplate = {
        id: id,
        name: formName || 'Bez nazwy',
        type: type,
        year: formYear,
        separator: formSeparator,
        mappings: newMappings
    };

    onSaveTemplate(templateToSave);
    setEditingTemplate(null);
    setIsCreatingTemplate(false);
    setFormName('');
    setMappingRows([]);
  };

  // --- RATES LOGIC ---

  const handleEditRate = (rate: SubsidyRate) => {
      setEditingRate(rate);
      setIsCreatingRate(false);
      setRateForm(rate);
  };

  const handleCreateRate = () => {
      setEditingRate(null);
      setIsCreatingRate(true);
      setRateForm({
          id: `R${Date.now()}`,
          name: '',
          rate: 0,
          unit: 'PLN/ha',
          category: 'EKOSCHEMAT',
          year: selectedRateYear // Auto-assign selected year
      });
  };

  const handleCloneYear = () => {
      if(window.confirm(`Czy chcesz skopiować stawki z roku ${selectedRateYear - 1} do roku ${selectedRateYear}?`)) {
         alert("Funkcja klonowania stawek zostanie zaimplementowana po stronie backendu.");
      }
  };

  const handleSaveRate = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!rateForm.name || !rateForm.id) return;
      
      const rateToSave = rateForm as SubsidyRate;
      await api.saveRate(rateToSave);
      
      setRates(prev => {
          const exists = prev.find(r => r.id === rateToSave.id);
          if (exists) return prev.map(r => r.id === rateToSave.id ? rateToSave : r);
          return [...prev, rateToSave];
      });

      setEditingRate(null);
      setIsCreatingRate(false);
      setRateForm({});
  };

  const handleDeleteRate = async (id: string) => {
      if (window.confirm("Usunąć stawkę?")) {
          await api.deleteRate(id);
          setRates(prev => prev.filter(r => r.id !== id));
          if (editingRate?.id === id) {
              setEditingRate(null);
              setIsCreatingRate(false);
          }
      }
  };

  // --- CROPS LOGIC ---
  const handleEditCrop = (crop: CropDefinition) => {
      setEditingCrop(crop);
      setIsCreatingCrop(false);
      setCropForm(crop);
  };

  const handleCreateCrop = () => {
      setEditingCrop(null);
      setIsCreatingCrop(true);
      setCropForm({
          id: `C${Date.now()}`,
          name: '',
          type: 'Zboża',
          isLegume: false,
          isCatchCrop: false
      });
  };

  const handleSaveCrop = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!cropForm.name || !cropForm.id) return;

      const cropToSave = cropForm as CropDefinition;
      await api.saveCrop(cropToSave);

      setCrops(prev => {
          const exists = prev.find(c => c.id === cropToSave.id);
          if (exists) return prev.map(c => c.id === cropToSave.id ? cropToSave : c);
          return [...prev, cropToSave];
      });
      
      setEditingCrop(null);
      setIsCreatingCrop(false);
      setCropForm({});
  };

  const handleDeleteCrop = async (id: string) => {
      if (window.confirm("Usunąć uprawę ze słownika?")) {
          await api.deleteCrop(id);
          setCrops(prev => prev.filter(c => c.id !== id));
          if (editingCrop?.id === id) {
              setEditingCrop(null);
              setIsCreatingCrop(false);
          }
      }
  };


  // Filter rates by selected year
  const activeRates = rates.filter(r => r.year === selectedRateYear);
  const activeTemplates = templates.filter(t => t.type === activeCsvTab);

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
             <Settings className="text-slate-600" />
             Panel Administratora
          </h2>
          <p className="text-slate-500 mt-1">
              Zarządzanie systemem i konfiguracja.
          </p>
        </div>
      </div>

      {/* TOP NAVIGATION TABS */}
      <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl w-fit">
          <button
            onClick={() => setActiveMainTab('CSV')}
            className={`px-6 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all ${
                activeMainTab === 'CSV' 
                ? 'bg-white text-emerald-700 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <FileSpreadsheet size={18} />
            Szablony CSV
          </button>
          <button
            onClick={() => setActiveMainTab('RATES')}
            className={`px-6 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all ${
                activeMainTab === 'RATES' 
                ? 'bg-white text-emerald-700 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Coins size={18} />
            Stawki i Płatności
          </button>
          <button
            onClick={() => setActiveMainTab('CROPS')}
            className={`px-6 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all ${
                activeMainTab === 'CROPS' 
                ? 'bg-white text-emerald-700 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Sprout size={18} />
            Słownik Upraw
          </button>
      </div>

      {/* CONTENT: CSV TEMPLATES */}
      {activeMainTab === 'CSV' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* ... Existing CSV Content ... */}
             <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex space-x-2 mb-6 border-b border-slate-100 pb-2">
                    <button onClick={() => { setActiveCsvTab('PARCELS'); setEditingTemplate(null); }} className={`pb-2 px-1 text-sm font-semibold transition-colors border-b-2 ${activeCsvTab === 'PARCELS' ? 'border-emerald-500 text-emerald-700' : 'border-transparent text-slate-500'}`}>Ewidencja Gruntów</button>
                    <button onClick={() => { setActiveCsvTab('CROPS'); setEditingTemplate(null); }} className={`pb-2 px-1 text-sm font-semibold transition-colors border-b-2 ${activeCsvTab === 'CROPS' ? 'border-emerald-500 text-emerald-700' : 'border-transparent text-slate-500'}`}>Struktura Zasiewów</button>
                </div>
                <div className="space-y-3">
                    {activeTemplates.map(tpl => (
                        <div key={tpl.id} onClick={() => handleEditTemplate(tpl)} className={`p-4 rounded-lg border cursor-pointer transition-all flex justify-between items-center group ${editingTemplate?.id === tpl.id ? 'bg-emerald-50 border-emerald-500 shadow-sm' : 'bg-white border-slate-200 hover:border-emerald-300'}`}>
                            <div className="flex items-center gap-3">
                                <FileSpreadsheet className="text-slate-400" size={18}/>
                                <div>
                                    <div className="font-semibold text-slate-800 text-sm">{tpl.name}</div>
                                    <div className="flex gap-2 text-xs text-slate-500">
                                        <span className="bg-slate-100 px-1 rounded">Rok: {tpl.year || 2026}</span>
                                        <span>Sep: '{tpl.separator}'</span>
                                    </div>
                                </div>
                            </div>
                            <ChevronRight size={16} className={`text-slate-300 ${editingTemplate?.id === tpl.id ? 'text-emerald-600' : ''}`}/>
                        </div>
                    ))}
                    <button onClick={handleCreateNewTemplate} className={`w-full py-3 border-2 border-dashed rounded-lg font-medium flex items-center justify-center gap-2 transition-colors mt-4 ${isCreatingTemplate ? 'border-emerald-500 text-emerald-600 bg-emerald-50' : 'border-slate-300 text-slate-500 hover:border-emerald-500'}`}>
                        <Plus size={18} /> Dodaj Nowy
                    </button>
                </div>
            </div>

            {/* Right: Editor */}
            <div className="lg:col-span-2">
                {(editingTemplate || isCreatingTemplate) ? (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        {/* ... Existing CSV Editor ... */}
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-slate-800">{editingTemplate ? 'Edycja Szablonu' : 'Nowy Szablon'}</h3>
                            <div className="flex gap-2">
                                {editingTemplate && <button onClick={() => { if(window.confirm('Usunąć?')) { onDeleteTemplate(editingTemplate.id); setEditingTemplate(null); } }} className="text-red-500 hover:bg-red-50 p-2 rounded-lg"><Trash2 size={18}/></button>}
                                <button onClick={() => { setIsCreatingTemplate(false); setEditingTemplate(null); }} className="text-slate-400 hover:bg-slate-100 p-2 rounded-lg"><X size={24}/></button>
                            </div>
                        </div>
                        <form onSubmit={handleSubmitTemplate}>
                            {/* General Settings */}
                            <div className="grid grid-cols-12 gap-4 mb-6">
                                <div className="col-span-6">
                                    <label className="block text-sm font-medium mb-1">Nazwa Szablonu</label>
                                    <input type="text" value={formName} onChange={e => setFormName(e.target.value)} required className="w-full border p-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500" placeholder="np. Ewidencja 2026" />
                                </div>
                                <div className="col-span-3">
                                    <label className="block text-sm font-medium mb-1">Rok Kampanii</label>
                                    <select value={formYear} onChange={e => setFormYear(Number(e.target.value))} className="w-full border p-2 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500">
                                        {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                                    </select>
                                </div>
                                <div className="col-span-3">
                                    <label className="block text-sm font-medium mb-1">Separator</label>
                                    <select value={formSeparator} onChange={e => setFormSeparator(e.target.value)} className="w-full border p-2 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500">
                                        <option value=";">Średnik (;)</option>
                                        <option value=",">Przecinek (,)</option>
                                    </select>
                                </div>
                            </div>
                            
                            {/* Mapping Section */}
                            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                                <div className="flex justify-between items-center mb-4">
                                    <h4 className="font-semibold text-slate-700 flex items-center gap-2">
                                        <RefreshCw size={16} /> Mapowanie Kolumn
                                    </h4>
                                    <div className="flex gap-2">
                                        {/* CSV Import Button */}
                                        <div className="relative">
                                            <input 
                                                type="file" 
                                                ref={fileInputRef}
                                                accept=".csv,.txt"
                                                onChange={handleImportTemplateFromCsv}
                                                className="hidden"
                                            />
                                            <button 
                                                type="button" 
                                                onClick={() => fileInputRef.current?.click()}
                                                className="text-xs bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-50 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                                            >
                                                <UploadCloud size={14}/> Wczytaj z pliku
                                            </button>
                                        </div>
                                        <button 
                                            type="button" 
                                            onClick={addCustomRow} 
                                            className="text-xs bg-slate-200 text-slate-700 hover:bg-slate-300 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                                        >
                                            <Plus size={14}/> Dodaj Pole
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                                    {mappingRows.map((row, i) => (
                                        <div key={i} className="grid grid-cols-12 gap-2 items-center bg-white p-2 rounded border border-slate-200">
                                            <div className="col-span-4">
                                                <div className="text-xs text-slate-400 mb-0.5">{row.label || 'Klucz Systemowy'}</div>
                                                <input 
                                                    type="text" 
                                                    value={row.systemKey} 
                                                    onChange={e => updateRow(i, 'systemKey', e.target.value)} 
                                                    disabled={row.isSystem}
                                                    className={`w-full border rounded p-1.5 text-sm font-mono ${row.isSystem ? 'bg-slate-100 text-slate-500' : 'bg-white'}`} 
                                                    placeholder="Klucz" 
                                                />
                                            </div>
                                            <div className="col-span-7">
                                                 <div className="text-xs text-slate-400 mb-0.5">Nagłówek w pliku CSV</div>
                                                 <input 
                                                    type="text" 
                                                    value={row.csvHeader} 
                                                    onChange={e => updateRow(i, 'csvHeader', e.target.value)} 
                                                    className="w-full border rounded p-1.5 text-sm font-semibold text-slate-700 focus:ring-1 focus:ring-emerald-500 outline-none" 
                                                    placeholder="Wklej nazwę kolumny..." 
                                                />
                                            </div>
                                            <div className="col-span-1 flex items-end justify-center pb-1">
                                                {!row.required && (
                                                    <button type="button" onClick={() => removeRow(i)} className="text-slate-300 hover:text-red-500 transition-colors">
                                                        <X size={18}/>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-2 text-xs text-slate-400 text-center">
                                    Pola systemowe (zablokowane) są wymagane do poprawnego działania aplikacji.
                                </div>
                            </div>
                            <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => { setIsCreatingTemplate(false); setEditingTemplate(null); }} className="px-4 py-2 text-slate-500">Anuluj</button><button type="submit" className="bg-emerald-600 text-white px-6 py-2 rounded-lg">Zapisz Szablon</button></div>
                        </form>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-300 min-h-[400px]"><Settings size={48} className="mb-4 opacity-20"/><p>Wybierz szablon lub utwórz nowy</p></div>
                )}
            </div>
          </div>
      )}

      {/* CONTENT: RATES & ECOSCHEMES */}
      {activeMainTab === 'RATES' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left: Rates List */}
              <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col h-[750px]">
                  
                  {/* Year Selector / Filter */}
                  <div className="mb-4 pb-4 border-b border-slate-100">
                      <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Rok Kampanii</label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                            <select 
                                value={selectedRateYear}
                                onChange={(e) => { setSelectedRateYear(Number(e.target.value)); setEditingRate(null); setIsCreatingRate(false); }}
                                className="w-full appearance-none bg-slate-50 border border-slate-300 text-slate-700 py-2.5 pl-4 pr-10 rounded-lg font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            >
                                {availableYears.map(year => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                            <Calendar className="absolute right-3 top-2.5 text-slate-400 pointer-events-none" size={18} />
                        </div>
                      </div>
                  </div>

                  <h3 className="font-bold text-slate-800 mb-4 flex justify-between items-center">
                      <span>Lista Stawek ({selectedRateYear})</span>
                      <span className="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-1 rounded-full">{activeRates.length} poz.</span>
                  </h3>

                  <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                      {/* Section: Direct Payments */}
                      <div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Płatności Bezpośrednie</div>
                        <div className="space-y-2">
                        {activeRates.filter(r => r.category === 'DOPLATA').map(rate => (
                            <div 
                                key={rate.id}
                                onClick={() => handleEditRate(rate)}
                                className={`p-3 rounded-lg border cursor-pointer transition-all flex justify-between items-center ${editingRate?.id === rate.id ? 'bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500' : 'bg-white border-slate-200 hover:border-emerald-300'}`}
                            >
                                <div>
                                    <div className="font-semibold text-slate-800 text-sm line-clamp-1" title={rate.name}>{rate.name}</div>
                                    <div className="text-emerald-600 font-bold text-xs mt-1">{rate.rate} {rate.unit}</div>
                                </div>
                            </div>
                        ))}
                        </div>
                      </div>

                      {/* Section: Eco-schemes */}
                      <div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 mt-4">Ekoschematy i Inne</div>
                        <div className="space-y-2">
                        {activeRates.filter(r => r.category !== 'DOPLATA').map(rate => (
                            <div 
                                key={rate.id}
                                onClick={() => handleEditRate(rate)}
                                className={`p-3 rounded-lg border cursor-pointer transition-all flex justify-between items-center ${editingRate?.id === rate.id ? 'bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500' : 'bg-white border-slate-200 hover:border-emerald-300'}`}
                            >
                                <div>
                                    <div className="font-semibold text-slate-800 text-sm line-clamp-1" title={rate.name}>{rate.name}</div>
                                    <div className="flex gap-2 text-xs mt-1">
                                        <span className="bg-slate-100 text-slate-600 px-1.5 rounded">{rate.category}</span>
                                        <span className="text-emerald-600 font-bold">{rate.rate} {rate.unit}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                        </div>
                      </div>
                  </div>
                  <button onClick={handleCreateRate} className="mt-4 w-full py-3 bg-emerald-600 text-white rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-emerald-700 shadow-sm"><Plus size={18} /> Dodaj Stawkę ({selectedRateYear})</button>
              </div>

              {/* Right: Rate Editor */}
              <div className="lg:col-span-2">
                  {(editingRate || isCreatingRate) ? (
                      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-in fade-in slide-in-from-right-4 duration-300">
                          <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <DollarSign className="text-emerald-600"/>
                                {editingRate ? 'Edycja Stawki' : `Nowa Stawka na rok ${selectedRateYear}`}
                            </h3>
                            <div className="flex gap-2">
                                {editingRate && (
                                    <button onClick={() => handleDeleteRate(editingRate.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"><Trash2 size={18}/></button>
                                )}
                                <button onClick={() => { setIsCreatingRate(false); setEditingRate(null); }} className="text-slate-400 hover:bg-slate-100 p-2 rounded-lg"><X size={24}/></button>
                            </div>
                          </div>

                          <form onSubmit={handleSaveRate} className="space-y-4">
                              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-4 flex items-center justify-between">
                                  <div className="flex items-center gap-2 text-sm text-slate-600">
                                      <Calendar size={16} />
                                      Rok obowiązywania: <span className="font-bold text-slate-800">{rateForm.year}</span>
                                  </div>
                              </div>

                              <div>
                                  <label className="block text-sm font-medium text-slate-700 mb-1">Nazwa Programu / Ekoschematu</label>
                                  <input 
                                    type="text" 
                                    required
                                    placeholder="np. Ekoschemat - Rolnictwo Węglowe"
                                    value={rateForm.name || ''}
                                    onChange={e => setRateForm({...rateForm, name: e.target.value})}
                                    className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                                  />
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                  <div>
                                      <label className="block text-sm font-medium text-slate-700 mb-1">Stawka (Wartość)</label>
                                      <input 
                                        type="number" 
                                        step="0.01"
                                        required
                                        value={rateForm.rate || 0}
                                        onChange={e => setRateForm({...rateForm, rate: parseFloat(e.target.value)})}
                                        className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                                      />
                                  </div>
                                  <div>
                                      <label className="block text-sm font-medium text-slate-700 mb-1">Jednostka</label>
                                      <select 
                                        value={rateForm.unit || 'PLN/ha'}
                                        onChange={e => setRateForm({...rateForm, unit: e.target.value as any})}
                                        className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                                      >
                                          <option value="PLN/ha">PLN/ha</option>
                                          <option value="PLN/DJP">PLN/DJP</option>
                                          <option value="PLN/pkt">PLN/pkt</option>
                                          <option value="PLN/szt.">PLN/szt.</option>
                                          <option value="PLN/kg">PLN/kg</option>
                                      </select>
                                  </div>
                              </div>

                              <div>
                                  <label className="block text-sm font-medium text-slate-700 mb-1">Kategoria</label>
                                  <select 
                                    value={rateForm.category || 'EKOSCHEMAT'}
                                    onChange={e => setRateForm({...rateForm, category: e.target.value as any})}
                                    className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                                  >
                                      <option value="EKOSCHEMAT">EKOSCHEMAT</option>
                                      <option value="DOPLATA">DOPŁATA PODSTAWOWA</option>
                                      <option value="DOBROSTAN">DOBROSTAN</option>
                                  </select>
                              </div>
                              
                              <div className="pt-4 flex justify-end gap-3">
                                  <button type="button" onClick={() => { setIsCreatingRate(false); setEditingRate(null); }} className="px-4 py-2 text-slate-500 hover:bg-slate-50 rounded-lg">Anuluj</button>
                                  <button type="submit" className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 shadow-sm font-medium">Zapisz Zmiany</button>
                              </div>
                          </form>
                      </div>
                  ) : (
                      <div className="h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-300 min-h-[400px]">
                          <Coins size={48} className="mb-4 opacity-20"/>
                          <p>Wybierz stawkę do edycji lub dodaj nową</p>
                      </div>
                  )}
              </div>
          </div>
      )}

      {/* CONTENT: CROPS DICTIONARY */}
      {activeMainTab === 'CROPS' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
               {/* Left: Crops List */}
               <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col h-[750px]">
                  <div className="mb-4 pb-4 border-b border-slate-100 flex justify-between items-center">
                     <h3 className="font-bold text-slate-800">Słownik Roślin</h3>
                     <span className="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-1 rounded-full">{crops.length} poz.</span>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                       {crops.map(crop => (
                           <div 
                                key={crop.id}
                                onClick={() => handleEditCrop(crop)}
                                className={`p-3 rounded-lg border cursor-pointer transition-all flex justify-between items-center ${editingCrop?.id === crop.id ? 'bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500' : 'bg-white border-slate-200 hover:border-emerald-300'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-slate-100 rounded text-slate-500">
                                        <Leaf size={16} />
                                    </div>
                                    <div>
                                        <div className="font-semibold text-slate-800 text-sm">{crop.name}</div>
                                        <div className="text-xs text-slate-500">{crop.type}</div>
                                    </div>
                                </div>
                                {(crop.isLegume || crop.isCatchCrop) && (
                                    <div className="flex gap-1">
                                        {crop.isLegume && <span className="w-2 h-2 rounded-full bg-blue-500" title="Bobowata"></span>}
                                        {crop.isCatchCrop && <span className="w-2 h-2 rounded-full bg-green-500" title="Międzyplon"></span>}
                                    </div>
                                )}
                           </div>
                       ))}
                  </div>
                  <button onClick={handleCreateCrop} className="mt-4 w-full py-3 bg-emerald-600 text-white rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-emerald-700 shadow-sm"><Plus size={18} /> Dodaj Roślinę</button>
               </div>

               {/* Right: Crop Editor */}
               <div className="lg:col-span-2">
                    {(editingCrop || isCreatingCrop) ? (
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-in fade-in slide-in-from-right-4 duration-300">
                             <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                    <Sprout className="text-emerald-600"/>
                                    {editingCrop ? 'Edycja Rośliny' : 'Nowa Roślina'}
                                </h3>
                                <div className="flex gap-2">
                                    {editingCrop && (
                                        <button onClick={() => handleDeleteCrop(editingCrop.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"><Trash2 size={18}/></button>
                                    )}
                                    <button onClick={() => { setIsCreatingCrop(false); setEditingCrop(null); }} className="text-slate-400 hover:bg-slate-100 p-2 rounded-lg"><X size={24}/></button>
                                </div>
                              </div>

                              <form onSubmit={handleSaveCrop} className="space-y-4">
                                  <div>
                                      <label className="block text-sm font-medium text-slate-700 mb-1">Nazwa Uprawy</label>
                                      <input 
                                        type="text" 
                                        required
                                        value={cropForm.name || ''}
                                        onChange={e => setCropForm({...cropForm, name: e.target.value})}
                                        className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                                        placeholder="np. Pszenica ozima"
                                      />
                                  </div>
                                  <div>
                                      <label className="block text-sm font-medium text-slate-700 mb-1">Typ / Grupa</label>
                                      <select 
                                        value={cropForm.type || 'Zboża'}
                                        onChange={e => setCropForm({...cropForm, type: e.target.value})}
                                        className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none"
                                      >
                                          <option value="Zboża">Zboża</option>
                                          <option value="Oleiste">Oleiste</option>
                                          <option value="Bobowate">Bobowate</option>
                                          <option value="Okopowe">Okopowe</option>
                                          <option value="Trawy">Trawy / TUZ</option>
                                          <option value="Pasze">Rośliny pastewne</option>
                                          <option value="Włókniste">Włókniste</option>
                                          <option value="Specjalne">Specjalne (Chmiel, Tytoń)</option>
                                          <option value="Warzywa">Warzywa</option>
                                          <option value="Inne">Inne</option>
                                      </select>
                                  </div>
                                  
                                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                      <label className="block text-sm font-medium text-slate-700 mb-3">Cechy dodatkowe (do płatności)</label>
                                      <div className="space-y-2">
                                          <label className="flex items-center space-x-2 cursor-pointer">
                                              <input 
                                                type="checkbox" 
                                                checked={cropForm.isLegume || false}
                                                onChange={e => setCropForm({...cropForm, isLegume: e.target.checked})}
                                                className="rounded text-emerald-600 focus:ring-emerald-500" 
                                              />
                                              <span className="text-sm text-slate-700">Roślina Bobowata (Strączkowa)</span>
                                          </label>
                                          <label className="flex items-center space-x-2 cursor-pointer">
                                              <input 
                                                type="checkbox" 
                                                checked={cropForm.isCatchCrop || false}
                                                onChange={e => setCropForm({...cropForm, isCatchCrop: e.target.checked})}
                                                className="rounded text-emerald-600 focus:ring-emerald-500" 
                                              />
                                              <span className="text-sm text-slate-700">Nadaje się na międzyplon / poplon</span>
                                          </label>
                                      </div>
                                  </div>

                                  <div className="pt-4 flex justify-end gap-3">
                                      <button type="button" onClick={() => { setIsCreatingCrop(false); setEditingCrop(null); }} className="px-4 py-2 text-slate-500 hover:bg-slate-50 rounded-lg">Anuluj</button>
                                      <button type="submit" className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 shadow-sm font-medium">Zapisz Roślinę</button>
                                  </div>
                              </form>
                        </div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-300 min-h-[400px]">
                          <Sprout size={48} className="mb-4 opacity-20"/>
                          <p>Wybierz roślinę do edycji lub dodaj nową</p>
                      </div>
                    )}
               </div>
          </div>
      )}
    </div>
  );
};

export default AdminPanel;

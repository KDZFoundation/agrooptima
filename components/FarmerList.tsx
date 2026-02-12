
import React, { useState } from 'react';
import { Search, User, MapPin, ChevronRight, FileCheck, Clock, AlertCircle, Plus, Edit2, Trash2, X, Tractor } from 'lucide-react';
import { FarmerClient } from '../types';

interface FarmerListProps {
  clients: FarmerClient[];
  onSelectClient: (client: FarmerClient) => void;
  onAddClient: (client: FarmerClient) => void;
  onUpdateClient: (client: FarmerClient) => void;
  onDeleteClient: (id: string) => void;
}

const FarmerList: React.FC<FarmerListProps> = ({ clients, onSelectClient, onAddClient, onUpdateClient, onDeleteClient }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<FarmerClient | null>(null);
  
  // Form State
  const [formData, setFormData] = useState<Partial<FarmerClient>>({
    firstName: '',
    lastName: '',
    producerId: '',
    totalArea: 0,
    status: 'ACTIVE'
  });
  
  // Validation State
  const [errors, setErrors] = useState<{ producerId?: string }>({});

  const filteredClients = clients.filter(client => {
      const full = `${client.firstName} ${client.lastName}`.toLowerCase();
      const term = searchTerm.toLowerCase();
      return full.includes(term) || client.producerId.includes(term);
  });

  const handleOpenModal = (client?: FarmerClient) => {
    setErrors({}); // Reset errors
    if (client) {
        setEditingClient(client);
        setFormData({
            firstName: client.firstName,
            lastName: client.lastName,
            producerId: client.producerId,
            totalArea: client.totalArea,
            status: client.status
        });
    } else {
        setEditingClient(null);
        setFormData({
            firstName: '',
            lastName: '',
            producerId: '',
            totalArea: 0,
            status: 'ACTIVE'
        });
    }
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    
    // VALIDATION: Ensure Producer ID is valid (API requires 9 chars)
    if (!formData.producerId || formData.producerId.length !== 9) {
        setErrors({ producerId: "Numer EP musi składać się z dokładnie 9 cyfr." });
        return;
    }

    // Check if ID is unique (only for new clients)
    if (!editingClient) {
        const exists = clients.some(c => c.producerId === formData.producerId);
        if (exists) {
            setErrors({ producerId: "Ten numer EP już istnieje w bazie." });
            return;
        }
    }

    // VALIDATION: Sanitize Area (prevent NaN or null sending to API which expects float)
    const safeArea = (formData.totalArea && !isNaN(formData.totalArea)) ? formData.totalArea : 0;

    // Auto-generate farm name display
    const farmNameDisplay = `${formData.lastName} ${formData.firstName} Farm`;

    const clientData: FarmerClient = {
        firstName: formData.firstName!,
        lastName: formData.lastName!,
        producerId: formData.producerId!, // 9-digit EP key
        totalArea: safeArea,
        status: formData.status as any,
        lastContact: editingClient ? editingClient.lastContact : new Date().toISOString().split('T')[0],
        documents: editingClient ? editingClient.documents : [],
        farmName: farmNameDisplay
    };

    if (editingClient) {
        onUpdateClient(clientData);
    } else {
        onAddClient(clientData);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    onDeleteClient(id);
  };

  const handleEditClick = (e: React.MouseEvent, client: FarmerClient) => {
      e.stopPropagation();
      handleOpenModal(client);
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'ACTIVE': return <span className="flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800"><Clock size={12} /> Aktywny</span>;
      case 'PENDING': return <span className="flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800"><AlertCircle size={12} /> Braki</span>;
      case 'COMPLETED': return <span className="flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800"><FileCheck size={12} /> Gotowe</span>;
      default: return null;
    }
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Baza Rolników</h2>
          <p className="text-slate-500">Zarządzaj gospodarstwami i ewidencją.</p>
        </div>
        <div className="flex items-center gap-3">
             <div className="relative">
                <input 
                    type="text" 
                    placeholder="Szukaj (Nazwisko lub EP)..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg w-full md:w-64 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
            </div>
            <button 
                onClick={() => handleOpenModal()}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors shadow-sm"
            >
                <Plus size={20} />
                <span className="hidden md:inline">Dodaj Rolnika</span>
            </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500">
            <tr>
              <th className="p-4 font-semibold">Imię i Nazwisko</th>
              <th className="p-4 font-semibold">Numer EP</th>
              <th className="p-4 font-semibold">Powierzchnia (ha)</th>
              <th className="p-4 font-semibold">Status</th>
              <th className="p-4 font-semibold text-right">Akcja</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredClients.map(client => (
              <tr key={client.producerId} className="hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => onSelectClient(client)}>
                <td className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold flex-shrink-0">
                        {client.firstName.charAt(0)}{client.lastName.charAt(0)}
                    </div>
                    <div>
                        <div className="font-semibold text-slate-900">{client.firstName} {client.lastName}</div>
                        <div className="text-xs text-slate-500 md:hidden">{client.producerId}</div>
                    </div>
                  </div>
                </td>
                <td className="p-4 font-mono text-slate-700 font-medium">
                    {client.producerId}
                </td>
                <td className="p-4 text-slate-600 text-sm">
                   {client.totalArea.toFixed(2)} ha
                </td>
                <td className="p-4">
                   {getStatusBadge(client.status)}
                </td>
                <td className="p-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                        <button 
                             onClick={(e) => handleEditClick(e, client)}
                             className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                             title="Edytuj dane"
                        >
                            <Edit2 size={16} />
                        </button>
                        <button 
                             onClick={(e) => handleDelete(e, client.producerId)}
                             className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                             title="Usuń rolnika"
                        >
                            <Trash2 size={16} />
                        </button>
                        <span className="text-slate-300">|</span>
                        <div className="text-emerald-600 font-medium text-sm flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            Panel <ChevronRight size={16} />
                        </div>
                    </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredClients.length === 0 && (
             <div className="p-12 text-center text-slate-400">
                <Tractor size={48} className="mx-auto mb-3 opacity-20" />
                <p>Brak rolników w bazie. Dodaj pierwszego klienta używając przycisku "Dodaj Rolnika".</p>
             </div>
        )}
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg relative z-10 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center p-6 border-b border-slate-100">
                    <h3 className="text-xl font-bold text-slate-800">
                        {editingClient ? 'Edytuj Rolnika' : 'Dodaj Rolnika'}
                    </h3>
                    <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                        <X size={24} />
                    </button>
                </div>
                
                <form onSubmit={handleSave} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Imię</label>
                            <input 
                                type="text" 
                                required
                                value={formData.firstName}
                                onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                                className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                                placeholder="Jan"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Nazwisko</label>
                            <input 
                                type="text" 
                                required
                                value={formData.lastName}
                                onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                                className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                                placeholder="Kowalski"
                            />
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Numer EP (9 cyfr)</label>
                        <input 
                            type="text" 
                            required
                            maxLength={9}
                            minLength={9}
                            pattern="\d{9}"
                            disabled={!!editingClient} // Cannot change ID once created
                            value={formData.producerId}
                            onChange={(e) => {
                                setFormData({...formData, producerId: e.target.value.replace(/\D/g,'')});
                                if (errors.producerId) setErrors({...errors, producerId: undefined});
                            }}
                            className={`w-full border rounded-lg p-2.5 font-mono tracking-widest focus:outline-none focus:ring-2 ${
                                errors.producerId 
                                ? 'border-red-500 focus:ring-red-500' 
                                : 'border-slate-300 focus:ring-emerald-500'
                            } ${editingClient ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''}`}
                            placeholder="000000000"
                        />
                        {errors.producerId ? (
                            <p className="text-xs text-red-500 mt-1 font-medium">{errors.producerId}</p>
                        ) : (
                            !editingClient && <p className="text-xs text-slate-400 mt-1">To będzie unikalny identyfikator w systemie.</p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Powierzchnia (ha)</label>
                            <input 
                                type="number" 
                                step="0.01"
                                min="0"
                                value={formData.totalArea}
                                onChange={(e) => {
                                    const val = parseFloat(e.target.value);
                                    setFormData({...formData, totalArea: isNaN(val) ? 0 : val});
                                }}
                                className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                            <select
                                value={formData.status}
                                onChange={(e) => setFormData({...formData, status: e.target.value as any})}
                                className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            >
                                <option value="ACTIVE">Aktywny</option>
                                <option value="PENDING">Braki / Do uzup.</option>
                                <option value="COMPLETED">Zakończony</option>
                            </select>
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end space-x-3">
                        <button 
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg font-medium"
                        >
                            Anuluj
                        </button>
                        <button 
                            type="submit"
                            className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium shadow-sm"
                        >
                            {editingClient ? 'Zapisz Zmiany' : 'Utwórz'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};

export default FarmerList;

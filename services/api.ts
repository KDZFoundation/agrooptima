
import { FarmerClient, Field, FarmerDocument, SubsidyRate, CropDefinition, CsvTemplate, AuthResponse, User } from '../types';
import { MOCK_CLIENTS } from '../constants';

const getBaseUrl = () => {
    if (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.VITE_API_URL) {
        return (import.meta as any).env.VITE_API_URL;
    }
    return '';
};

const BASE_URL = getBaseUrl();
const API_BASE_URL = BASE_URL ? `${BASE_URL}/api` : '/api';

const getHeaders = () => {
    const token = localStorage.getItem('ao_token');
    return {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
};

export const api = {
    async checkConnection(): Promise<boolean> {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000);
            const res = await fetch(`${BASE_URL || ''}/health`, { signal: controller.signal });
            clearTimeout(timeoutId);
            if (!res.ok) return false;
            const data = await res.json();
            return data.app === 'agrooptima' || data.status === 'online';
        } catch (e) {
            return false;
        }
    },

    async login(email: string, password: string): Promise<AuthResponse> {
        if (email === 'demo@agro.pl') {
            const demoUser: User = { 
                id: 'demo_user', 
                email: 'demo@agro.pl', 
                fullName: 'Doradca Agro', 
                role: 'ADVISOR' 
            };
            return { token: 'local_token_demo', user: demoUser };
        }
        
        const res = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        if (!res.ok) throw new Error('Błędne dane logowania.');
        return await res.json();
    },

    async register(data: any): Promise<AuthResponse> {
        const res = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error('Błąd podczas rejestracji. Email może być już zajęty.');
        return await res.json();
    },

    async getClients(): Promise<FarmerClient[]> {
        try {
            const res = await fetch(`${API_BASE_URL}/clients`, { headers: getHeaders() });
            if (!res.ok) throw new Error();
            const data = await res.json();
            if (data) {
                localStorage.setItem('ao_clients', JSON.stringify(data));
                return data;
            }
            throw new Error();
        } catch (error) { 
            const local = localStorage.getItem('ao_clients');
            return local ? JSON.parse(local) : MOCK_CLIENTS;
        }
    },

    async createOrUpdateClient(client: FarmerClient): Promise<FarmerClient | null> {
        const res = await fetch(`${API_BASE_URL}/clients`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(client)
        });
        if (!res.ok) throw new Error('Błąd zapisu danych rolnika.');
        const saved = await res.json();
        
        // Update local storage
        const local = JSON.parse(localStorage.getItem('ao_clients') || '[]');
        const idx = local.findIndex((c: any) => c.producerId === saved.producerId);
        if (idx >= 0) local[idx] = saved; else local.push(saved);
        localStorage.setItem('ao_clients', JSON.stringify(local));
        
        return saved;
    },

    async deleteClient(id: string): Promise<boolean> {
        const res = await fetch(`${API_BASE_URL}/clients/${id}`, { method: 'DELETE', headers: getHeaders() });
        if (!res.ok) throw new Error('Błąd usuwania rolnika.');
        const local = JSON.parse(localStorage.getItem('ao_clients') || '[]');
        localStorage.setItem('ao_clients', JSON.stringify(local.filter((c: any) => c.producerId !== id)));
        return true;
    },

    async getClientFields(clientId: string): Promise<Field[]> {
        const localStr = localStorage.getItem(`fields_${clientId}`);
        const localData = localStr ? JSON.parse(localStr) : [];
        try {
            const res = await fetch(`${API_BASE_URL}/clients/${clientId}/fields`, { headers: getHeaders() });
            if (res.ok) {
                const data = await res.json();
                if (data && data.length > 0) {
                    localStorage.setItem(`fields_${clientId}`, JSON.stringify(data));
                    return data;
                }
            }
            return localData;
        } catch (error) { 
            return localData;
        }
    },

    async saveClientFields(clientId: string, fields: Field[]): Promise<Field[]> {
        localStorage.setItem(`fields_${clientId}`, JSON.stringify(fields));
        const response = await fetch(`${API_BASE_URL}/clients/${clientId}/fields`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(fields)
        });
        if (!response.ok) throw new Error('Błąd zapisu pól na serwerze.');
        return fields;
    },

    async addDocument(clientId: string, doc: FarmerDocument): Promise<FarmerDocument | null> {
        // Natychmiastowa aktualizacja lokalnego cache'u, aby UI odświeżył się bez czekania
        const localClients = JSON.parse(localStorage.getItem('ao_clients') || '[]');
        const clientIdx = localClients.findIndex((c: any) => c.producerId === clientId);
        if (clientIdx >= 0) {
            if (!localClients[clientIdx].documents) localClients[clientIdx].documents = [];
            localClients[clientIdx].documents.push(doc);
            localStorage.setItem('ao_clients', JSON.stringify(localClients));
        }

        try {
            const res = await fetch(`${API_BASE_URL}/clients/${clientId}/documents`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(doc)
            });
            if (res.ok) return await res.json();
        } catch (e) {
            console.warn("Backend unavailable, document saved locally.");
        }
        return doc;
    },

    async removeDocument(clientId: string, docId: string): Promise<boolean> {
        const localClients = JSON.parse(localStorage.getItem('ao_clients') || '[]');
        const clientIdx = localClients.findIndex((c: any) => c.producerId === clientId);
        if (clientIdx >= 0) {
            localClients[clientIdx].documents = localClients[clientIdx].documents.filter((d: any) => d.id !== docId);
            localStorage.setItem('ao_clients', JSON.stringify(localClients));
        }

        try {
            const res = await fetch(`${API_BASE_URL}/clients/${clientId}/documents/${docId}`, { method: 'DELETE', headers: getHeaders() });
            return res.ok;
        } catch (e) {
            return true;
        }
    },

    async getTemplates(): Promise<CsvTemplate[]> {
        const res = await fetch(`${API_BASE_URL}/templates`, { headers: getHeaders() });
        return res.ok ? await res.json() : [];
    },

    async saveTemplate(tpl: CsvTemplate): Promise<CsvTemplate | null> {
        const res = await fetch(`${API_BASE_URL}/templates`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(tpl) });
        if (!res.ok) throw new Error('Błąd zapisu szablonu.');
        return await res.json();
    },

    async getRates(): Promise<SubsidyRate[]> {
        const res = await fetch(`${API_BASE_URL}/rates`, { headers: getHeaders() });
        return res.ok ? await res.json() : [];
    },

    async saveRate(rate: SubsidyRate): Promise<SubsidyRate | null> {
        const res = await fetch(`${API_BASE_URL}/rates`, { 
            method: 'POST', 
            headers: getHeaders(), 
            body: JSON.stringify(rate) 
        });
        if (!res.ok) throw new Error('Błąd zapisu stawki.');
        return await res.json();
    },

    async deleteRate(id: string): Promise<boolean> {
        const res = await fetch(`${API_BASE_URL}/rates/${id}`, { method: 'DELETE', headers: getHeaders() });
        if (!res.ok) throw new Error('Błąd usuwania stawki.');
        return true;
    },

    async getCrops(): Promise<CropDefinition[]> {
        const res = await fetch(`${API_BASE_URL}/crops`, { headers: getHeaders() });
        return res.ok ? await res.json() : [];
    },

    async saveCrop(crop: CropDefinition): Promise<CropDefinition | null> {
        const res = await fetch(`${API_BASE_URL}/crops`, { 
            method: 'POST', 
            headers: getHeaders(), 
            body: JSON.stringify(crop) 
        });
        if (!res.ok) throw new Error('Błąd zapisu rośliny.');
        return await res.json();
    },

    async deleteCrop(id: string): Promise<boolean> {
        const res = await fetch(`${API_BASE_URL}/crops/${id}`, { method: 'DELETE', headers: getHeaders() });
        if (!res.ok) throw new Error('Błąd usuwania rośliny ze słownika.');
        return true;
    }
};

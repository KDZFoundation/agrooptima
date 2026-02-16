
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
        
        try {
            const res = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            if (!res.ok) throw new Error('Błąd logowania');
            return await res.json();
        } catch (e) {
            throw new Error('Błąd serwera. Użyj konta demo@agro.pl dla trybu lokalnego.');
        }
    },

    async register(data: any): Promise<AuthResponse> {
        try {
            const res = await fetch(`${API_BASE_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error('Błąd rejestracji');
            return await res.json();
        } catch (e) {
            throw new Error('Błąd serwera podczas rejestracji.');
        }
    },

    async getClients(): Promise<FarmerClient[]> {
        try {
            const res = await fetch(`${API_BASE_URL}/clients`, { headers: getHeaders() });
            if (!res.ok) throw new Error();
            const data = await res.json();
            if (data && data.length > 0) {
                localStorage.setItem('ao_clients', JSON.stringify(data));
                return data;
            }
            throw new Error();
        } catch (error) { 
            const local = localStorage.getItem('ao_clients');
            const clients = local ? JSON.parse(local) : MOCK_CLIENTS;
            if (!local) localStorage.setItem('ao_clients', JSON.stringify(MOCK_CLIENTS));
            return clients;
        }
    },

    async createOrUpdateClient(client: FarmerClient): Promise<FarmerClient | null> {
        const local = JSON.parse(localStorage.getItem('ao_clients') || '[]');
        const idx = local.findIndex((c: any) => c.producerId === client.producerId);
        if (idx >= 0) local[idx] = client; else local.push(client);
        localStorage.setItem('ao_clients', JSON.stringify(local));

        try {
            const res = await fetch(`${API_BASE_URL}/clients`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(client)
            });
            return await res.json();
        } catch (error) { return client; }
    },

    async deleteClient(id: string): Promise<boolean> {
        const local = JSON.parse(localStorage.getItem('ao_clients') || '[]');
        localStorage.setItem('ao_clients', JSON.stringify(local.filter((c: any) => c.producerId !== id)));
        try {
            const res = await fetch(`${API_BASE_URL}/clients/${id}`, { method: 'DELETE', headers: getHeaders() });
            return res.ok;
        } catch (error) { return true; }
    },

    async getClientFields(clientId: string): Promise<Field[]> {
        const localStr = localStorage.getItem(`fields_${clientId}`);
        const localData = localStr ? JSON.parse(localStr) : [];

        try {
            const isOnline = await this.checkConnection();
            if (isOnline) {
                const res = await fetch(`${API_BASE_URL}/clients/${clientId}/fields`, { headers: getHeaders() });
                if (res.ok) {
                    const data = await res.json();
                    // Jeśli serwer ma dane, odświeżamy local. Jeśli nie, zostawiamy lokalne.
                    if (data && data.length > 0) {
                        localStorage.setItem(`fields_${clientId}`, JSON.stringify(data));
                        return data;
                    }
                }
            }
            return localData;
        } catch (error) { 
            return localData;
        }
    },

    async saveClientFields(clientId: string, fields: Field[]): Promise<Field[]> {
        // Zapis lokalny natychmiastowy - GWARANCJA przeżycia reloadu
        localStorage.setItem(`fields_${clientId}`, JSON.stringify(fields));
        
        try {
            const isOnline = await this.checkConnection();
            if (isOnline) {
                const response = await fetch(`${API_BASE_URL}/clients/${clientId}/fields`, {
                    method: 'POST',
                    headers: getHeaders(),
                    body: JSON.stringify(fields)
                });
                if (!response.ok) {
                    console.warn("Server save failed, relying on local storage.");
                }
            }
            return fields;
        } catch (error) { 
            console.error("Save API error, data kept locally:", error);
            return fields; 
        }
    },

    async addDocument(clientId: string, doc: FarmerDocument): Promise<FarmerDocument | null> {
        const clients = JSON.parse(localStorage.getItem('ao_clients') || '[]');
        const cIdx = clients.findIndex((c: any) => c.producerId === clientId);
        if (cIdx >= 0) {
            if (!clients[cIdx].documents) clients[cIdx].documents = [];
            clients[cIdx].documents.push(doc);
            localStorage.setItem('ao_clients', JSON.stringify(clients));
        }
        try {
            const res = await fetch(`${API_BASE_URL}/clients/${clientId}/documents`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(doc)
            });
            return await res.json();
        } catch (error) { return doc; }
    },

    async removeDocument(clientId: string, docId: string): Promise<boolean> {
        const clients = JSON.parse(localStorage.getItem('ao_clients') || '[]');
        const cIdx = clients.findIndex((c: any) => c.producerId === clientId);
        if (cIdx >= 0) {
            clients[cIdx].documents = (clients[cIdx].documents || []).filter((d: any) => d.id !== docId);
            localStorage.setItem('ao_clients', JSON.stringify(clients));
        }
        try {
            const res = await fetch(`${API_BASE_URL}/clients/${clientId}/documents/${docId}`, { method: 'DELETE', headers: getHeaders() });
            return res.ok;
        } catch (error) { return true; }
    },

    async getTemplates(): Promise<CsvTemplate[]> {
        try {
            const res = await fetch(`${API_BASE_URL}/templates`, { headers: getHeaders() });
            return res.ok ? await res.json() : [];
        } catch (error) { return []; }
    },

    async getRates(): Promise<SubsidyRate[]> {
        try {
            const res = await fetch(`${API_BASE_URL}/rates`, { headers: getHeaders() });
            return res.ok ? await res.json() : [];
        } catch (error) { return []; }
    },

    async saveRate(rate: SubsidyRate): Promise<SubsidyRate | null> {
        try {
            const res = await fetch(`${API_BASE_URL}/rates`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(rate) });
            return await res.json();
        } catch (error) { return rate; }
    },

    async deleteRate(id: string): Promise<boolean> {
        try {
            const res = await fetch(`${API_BASE_URL}/rates/${id}`, { method: 'DELETE', headers: getHeaders() });
            return res.ok;
        } catch (error) { return true; }
    },

    async getCrops(): Promise<CropDefinition[]> {
        try {
            const res = await fetch(`${API_BASE_URL}/crops`, { headers: getHeaders() });
            return res.ok ? await res.json() : [];
        } catch (error) { return []; }
    },

    async saveCrop(crop: CropDefinition): Promise<CropDefinition | null> {
        try {
            const res = await fetch(`${API_BASE_URL}/crops`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(crop) });
            return await res.json();
        } catch (error) { return crop; }
    },

    async deleteCrop(id: string): Promise<boolean> {
        try {
            const res = await fetch(`${API_BASE_URL}/crops/${id}`, { method: 'DELETE', headers: getHeaders() });
            return res.ok;
        } catch (error) { return true; }
    }
};

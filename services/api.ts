import { FarmerClient, Field, FarmerDocument, SubsidyRate, CropDefinition, CsvTemplate, AuthResponse, User } from '../types';
import { MOCK_CLIENTS, DEFAULT_CSV_TEMPLATES } from '../constants';

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

const fetchWithTimeout = async (url: string, options: any, timeout = 3000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(id);
        return response;
    } catch (error) {
        clearTimeout(id);
        throw error;
    }
};

export const api = {
    async checkConnection(): Promise<boolean> {
        try {
            const res = await fetchWithTimeout(`${BASE_URL || ''}/health`, {}, 2000);
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

        const res = await fetchWithTimeout(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        if (!res.ok) throw new Error('Błędne dane logowania.');
        return await res.json();
    },

    async register(data: any): Promise<AuthResponse> {
        const res = await fetchWithTimeout(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error('Błąd podczas rejestracji. Email może być już zajęty.');
        return await res.json();
    },

    async getClients(): Promise<FarmerClient[]> {
        try {
            const res = await fetchWithTimeout(`${API_BASE_URL}/clients`, { headers: getHeaders() });
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
        // Zapis lokalny — zawsze działa
        const local = JSON.parse(localStorage.getItem('ao_clients') || '[]');
        const idx = local.findIndex((c: any) => c.producerId === client.producerId);
        if (idx >= 0) local[idx] = client; else local.push(client);
        localStorage.setItem('ao_clients', JSON.stringify(local));

        // Próba zapisu na serwerze
        try {
            const res = await fetchWithTimeout(`${API_BASE_URL}/clients`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(client)
            });
            if (res.ok) {
                const saved = await res.json();
                const localUpdated = JSON.parse(localStorage.getItem('ao_clients') || '[]');
                const idx2 = localUpdated.findIndex((c: any) => c.producerId === saved.producerId);
                if (idx2 >= 0) localUpdated[idx2] = saved; else localUpdated.push(saved);
                localStorage.setItem('ao_clients', JSON.stringify(localUpdated));
                return saved;
            }
        } catch (e) {
            console.warn("Backend niedostępny, dane klienta zapisane lokalnie.");
        }

        return client;
    },

    async deleteClient(id: string): Promise<boolean> {
        try {
            await fetchWithTimeout(`${API_BASE_URL}/clients/${id}`, { method: 'DELETE', headers: getHeaders() });
        } catch (e) { }
        const local = JSON.parse(localStorage.getItem('ao_clients') || '[]');
        localStorage.setItem('ao_clients', JSON.stringify(local.filter((c: any) => c.producerId !== id)));
        return true;
    },

    async getClientFields(clientId: string): Promise<Field[]> {
        const localStr = localStorage.getItem(`fields_${clientId}`);
        const localData = localStr ? JSON.parse(localStr) : [];
        try {
            const res = await fetchWithTimeout(`${API_BASE_URL}/clients/${clientId}/fields`, { headers: getHeaders() });
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
        // Zapis lokalny — zawsze działa
        localStorage.setItem(`fields_${clientId}`, JSON.stringify(fields));

        try {
            await fetchWithTimeout(`${API_BASE_URL}/clients/${clientId}/fields`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(fields)
            });
        } catch (e) {
            console.warn("Backend niedostępny, dane zapisane lokalnie w przeglądarce.");
        }

        return fields;
    },

    async addDocument(clientId: string, doc: FarmerDocument): Promise<FarmerDocument | null> {
        const localClients = JSON.parse(localStorage.getItem('ao_clients') || '[]');
        const clientIdx = localClients.findIndex((c: any) => c.producerId === clientId);
        if (clientIdx >= 0) {
            if (!localClients[clientIdx].documents) localClients[clientIdx].documents = [];
            localClients[clientIdx].documents.push(doc);
            localStorage.setItem('ao_clients', JSON.stringify(localClients));
        }

        try {
            const res = await fetchWithTimeout(`${API_BASE_URL}/clients/${clientId}/documents`, {
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
            const res = await fetchWithTimeout(`${API_BASE_URL}/clients/${clientId}/documents/${docId}`, { method: 'DELETE', headers: getHeaders() });
            return res.ok;
        } catch (e) {
            return true;
        }
    },

    async getTemplates(): Promise<CsvTemplate[]> {
        const local = localStorage.getItem('ao_templates');
        let savedTemplates: CsvTemplate[] = local ? JSON.parse(local) : [];

        try {
            const res = await fetchWithTimeout(`${API_BASE_URL}/templates`, { headers: getHeaders() });
            if (res.ok) {
                const data = await res.json();
                if (data && Array.isArray(data)) {
                    savedTemplates = data;
                    localStorage.setItem('ao_templates', JSON.stringify(data));
                }
            }
        } catch (e) { }

        const defaultIds = DEFAULT_CSV_TEMPLATES.map(t => t.id);
        const nonDefaultSaved = savedTemplates.filter(t => !defaultIds.includes(t.id));

        return [...DEFAULT_CSV_TEMPLATES, ...nonDefaultSaved];
    },

    async saveTemplate(tpl: CsvTemplate): Promise<CsvTemplate | null> {
        // 1. Zapis lokalny
        const local = JSON.parse(localStorage.getItem('ao_templates') || '[]');
        const idx = local.findIndex((t: any) => t.id === tpl.id);
        if (idx >= 0) local[idx] = tpl; else local.push(tpl);
        localStorage.setItem('ao_templates', JSON.stringify(local));

        // 2. Próba zapisu na serwerze
        try {
            const res = await fetchWithTimeout(`${API_BASE_URL}/templates`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(tpl)
            });
            if (res.ok) return await res.json();
        } catch (e) {
            console.warn("Backend save failed/timed out, using local version.");
        }

        return tpl;
    },

    async deleteTemplate(id: string): Promise<boolean> {
        try {
            await fetchWithTimeout(`${API_BASE_URL}/templates/${id}`, { method: 'DELETE', headers: getHeaders() });
        } catch (e) { }
        const local = JSON.parse(localStorage.getItem('ao_templates') || '[]');
        const filtered = local.filter((t: any) => t.id !== id);
        localStorage.setItem('ao_templates', JSON.stringify(filtered));
        return true;
    },

    async getRates(): Promise<SubsidyRate[]> {
        const local = localStorage.getItem('ao_rates');
        if (local) return JSON.parse(local);

        try {
            const res = await fetchWithTimeout(`${API_BASE_URL}/rates`, { headers: getHeaders() });
            if (res.ok) {
                const data = await res.json();
                localStorage.setItem('ao_rates', JSON.stringify(data));
                return data;
            }
        } catch (e) { }
        return [];
    },

    async saveRate(rate: SubsidyRate): Promise<SubsidyRate | null> {
        const local = JSON.parse(localStorage.getItem('ao_rates') || '[]');
        const idx = local.findIndex((r: any) => r.id === rate.id);
        if (idx >= 0) local[idx] = rate; else local.push(rate);
        localStorage.setItem('ao_rates', JSON.stringify(local));

        try {
            const res = await fetchWithTimeout(`${API_BASE_URL}/rates`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(rate)
            });
            if (res.ok) return await res.json();
        } catch (e) { }
        return rate;
    },

    async deleteRate(id: string): Promise<boolean> {
        try {
            await fetchWithTimeout(`${API_BASE_URL}/rates/${id}`, { method: 'DELETE', headers: getHeaders() });
        } catch (e) { }
        const local = JSON.parse(localStorage.getItem('ao_rates') || '[]');
        const filtered = local.filter((r: any) => r.id !== id);
        localStorage.setItem('ao_rates', JSON.stringify(filtered));
        return true;
    },

    async getCrops(): Promise<CropDefinition[]> {
        const local = localStorage.getItem('ao_crops');
        if (local) return JSON.parse(local);

        try {
            const res = await fetchWithTimeout(`${API_BASE_URL}/crops`, { headers: getHeaders() });
            if (res.ok) {
                const data = await res.json();
                localStorage.setItem('ao_crops', JSON.stringify(data));
                return data;
            }
        } catch (e) { }
        return [];
    },

    async saveCrop(crop: CropDefinition): Promise<CropDefinition | null> {
        const local = JSON.parse(localStorage.getItem('ao_crops') || '[]');
        const idx = local.findIndex((c: any) => c.id === crop.id);
        if (idx >= 0) local[idx] = crop; else local.push(crop);
        localStorage.setItem('ao_crops', JSON.stringify(local));

        try {
            const res = await fetchWithTimeout(`${API_BASE_URL}/crops`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(crop)
            });
            if (res.ok) return await res.json();
        } catch (e) { }
        return crop;
    },

    async deleteCrop(id: string): Promise<boolean> {
        try {
            await fetchWithTimeout(`${API_BASE_URL}/crops/${id}`, { method: 'DELETE', headers: getHeaders() });
        } catch (e) { }
        const local = JSON.parse(localStorage.getItem('ao_crops') || '[]');
        const filtered = local.filter((c: any) => c.id !== id);
        localStorage.setItem('ao_crops', JSON.stringify(filtered));
        return true;
    }
};

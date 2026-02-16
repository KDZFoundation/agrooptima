
import { FarmerClient, Field, FarmerDocument, SubsidyRate, CropDefinition, CsvTemplate, AuthResponse, User, FieldOperation } from '../types';
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

    async register(data: { email: string; password: string; fullName: string; role: string }): Promise<AuthResponse> {
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
        const local = JSON.parse(localStorage.getItem('ao_clients') || '[]');
        const idx = local.findIndex((c: FarmerClient) => c.producerId === client.producerId);
        if (idx >= 0) local[idx] = client; else local.push(client);
        localStorage.setItem('ao_clients', JSON.stringify(local));

        try {
            const res = await fetch(`${API_BASE_URL}/clients`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(client)
            });
            if (res.ok) {
                const saved = await res.json();
                const updated = JSON.parse(localStorage.getItem('ao_clients') || '[]');
                const i = updated.findIndex((c: FarmerClient) => c.producerId === saved.producerId);
                if (i >= 0) updated[i] = saved; else updated.push(saved);
                localStorage.setItem('ao_clients', JSON.stringify(updated));
                return saved;
            }
        } catch (e) {
            console.warn("Backend niedostępny, klient zapisany lokalnie.");
        }
        return client;
    },

    async deleteClient(id: string): Promise<boolean> {
        const local = JSON.parse(localStorage.getItem('ao_clients') || '[]');
        localStorage.setItem('ao_clients', JSON.stringify(local.filter((c: FarmerClient) => c.producerId !== id)));

        try {
            const res = await fetch(`${API_BASE_URL}/clients/${id}`, { method: 'DELETE', headers: getHeaders() });
            if (!res.ok) console.warn("Błąd usuwania na serwerze.");
        } catch (e) {
            console.warn("Backend niedostępny.");
        }
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

        try {
            const response = await fetch(`${API_BASE_URL}/clients/${clientId}/fields`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(fields)
            });
            if (!response.ok) {
                console.warn('Serwer niedostępny - dane zapisane lokalnie.');
            }
        } catch (e) {
            console.warn('Backend offline - dane zapisane w localStorage.');
        }
        return fields;
    },

    async getOperations(clientId: string): Promise<FieldOperation[]> {
        const localKey = `ops_${clientId}`;
        const localData = JSON.parse(localStorage.getItem(localKey) || '[]');
        try {
            const res = await fetch(`${API_BASE_URL}/clients/${clientId}/operations`, { headers: getHeaders() });
            if (res.ok) {
                const data = await res.json();
                localStorage.setItem(localKey, JSON.stringify(data));
                return data;
            }
            return localData;
        } catch (e) {
            return localData;
        }
    },

    async saveOperation(clientId: string, op: FieldOperation): Promise<FieldOperation> {
        const localKey = `ops_${clientId}`;
        const local = JSON.parse(localStorage.getItem(localKey) || '[]');
        const idx = local.findIndex((o: FieldOperation) => o.id === op.id);
        if (idx >= 0) local[idx] = op; else local.push(op);
        localStorage.setItem(localKey, JSON.stringify(local));

        try {
            const res = await fetch(`${API_BASE_URL}/clients/${clientId}/operations`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(op)
            });
            if (res.ok) return await res.json();
        } catch (e) {
            console.warn("Backend unavailable, operation saved locally.");
        }
        return op;
    },

    async deleteOperation(clientId: string, opId: string): Promise<boolean> {
        const localKey = `ops_${clientId}`;
        const local = JSON.parse(localStorage.getItem(localKey) || '[]');
        localStorage.setItem(localKey, JSON.stringify(local.filter((o: FieldOperation) => o.id !== opId)));

        try {
            const res = await fetch(`${API_BASE_URL}/clients/${clientId}/operations/${opId}`, {
                method: 'DELETE',
                headers: getHeaders()
            });
            return res.ok;
        } catch (e) {
            return true;
        }
    },

    async addDocument(clientId: string, doc: FarmerDocument): Promise<FarmerDocument | null> {
        const localClients = JSON.parse(localStorage.getItem('ao_clients') || '[]');
        const clientIdx = localClients.findIndex((c: FarmerClient) => c.producerId === clientId);
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
        const clientIdx = localClients.findIndex((c: FarmerClient) => c.producerId === clientId);
        if (clientIdx >= 0) {
            localClients[clientIdx].documents = localClients[clientIdx].documents.filter((d: FarmerDocument) => d.id !== docId);
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
        try {
            const res = await fetch(`${API_BASE_URL}/templates`, { headers: getHeaders() });
            if (res.ok) {
                const data = await res.json();
                if (data) localStorage.setItem('ao_templates', JSON.stringify(data));
                return data;
            }
        } catch (e) {}
        const local = localStorage.getItem('ao_templates');
        return local ? JSON.parse(local) : [];
    },

    async saveTemplate(tpl: CsvTemplate): Promise<CsvTemplate | null> {
        try {
            const res = await fetch(`${API_BASE_URL}/templates`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(tpl) });
            if (res.ok) return await res.json();
        } catch (e) {}
        console.warn('Template saved locally only.');
        return tpl;
    },

    async getRates(): Promise<SubsidyRate[]> {
        try {
            const res = await fetch(`${API_BASE_URL}/rates`, { headers: getHeaders() });
            if (res.ok) return await res.json();
        } catch (e) {}
        return [];
    },

    async saveRate(rate: SubsidyRate): Promise<SubsidyRate | null> {
        try {
            const res = await fetch(`${API_BASE_URL}/rates`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(rate) });
            if (res.ok) return await res.json();
        } catch (e) {}
        return rate;
    },

    async deleteRate(id: string): Promise<boolean> {
        try {
            const res = await fetch(`${API_BASE_URL}/rates/${id}`, { method: 'DELETE', headers: getHeaders() });
            return res.ok;
        } catch (e) { return false; }
    },

    async getCrops(): Promise<CropDefinition[]> {
        try {
            const res = await fetch(`${API_BASE_URL}/crops`, { headers: getHeaders() });
            if (res.ok) return await res.json();
        } catch (e) {}
        return [];
    },

    async saveCrop(crop: CropDefinition): Promise<CropDefinition | null> {
        try {
            const res = await fetch(`${API_BASE_URL}/crops`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(crop) });
            if (res.ok) return await res.json();
        } catch (e) {}
        return crop;
    },

    async deleteCrop(id: string): Promise<boolean> {
        try {
            const res = await fetch(`${API_BASE_URL}/crops/${id}`, { method: 'DELETE', headers: getHeaders() });
            return res.ok;
        } catch (e) { return false; }
    }
};


import { FarmerClient, Field, FarmerDocument, SubsidyRate, CropDefinition } from '../types';

// In cloud environments (like IDX) or production, we usually serve frontend and backend 
// via the same domain (or use a proxy).
// By returning an empty string, fetch requests will go to '/api/...', 
// which Vite's proxy (in dev) or Nginx (in prod) will forward to the backend.
const getBaseUrl = () => {
    // 1. Check for explicit Vite env var
    if (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.VITE_API_URL) {
        return (import.meta as any).env.VITE_API_URL;
    }
    
    // 2. Default to relative path (triggers Proxy in Vite)
    return '';
};

const BASE_URL = getBaseUrl();
// Ensure we don't end up with //api if BASE_URL is empty
const API_BASE_URL = BASE_URL ? `${BASE_URL}/api` : '/api';

console.log(`%c[AgroOptima] Client initialized.`, 'color: #10b981; font-weight: bold;');
console.log(`%c[AgroOptima] API Strategy: ${BASE_URL ? 'Remote/Explicit' : 'Relative (Proxy)'}`, 'color: #0ea5e9;');

export const api = {
    // Check if backend is reachable
    async checkConnection(): Promise<boolean> {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);
            
            // Calling /health relatively
            const res = await fetch(`${BASE_URL || ''}/health`, { signal: controller.signal });
            clearTimeout(timeoutId);
            
            if (res.ok) {
                return true;
            }
            return false;
        } catch (e) {
            console.error("[AgroOptima] Connection check failed. Is backend running?", e);
            return false;
        }
    },

    // --- Clients ---
    async getClients(): Promise<FarmerClient[]> {
        try {
            const res = await fetch(`${API_BASE_URL}/clients`);
            if (!res.ok) throw new Error('Failed to fetch clients');
            return await res.json();
        } catch (error) {
            return []; 
        }
    },

    async createOrUpdateClient(client: FarmerClient): Promise<FarmerClient | null> {
        try {
            const res = await fetch(`${API_BASE_URL}/clients`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(client)
            });
            if (!res.ok) throw new Error('Failed to save client');
            return await res.json();
        } catch (error) {
            console.warn('API unavailable: Saving client locally.');
            return client;
        }
    },

    async deleteClient(id: string): Promise<boolean> {
        try {
            const res = await fetch(`${API_BASE_URL}/clients/${id}`, { method: 'DELETE' });
            return res.ok;
        } catch (error) {
            return true;
        }
    },

    // --- Fields ---
    async getClientFields(clientId: string): Promise<Field[]> {
        try {
            const res = await fetch(`${API_BASE_URL}/clients/${clientId}/fields`);
            if (!res.ok) return []; 
            return await res.json();
        } catch (error) {
            return [];
        }
    },

    async saveClientFields(clientId: string, fields: Field[]): Promise<Field[]> {
        try {
            const res = await fetch(`${API_BASE_URL}/clients/${clientId}/fields`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(fields)
            });
            if (!res.ok) throw new Error('Failed to save fields');
            return await res.json();
        } catch (error) {
            console.warn('API unavailable: Fields saved locally.');
            return fields; 
        }
    },

    // --- Documents ---
    async addDocument(clientId: string, doc: FarmerDocument): Promise<FarmerDocument | null> {
        try {
            const res = await fetch(`${API_BASE_URL}/clients/${clientId}/documents`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(doc)
            });
            if (!res.ok) throw new Error('Failed to add document');
            return await res.json();
        } catch (error) {
            return doc;
        }
    },

    async removeDocument(clientId: string, docId: string): Promise<boolean> {
        try {
            await fetch(`${API_BASE_URL}/clients/${clientId}/documents/${docId}`, {
                method: 'DELETE'
            });
            return true;
        } catch (error) {
            return true;
        }
    },

    // --- Rates / Ecoschemes ---
    async getRates(): Promise<SubsidyRate[]> {
        try {
            const res = await fetch(`${API_BASE_URL}/rates`);
            if (!res.ok) return [];
            return await res.json();
        } catch (error) {
            return [];
        }
    },

    async saveRate(rate: SubsidyRate): Promise<SubsidyRate | null> {
        try {
            const res = await fetch(`${API_BASE_URL}/rates`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(rate)
            });
            if (!res.ok) throw new Error('Failed to save rate');
            return await res.json();
        } catch (error) {
            return rate;
        }
    },

    async deleteRate(rateId: string): Promise<boolean> {
        try {
            await fetch(`${API_BASE_URL}/rates/${rateId}`, { method: 'DELETE' });
            return true;
        } catch (error) {
            return true;
        }
    },

    // --- Crops Dictionary ---
    async getCrops(): Promise<CropDefinition[]> {
        try {
            const res = await fetch(`${API_BASE_URL}/crops`);
            if (!res.ok) return [];
            return await res.json();
        } catch (error) {
            return [];
        }
    },

    async saveCrop(crop: CropDefinition): Promise<CropDefinition | null> {
        try {
            const res = await fetch(`${API_BASE_URL}/crops`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(crop)
            });
            if (!res.ok) throw new Error('Failed to save crop');
            return await res.json();
        } catch (error) {
            return crop;
        }
    },

    async deleteCrop(cropId: string): Promise<boolean> {
        try {
            await fetch(`${API_BASE_URL}/crops/${cropId}`, { method: 'DELETE' });
            return true;
        } catch (error) {
            return true;
        }
    }
};

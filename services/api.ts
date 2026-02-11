
import { FarmerClient, Field, FarmerDocument, SubsidyRate } from '../types';

// Detect API URL from environment (Vite/Cloud) or default to dynamic local
const getBaseUrl = () => {
    // 1. Check for explicit Vite env var
    if (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.VITE_API_URL) {
        return (import.meta as any).env.VITE_API_URL;
    }
    
    // 2. Dynamic Fallback
    if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;

        // Local Development
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return `http://127.0.0.1:8080`;
        }
        
        // Remote/Cloud (Cloud Run, Vercel, etc.)
        // When deployed on Cloud Run, we usually want relative paths if served from same domain,
        // OR empty string implies relative path.
        return '';
    }

    // 3. Last resort fallback
    return 'http://127.0.0.1:8080';
};

const BASE_URL = getBaseUrl();
const API_BASE_URL = BASE_URL ? `${BASE_URL}/api` : '/api';

// LOGGING FOR DEBUGGING DEPLOYMENT
console.log(`%c[AgroOptima] Client v2.3 initialized.`, 'background: #064e3b; color: #fff; padding: 2px 5px; border-radius: 3px; font-weight: bold;');
console.log(`%c[AgroOptima] API Target: ${BASE_URL || 'Relative Path (/api)'}`, 'color: #10b981;');

export const api = {
    // Check if backend is reachable
    async checkConnection(): Promise<boolean> {
        try {
            // Use a short timeout to fail fast if server is down
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000);
            
            // If API_BASE_URL is relative, this correctly hits the same origin
            const res = await fetch(`${BASE_URL || ''}/health`, { signal: controller.signal });
            clearTimeout(timeoutId);
            
            return res.ok;
        } catch (e) {
            console.warn("[AgroOptima] Connection check failed:", e);
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
            // console.warn('API getClients failed (Using Offline/Empty):', error);
            return []; 
        }
    },

    async createOrUpdateClient(client: FarmerClient): Promise<FarmerClient | null> {
        try {
            console.log("API: Saving client...", client);
            const res = await fetch(`${API_BASE_URL}/clients`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(client)
            });
            if (!res.ok) {
                const errText = await res.text();
                throw new Error(`Failed to save client: ${res.status} ${errText}`);
            }
            return await res.json();
        } catch (error) {
            console.warn('API unavailable (Offline Mode): Saving client locally.');
            // FALLBACK: Return the client as if saved to allow offline usage
            return client;
        }
    },

    async deleteClient(id: string): Promise<boolean> {
        try {
            const res = await fetch(`${API_BASE_URL}/clients/${id}`, { method: 'DELETE' });
            return res.ok;
        } catch (error) {
            console.warn('API unavailable (Offline Mode): Client deleted locally.');
            // FALLBACK: Return true to allow UI to update
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
            // console.warn('API getClientFields failed:', error);
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
            console.warn('API unavailable (Offline Mode): Fields saved locally.');
            // FALLBACK: Return input fields to allow optimistic UI updates
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
            console.warn('API unavailable (Offline Mode): Document added locally.');
            // FALLBACK: Return doc to allow offline usage
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
            console.warn('API unavailable (Offline Mode): Document removed locally.');
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
            // console.warn('API getRates failed:', error);
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
            console.warn('API unavailable (Offline Mode): Rate saved locally.');
            return rate;
        }
    },

    async deleteRate(rateId: string): Promise<boolean> {
        try {
            await fetch(`${API_BASE_URL}/rates/${rateId}`, { method: 'DELETE' });
            return true;
        } catch (error) {
            console.warn('API unavailable (Offline Mode): Rate deleted locally.');
            return true;
        }
    }
};

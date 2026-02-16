
import { KnowledgeChunk, FarmerDocument } from '../types';

const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;
const STORAGE_KEY = 'ao_rag_chunks';

class RagEngine {
    private chunks: KnowledgeChunk[] = [];

    constructor() {
        // Odczytaj zapisane chunki z localStorage przy starcie
        this.loadFromStorage();
    }

    private loadFromStorage() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                this.chunks = JSON.parse(stored);
                console.log(`[RAG] Wczytano ${this.chunks.length} fragmentów z localStorage.`);
            }
        } catch (e) {
            console.warn("[RAG] Nie udało się wczytać danych z localStorage.");
            this.chunks = [];
        }
    }

    private saveToStorage() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.chunks));
        } catch (e) {
            console.warn("[RAG] Nie udało się zapisać do localStorage (może za dużo danych).");
        }
    }

    public async indexDocument(doc: FarmerDocument, text: string) {
        if (!text || text.trim().length === 0) return;
        
        this.chunks = this.chunks.filter(c => c.documentId !== doc.id);

        const newChunks: KnowledgeChunk[] = [];
        let startIndex = 0;

        while (startIndex < text.length) {
            const endIndex = startIndex + CHUNK_SIZE;
            const content = text.substring(startIndex, endIndex);
            
            if (content.trim().length > 0) {
                newChunks.push({
                    id: `chunk_${doc.id}_${newChunks.length}`,
                    documentId: doc.id,
                    documentName: doc.name,
                    content: content,
                    category: doc.category,
                    metadata: {
                        timestamp: new Date().toISOString(),
                        section: this.detectSection(content)
                    },
                    tokens: Math.ceil(content.length / 4)
                });
            }

            startIndex += (CHUNK_SIZE - CHUNK_OVERLAP);
        }

        this.chunks.push(...newChunks);
        this.saveToStorage(); // ← ZAPISZ DO localStorage
        console.log(`[RAG] Zindeksowano: ${doc.name} (${newChunks.length} fragmentów)`);
    }

    public async getRelevantContextSemantic(query: string, limit: number = 5): Promise<KnowledgeChunk[]> {
        if (!query || this.chunks.length === 0) return [];

        const searchTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 3);
        
        const scored = this.chunks.map(chunk => {
            let score = 0;
            const contentLower = chunk.content.toLowerCase();
            
            searchTerms.forEach(term => {
                if (contentLower.includes(term)) {
                    score += 1;
                    if (contentLower.indexOf(term) === 0) score += 0.5;
                }
            });

            return { chunk, score };
        });

        return scored
            .filter(item => item.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, limit)
            .map(item => item.chunk);
    }

    private detectSection(text: string): string {
        const textLower = text.toLowerCase();
        if (textLower.includes("wniosek") || textLower.includes("przyznanie")) return "Wniosek";
        if (textLower.includes("działka") || textLower.includes("parcele")) return "Grunty";
        if (textLower.includes("ekoschemat") || textLower.includes("praktyk")) return "Ekoschematy";
        return "Dane ogólne";
    }

    public getAllChunks(): KnowledgeChunk[] {
        return this.chunks;
    }

    public clearStore() {
        this.chunks = [];
        localStorage.removeItem(STORAGE_KEY);
    }
}

export const ragEngine = new RagEngine();

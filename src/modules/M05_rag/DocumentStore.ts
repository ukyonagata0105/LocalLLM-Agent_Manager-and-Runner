/**
 * M05 RAG & Semantic Search - Document Store
 * In-memory vector store with semantic search.
 */

import { Document, DocumentMetadata, SearchResult, RAGConfig, DEFAULT_RAG_CONFIG } from './types';

// Sparse cosine similarity
function cosineSimilarity(a: Record<string, number>, b: Record<string, number>): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    const allKeys = new Set([...Object.keys(a), ...Object.keys(b)]);

    for (const key of allKeys) {
        const valA = a[key] || 0;
        const valB = b[key] || 0;
        dotProduct += valA * valB;
        normA += valA * valA;
        normB += valB * valB;
    }

    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Simple text-based embedding (Word Frequency Map)
// No longer depends on shared vocabulary index, making it robust for incremental updates
function simpleEmbed(text: string): Record<string, number> {
    const words = text.toLowerCase().split(/\W+/).filter(w => w.length > 2);
    const wordFreq: Record<string, number> = {};

    for (const word of words) {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
    }

    return wordFreq;
}

export class DocumentStore {
    private documents: Map<string, Document> = new Map();
    // vocabulary is no longer needed for sparse embeddings
    private config: RAGConfig;

    constructor(config?: Partial<RAGConfig>) {
        this.config = { ...DEFAULT_RAG_CONFIG, ...config };
    }

    async addDocument(content: string, metadata: Partial<DocumentMetadata>): Promise<Document> {
        const id = crypto.randomUUID();
        const now = Date.now();

        // Chunk the document
        const chunks = this.chunkText(content);

        // Create embeddings
        const embedding = simpleEmbed(content);

        const doc: Document = {
            id,
            content,
            metadata: {
                source: metadata.source || 'unknown',
                title: metadata.title,
                author: metadata.author,
                createdAt: now,
                updatedAt: now,
                mimeType: metadata.mimeType,
                size: content.length,
                tags: metadata.tags || [],
            },
            embedding,
            chunks: chunks.map((chunk, index) => ({
                id: `${id}-chunk-${index}`,
                content: chunk.content,
                startOffset: chunk.startOffset,
                endOffset: chunk.endOffset,
                embedding: simpleEmbed(chunk.content),
            })),
        };

        this.documents.set(id, doc);
        return doc;
    }

    private chunkText(text: string): Array<{ content: string; startOffset: number; endOffset: number }> {
        const chunks: Array<{ content: string; startOffset: number; endOffset: number }> = [];
        const { chunkSize, chunkOverlap } = this.config;

        for (let i = 0; i < text.length; i += chunkSize - chunkOverlap) {
            const endOffset = Math.min(i + chunkSize, text.length);
            chunks.push({
                content: text.slice(i, endOffset),
                startOffset: i,
                endOffset,
            });

            if (endOffset === text.length) break;
        }

        return chunks;
    }

    async search(query: string, maxResults?: number): Promise<SearchResult[]> {
        const queryEmbedding = simpleEmbed(query);
        const results: SearchResult[] = [];
        const limit = maxResults || this.config.maxResults;

        for (const doc of this.documents.values()) {
            // Search in chunks
            if (doc.chunks) {
                for (const chunk of doc.chunks) {
                    if (chunk.embedding) {
                        const score = cosineSimilarity(queryEmbedding, chunk.embedding);
                        if (score >= this.config.similarityThreshold) {
                            results.push({ document: doc, chunk, score });
                        }
                    }
                }
            }

            // Also search full document
            if (doc.embedding) {
                const score = cosineSimilarity(queryEmbedding, doc.embedding);
                if (score >= this.config.similarityThreshold) {
                    results.push({ document: doc, score });
                }
            }
        }

        // Sort by score and limit
        results.sort((a, b) => b.score - a.score);
        return results.slice(0, limit);
    }

    async keywordSearch(query: string, maxResults?: number): Promise<SearchResult[]> {
        const keywords = query.toLowerCase().split(/\W+/).filter(w => w.length > 2);
        const results: SearchResult[] = [];
        const limit = maxResults || this.config.maxResults;

        for (const doc of this.documents.values()) {
            const content = doc.content.toLowerCase();
            let matches = 0;

            for (const keyword of keywords) {
                if (content.includes(keyword)) {
                    matches++;
                }
            }

            if (matches > 0) {
                const score = matches / keywords.length;
                results.push({ document: doc, score });
            }
        }

        results.sort((a, b) => b.score - a.score);
        return results.slice(0, limit);
    }

    getDocument(id: string): Document | undefined {
        return this.documents.get(id);
    }

    deleteDocument(id: string): boolean {
        return this.documents.delete(id);
    }

    getAllDocuments(): Document[] {
        return Array.from(this.documents.values());
    }

    getDocumentCount(): number {
        return this.documents.size;
    }

    clear(): void {
        this.documents.clear();
    }
}

// Singleton
let storeInstance: DocumentStore | null = null;

export function getDocumentStore(config?: Partial<RAGConfig>): DocumentStore {
    if (!storeInstance) {
        storeInstance = new DocumentStore(config);
    }
    return storeInstance;
}

/**
 * M05 RAG & Semantic Search - Types
 * Types for retrieval-augmented generation.
 */

export interface Document {
    id: string;
    content: string;
    metadata: DocumentMetadata;
    embedding?: Record<string, number>;
    chunks?: DocumentChunk[];
}

export interface DocumentMetadata {
    source: string;
    title?: string;
    author?: string;
    createdAt: number;
    updatedAt: number;
    mimeType?: string;
    size?: number;
    tags?: string[];
}

export interface DocumentChunk {
    id: string;
    content: string;
    startOffset: number;
    endOffset: number;
    embedding?: Record<string, number>;
}

export interface SearchResult {
    document: Document;
    chunk?: DocumentChunk;
    score: number;
    highlights?: string[];
}

export interface RAGConfig {
    chunkSize: number;
    chunkOverlap: number;
    embeddingModel: string;
    similarityThreshold: number;
    maxResults: number;
}

export const DEFAULT_RAG_CONFIG: RAGConfig = {
    chunkSize: 512,
    chunkOverlap: 50,
    embeddingModel: 'all-MiniLM-L6-v2',
    similarityThreshold: 0.1,
    maxResults: 10,
};

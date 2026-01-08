
import { describe, it, expect } from 'vitest';
import { getDocumentStore } from './DocumentStore';

describe('M05 RAG', () => {
    it('should initialize DocumentStore', () => {
        const store = getDocumentStore();
        expect(store).toBeDefined();
    });

    it('should add and retrieve a document', async () => {
        const store = getDocumentStore();
        const doc = await store.addDocument('This is a test document about AI agents.', {
            title: 'Test Doc',
            source: 'test'
        });

        expect(doc.id).toBeDefined();
        const retrieved = store.getDocument(doc.id);
        expect(retrieved).toBeDefined();
        expect(retrieved?.content).toContain('test document');
    });

    it('should search for documents', async () => {
        const store = getDocumentStore(); // Singleton
        // Ensure store has data
        await store.addDocument('This is a test document about AI agents.', {
            title: 'Test Doc',
            source: 'test'
        });

        // search logic depends on simpleEmbed
        const results = await store.search('AI agents');
        expect(results.length).toBeGreaterThan(0);
        expect(results[0].document.content).toContain('AI agents');
    });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DifyClient } from './DifyClient';

// Mock global fetch
global.fetch = vi.fn();

describe('DifyClient', () => {
    let client: DifyClient;
    const config = {
        apiKey: 'test-api-key',
        baseUrl: 'http://localhost/v1'
    };

    beforeEach(() => {
        client = new DifyClient(config);
        vi.clearAllMocks();
    });

    it('should initialize with correct config', () => {
        expect(client).toBeDefined();
        // @ts-expect-error - Check private property
        expect(client.apiKey).toBe('test-api-key');
        // @ts-expect-error
        expect(client.baseUrl).toBe('http://localhost/v1');
    });

    it('should list datasets', async () => {
        const mockResponse = {
            data: [{ id: '1', name: 'Test Dataset' }],
            has_more: false
        };

        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => mockResponse
        });

        const result = await client.listDatasets();

        expect(global.fetch).toHaveBeenCalledWith(
            'http://localhost/v1/datasets?page=1&limit=20',
            expect.objectContaining({
                method: 'GET',
                headers: expect.objectContaining({
                    'Authorization': 'Bearer test-api-key'
                })
            })
        );
        expect(result).toEqual(mockResponse);
    });

    it('should handle API errors', async () => {
        (global.fetch as any).mockResolvedValueOnce({
            ok: false,
            statusText: 'Unauthorized'
        });

        await expect(client.listDatasets()).rejects.toThrow('Dify API Error: Unauthorized');
    });

    it('should create document by text', async () => {
        const mockDoc = { id: 'doc-1', name: 'New Doc' };

        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => mockDoc
        });

        const result = await client.createDocumentByText('ds-1', 'New Doc', 'Content');

        expect(global.fetch).toHaveBeenCalledWith(
            'http://localhost/v1/datasets/ds-1/document/create_by_text',
            expect.objectContaining({
                method: 'POST',
                body: JSON.stringify({
                    name: 'New Doc',
                    text: 'Content',
                    indexing_technique: 'high_quality',
                    process_rule: { mode: 'automatic' }
                })
            })
        );
        expect(result).toEqual(mockDoc);
    });
});

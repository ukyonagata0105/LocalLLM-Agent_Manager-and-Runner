/**
 * M05 RAG - Dify Client
 * Interface for interacting with Dify Knowledge API
 */

export interface HelperConfig {
    apiKey: string;
    baseUrl: string;
}

export interface Dataset {
    id: string;
    name: string;
    description: string;
    permission: string;
    document_count: number;
    word_count: number;
}

export interface Document {
    id: string;
    position: number;
    data_source_type: string;
    data_source_info: {
        upload_file_id: string;
    };
    created_at: number;
    name: string;
    completed_segments?: number;
    total_segments?: number;
    indexing_status?: 'indexing' | 'completed' | 'error' | 'waiting';
}

export class DifyClient {
    private apiKey: string;
    private baseUrl: string;

    constructor(config: HelperConfig) {
        this.apiKey = config.apiKey;
        this.baseUrl = config.baseUrl.replace(/\/$/, ''); // Remove trailing slash
    }

    private get headers() {
        return {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
        };
    }

    async testConnection(): Promise<boolean> {
        try {
            await this.listDatasets({ page: 1, limit: 1 });
            return true;
        } catch (e) {
            console.error('Dify Connection Failed:', e);
            return false;
        }
    }

    async listDatasets(params: { page?: number; limit?: number } = {}): Promise<{ data: Dataset[], has_more: boolean }> {
        const query = new URLSearchParams({
            page: (params.page || 1).toString(),
            limit: (params.limit || 20).toString()
        });

        const res = await fetch(`${this.baseUrl}/datasets?${query}`, {
            method: 'GET',
            headers: this.headers
        });

        if (!res.ok) throw new Error(`Dify API Error: ${res.statusText}`);
        return await res.json();
    }

    async createDocumentByText(datasetId: string, name: string, text: string): Promise<Document> {
        const res = await fetch(`${this.baseUrl}/datasets/${datasetId}/document/create_by_text`, {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify({
                name,
                text,
                indexing_technique: 'high_quality',
                process_rule: { mode: 'automatic' }
            })
        });

        if (!res.ok) throw new Error(`Dify Upload Error: ${res.statusText}`);
        return await res.json();
    }

    async createDocumentByFile(datasetId: string, file: File | Blob, fileName: string): Promise<Document> {
        const formData = new FormData();
        formData.append('file', file, fileName);
        formData.append('indexing_technique', 'high_quality');
        formData.append('process_rule', JSON.stringify({ mode: 'automatic' }));

        const res = await fetch(`${this.baseUrl}/datasets/${datasetId}/document/create_by_file`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                // Content-Type header is auto-set by fetch when body is FormData
            },
            body: formData
        });

        if (!res.ok) throw new Error(`Dify File Upload Error: ${res.statusText} - ${await res.text()}`);
        return await res.json();
    }

    async createDataset(name: string): Promise<Dataset> {
        const res = await fetch(`${this.baseUrl}/datasets`, {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify({ name })
        });
        if (!res.ok) throw new Error(`Dify Create Dataset Error: ${res.statusText}`);
        return await res.json();
    }

    async retrieve(datasetId: string, query: string): Promise<any> {
        const res = await fetch(`${this.baseUrl}/datasets/${datasetId}/retrieve`, {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify({
                query,
                retrieval_model: {
                    search_method: 'hybrid_search',
                    reranking_enable: true,
                    top_k: 4,
                    score_threshold_enabled: true,
                    score_threshold: 0.5
                }
            })
        });

        if (!res.ok) throw new Error(`Dify Retrieve Error: ${res.statusText}`);
        return await res.json();
    }
}

// Singleton helper that reads from electron-store via IPC (requires window context)
export const getDifyClient = async (): Promise<DifyClient | null> => {
    try {
        // @ts-expect-error
        if (window.ipcRenderer) {
            // @ts-expect-error
            const apiKey = await window.ipcRenderer.invoke('get-config', 'dify.apiKey');
            // @ts-expect-error
            const baseUrl = await window.ipcRenderer.invoke('get-config', 'dify.baseUrl');

            if (!apiKey || !baseUrl) return null;

            return new DifyClient({ apiKey, baseUrl });
        }
        return null; // Browser mock?
    } catch (e) {
        console.error('Failed to init Dify Client', e);
        return null;
    }
};

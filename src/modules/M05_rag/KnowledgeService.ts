
import { DifyClient, Dataset } from './DifyClient';
import * as fs from 'fs';
import * as path from 'path';

export class KnowledgeService {
    private client: DifyClient;
    private projectRoot: string;

    constructor(apiKey: string, baseUrl: string, projectRoot: string) {
        this.client = new DifyClient({ apiKey, baseUrl });
        this.projectRoot = projectRoot;
    }

    async getOrCreateProjectDataset(): Promise<Dataset> {
        const projectName = path.basename(this.projectRoot);
        console.log(`Checking Dify Dataset for project: ${projectName}`);

        // 1. List Datasets and find match
        // Note: Pagination might miss it if > 20 datasets. Improving this later.
        const list = await this.client.listDatasets({ limit: 100 });
        const existing = list.data.find(d => d.name === projectName);

        if (existing) {
            console.log(`Found existing dataset: ${existing.id}`);
            return existing;
        }

        // 2. Create if missing
        console.log(`Creating new dataset: ${projectName}`);
        return await this.client.createDataset(projectName);
    }

    async syncFile(datasetId: string, relativePath: string) {
        const fullPath = path.join(this.projectRoot, relativePath);
        if (!fs.existsSync(fullPath)) return;

        console.log(`Syncing file to Dify: ${relativePath}`);
        try {
            const buffer = fs.readFileSync(fullPath);
            const blob = new Blob([buffer]);

            // Dify API expects a file object
            await this.client.createDocumentByFile(datasetId, blob, path.basename(relativePath));
            console.log(`Successfully uploaded: ${relativePath}`);
        } catch (error) {
            console.error(`Failed to upload ${relativePath}:`, error);
        }
    }
}

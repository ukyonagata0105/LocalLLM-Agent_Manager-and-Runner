
import { KnowledgeService } from '../src/modules/M05_rag/KnowledgeService';
import * as path from 'path';
import * as chokidar from 'chokidar';

// Configuration from Env Vars
const DIFY_API_KEY = process.env.DIFY_API_KEY;
const DIFY_BASE_URL = process.env.DIFY_BASE_URL || 'http://localhost/v1';
const PROJECT_ROOT = process.env.PROJECT_ROOT || process.cwd();

if (!DIFY_API_KEY) {
    console.error('Error: DIFY_API_KEY environment variable is required.');
    process.exit(1);
}

console.log(`Starting RAG Watcher for: ${PROJECT_ROOT}`);
console.log(`Target Dify API: ${DIFY_BASE_URL}`);

const service = new KnowledgeService(DIFY_API_KEY, DIFY_BASE_URL, PROJECT_ROOT);

async function start() {
    try {
        // 1. Ensure Dataset Exists
        const dataset = await service.getOrCreateProjectDataset();
        console.log(`Using Dataset: ${dataset.name} (ID: ${dataset.id})`);

        // 2. Start Watcher
        console.log('Initializing file watcher...');
        const watcher = chokidar.watch(PROJECT_ROOT, {
            ignored: [
                /(^|[/\\])\.\./, // ignore dotfiles
                /node_modules/,
                /\.git/,
                /dist/,
                /out/,
                /build/
            ],
            persistent: true,
            ignoreInitial: true // Don't upload everything on start for now (too heavy)
        });

        watcher
            .on('add', path => {
                console.log(`File added: ${path}`);
                service.syncFile(dataset.id, path);
            })
            .on('change', path => {
                console.log(`File changed: ${path}`);
                service.syncFile(dataset.id, path);
            })
            .on('error', error => console.error(`Watcher error: ${error}`));

        console.log('RAG Watcher is active. Use Ctrl+C to stop.');

    } catch (error) {
        console.error('Fatal Error:', error);
        process.exit(1);
    }
}

start();

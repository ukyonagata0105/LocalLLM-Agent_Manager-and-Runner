/**
 * Auto RAG Indexer
 * Watches specified folders and automatically indexes files to knowledge base
 */

import { getDocumentStore } from './DocumentStore';

interface IndexerConfig {
    mode: 'idle' | 'manual' | 'realtime';
    includePaths: string[];
    excludePatterns: string[];
    idleTriggerMs: number;
    supportedExtensions: string[];
}

const DEFAULT_CONFIG: IndexerConfig = {
    mode: 'idle',
    includePaths: [],
    excludePatterns: ['node_modules', '.git', 'dist', 'build', '.next'],
    idleTriggerMs: 60000, // 1 minute idle
    supportedExtensions: ['.md', '.txt', '.ts', '.tsx', '.js', '.jsx', '.py', '.json', '.yaml', '.yml'],
};

export class AutoRAGIndexer {
    private config: IndexerConfig;
    private isIndexing = false;
    private lastActivity = Date.now();
    private idleTimer: ReturnType<typeof setTimeout> | null = null;
    private indexedFiles = new Set<string>();
    private watchers: Array<{ close: () => void }> = [];

    constructor(config?: Partial<IndexerConfig>) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    /**
     * Add a folder to watch for indexing
     */
    async addFolder(folderPath: string): Promise<{ success: boolean; message: string }> {
        if (this.config.includePaths.includes(folderPath)) {
            return { success: false, message: 'Folder already being watched' };
        }

        this.config.includePaths.push(folderPath);

        // Start watching if in realtime mode
        if (this.config.mode === 'realtime') {
            await this.startWatching(folderPath);
        }

        // Trigger initial index
        await this.indexFolder(folderPath);

        return { success: true, message: `Now watching: ${folderPath}` };
    }

    /**
     * Remove a folder from watching
     */
    removeFolder(folderPath: string): void {
        const index = this.config.includePaths.indexOf(folderPath);
        if (index !== -1) {
            this.config.includePaths.splice(index, 1);
        }
    }

    /**
     * Index a single folder
     */
    async indexFolder(folderPath: string): Promise<number> {
        if (typeof window !== 'undefined') {
            // Browser mode - use IPC
            // @ts-expect-error
            if (window.ipcRenderer) {
                try {
                    // @ts-expect-error
                    const files = await window.ipcRenderer.invoke('list-files-recursive', folderPath);
                    return await this.indexFiles(files);
                } catch (e) {
                    console.error('[AutoRAGIndexer] Failed to list files:', e);
                    return 0;
                }
            }
            return 0;
        }

        // Node.js mode
        const fs = await import('fs');
        const path = await import('path');
        const files = await this.walkDirectory(folderPath, fs, path);
        return await this.indexFiles(files);
    }

    private async walkDirectory(
        dir: string,
        fs: typeof import('fs'),
        path: typeof import('path')
    ): Promise<string[]> {
        const files: string[] = [];

        try {
            const entries = fs.readdirSync(dir, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);

                // Check exclusions
                if (this.config.excludePatterns.some(p => fullPath.includes(p))) {
                    continue;
                }

                if (entry.isDirectory()) {
                    files.push(...await this.walkDirectory(fullPath, fs, path));
                } else if (entry.isFile()) {
                    const ext = path.extname(entry.name).toLowerCase();
                    if (this.config.supportedExtensions.includes(ext)) {
                        files.push(fullPath);
                    }
                }
            }
        } catch (e) {
            console.error(`[AutoRAGIndexer] Error walking ${dir}:`, e);
        }

        return files;
    }

    private async indexFiles(filePaths: string[]): Promise<number> {
        const store = getDocumentStore();
        let indexed = 0;

        this.isIndexing = true;

        for (const filePath of filePaths) {
            if (this.indexedFiles.has(filePath)) continue;

            try {
                let content: string;

                if (typeof window !== 'undefined') {
                    // @ts-expect-error
                    if (window.ipcRenderer) {
                        // @ts-expect-error
                        content = await window.ipcRenderer.invoke('read-file', filePath);
                    } else {
                        continue;
                    }
                } else {
                    const fs = await import('fs');
                    content = fs.readFileSync(filePath, 'utf-8');
                }

                if (content && content.length > 0 && content.length < 100000) { // Max 100KB
                    await store.addDocument(
                        content.substring(0, 10000), // Max 10K chars per doc
                        {
                            source: filePath,
                            title: filePath.split('/').pop() || filePath,
                            tags: ['auto-indexed'],
                        }
                    );
                    this.indexedFiles.add(filePath);
                    indexed++;
                }
            } catch (e) {
                console.error(`[AutoRAGIndexer] Failed to index ${filePath}:`, e);
            }
        }

        this.isIndexing = false;
        console.log(`[AutoRAGIndexer] Indexed ${indexed} files`);
        return indexed;
    }

    /**
     * Start watching a folder for changes (realtime mode)
     */
    private async startWatching(folderPath: string): Promise<void> {
        if (typeof window !== 'undefined') return; // No file watching in browser

        try {
            const chokidar = await import('chokidar');
            const watcher = chokidar.watch(folderPath, {
                ignored: this.config.excludePatterns.map(p => `**/${p}/**`),
                persistent: true,
                ignoreInitial: true,
            });

            watcher.on('add', (path: string) => this.onFileChange(path));
            watcher.on('change', (path: string) => this.onFileChange(path));
            watcher.on('unlink', (path: string) => this.onFileDelete(path));

            this.watchers.push(watcher);
        } catch (e) {
            console.error('[AutoRAGIndexer] Failed to start watcher:', e);
        }
    }

    private async onFileChange(filePath: string): Promise<void> {
        const ext = filePath.substring(filePath.lastIndexOf('.')).toLowerCase();
        if (!this.config.supportedExtensions.includes(ext)) return;

        // Re-index the file
        this.indexedFiles.delete(filePath);
        await this.indexFiles([filePath]);
    }

    private onFileDelete(filePath: string): void {
        const store = getDocumentStore();
        store.deleteDocument(filePath);
        this.indexedFiles.delete(filePath);
    }

    /**
     * Record user activity (for idle mode)
     */
    recordActivity(): void {
        this.lastActivity = Date.now();

        if (this.config.mode === 'idle') {
            if (this.idleTimer) clearTimeout(this.idleTimer);

            this.idleTimer = setTimeout(() => {
                this.indexAllFolders();
            }, this.config.idleTriggerMs);
        }
    }

    /**
     * Index all watched folders
     */
    async indexAllFolders(): Promise<number> {
        let total = 0;
        for (const folder of this.config.includePaths) {
            total += await this.indexFolder(folder);
        }
        return total;
    }

    /**
     * Get indexer status
     */
    getStatus(): {
        mode: string;
        watchedFolders: string[];
        indexedFileCount: number;
        isIndexing: boolean;
    } {
        return {
            mode: this.config.mode,
            watchedFolders: this.config.includePaths,
            indexedFileCount: this.indexedFiles.size,
            isIndexing: this.isIndexing,
        };
    }

    /**
     * Set indexing mode
     */
    setMode(mode: 'idle' | 'manual' | 'realtime'): void {
        this.config.mode = mode;

        if (mode === 'realtime') {
            // Start watchers for all folders
            for (const folder of this.config.includePaths) {
                this.startWatching(folder);
            }
        } else {
            // Stop all watchers
            for (const watcher of this.watchers) {
                watcher.close();
            }
            this.watchers = [];
        }
    }

    /**
     * Stop the indexer
     */
    stop(): void {
        if (this.idleTimer) clearTimeout(this.idleTimer);
        for (const watcher of this.watchers) {
            watcher.close();
        }
        this.watchers = [];
    }
}

// Singleton
let indexerInstance: AutoRAGIndexer | null = null;

export function getAutoRAGIndexer(): AutoRAGIndexer {
    if (!indexerInstance) {
        indexerInstance = new AutoRAGIndexer();
    }
    return indexerInstance;
}

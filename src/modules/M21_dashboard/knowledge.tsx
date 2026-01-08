import React, { useState, useEffect } from 'react';
import { Database, Server, ExternalLink, FolderPlus, Trash2, RefreshCw, Search, FileText } from 'lucide-react';
import { manageDifyTool } from '../M01_core/tools';
import { getLLMManager } from '../M02_llm/LLMManager';
import { getAutoRAGIndexer } from '../M05_rag/AutoRAGIndexer';
import { getDocumentStore } from '../M05_rag/DocumentStore';

export const KnowledgeManager: React.FC = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [isStarted, setIsStarted] = useState(false);
    const [status, setStatus] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'dify' | 'local'>('local');

    // Local RAG state
    const [watchedFolders, setWatchedFolders] = useState<string[]>([]);
    const [indexedCount, setIndexedCount] = useState(0);
    const [indexMode, setIndexMode] = useState<'idle' | 'manual' | 'realtime'>('idle');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Array<{ content: string; score: number }>>([]);

    useEffect(() => {
        // Load indexer state
        const indexer = getAutoRAGIndexer();
        const state = indexer.getStatus();
        setWatchedFolders(state.watchedFolders);
        setIndexedCount(state.indexedFileCount);
        setIndexMode(state.mode as 'idle' | 'manual' | 'realtime');
    }, []);

    const handleStartDify = async () => {
        setIsLoading(true);
        setStatus('Initializing Dify (Cloning/Starting Docker)...');

        try {
            const llmManager = getLLMManager();
            await llmManager.loadFromStore();

            const result = await manageDifyTool.execute({
                action: 'start',
                llmConfig: {}
            });

            if ((result as { success: boolean }).success) {
                setStatus('Dify Started! Loading UI...');
                setTimeout(() => {
                    setIsStarted(true);
                    setStatus(null);
                }, 5000);
            } else {
                setStatus(`Error: ${(result as { error?: string }).error}`);
            }
        } catch (e) {
            setStatus(`Failed: ${e}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddFolder = async () => {
        // @ts-expect-error
        if (window.ipcRenderer) {
            try {
                // @ts-expect-error
                const result = await window.ipcRenderer.invoke('dialog-open-directory');
                if (result && result.length > 0) {
                    const folder = result[0];
                    const indexer = getAutoRAGIndexer();
                    await indexer.addFolder(folder);
                    setWatchedFolders(prev => [...prev, folder]);
                    const state = indexer.getStatus();
                    setIndexedCount(state.indexedFileCount);
                }
            } catch (e) {
                console.error('Failed to add folder:', e);
                setStatus(`Error: ${e}`);
            }
        } else {
            // Browser mode - show manual input and add to indexer
            const folder = prompt('Enter folder path to watch (e.g. /Volumes/UNTITLED/Projects/LocalLLM-Agent_Manager-and-Runner/docs):');
            if (folder) {
                const indexer = getAutoRAGIndexer();
                await indexer.addFolder(folder);
                setWatchedFolders(prev => [...prev, folder]);
                const state = indexer.getStatus();
                setIndexedCount(state.indexedFileCount);
                setStatus(`Added folder: ${folder}. Note: In browser mode, files cannot be read. Use Electron app for full functionality.`);
                setTimeout(() => setStatus(null), 5000);
            }
        }
    };

    const handleRemoveFolder = (folder: string) => {
        const indexer = getAutoRAGIndexer();
        indexer.removeFolder(folder);
        setWatchedFolders(prev => prev.filter(f => f !== folder));
    };

    const handleReindex = async () => {
        setIsLoading(true);
        setStatus('Re-indexing all folders...');
        try {
            const indexer = getAutoRAGIndexer();
            const count = await indexer.indexAllFolders();
            setIndexedCount(count);
            setStatus(`Indexed ${count} files`);
            setTimeout(() => setStatus(null), 3000);
        } catch (e) {
            setStatus(`Error: ${e}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;

        setIsLoading(true);
        try {
            const store = getDocumentStore();
            const results = await store.search(searchQuery, 5);
            setSearchResults(results.map(r => ({
                content: r.document.content.substring(0, 300) + '...',
                score: r.score,
            })));
        } catch (e) {
            console.error('Search error:', e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleModeChange = (mode: 'idle' | 'manual' | 'realtime') => {
        const indexer = getAutoRAGIndexer();
        indexer.setMode(mode);
        setIndexMode(mode);
    };

    return (
        <div className="h-full flex flex-col bg-gray-900 text-white">
            <header className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-900 z-10">
                <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Database className="text-blue-500" />
                        Knowledge Base
                    </h2>
                    <p className="text-xs text-gray-500">RAG Pipeline & Knowledge Management</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setActiveTab('local')}
                        className={`px-3 py-1.5 rounded-lg text-xs ${activeTab === 'local' ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-400'}`}
                    >
                        Local RAG
                    </button>
                    <button
                        onClick={() => setActiveTab('dify')}
                        className={`px-3 py-1.5 rounded-lg text-xs ${activeTab === 'dify' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'}`}
                    >
                        Dify (Advanced)
                    </button>
                </div>
            </header>

            <div className="flex-1 bg-gray-950 relative flex flex-col overflow-hidden">
                {activeTab === 'local' ? (
                    <div className="flex-1 p-6 overflow-y-auto">
                        {/* Search */}
                        <div className="mb-6">
                            <div className="flex gap-2">
                                <div className="flex-1 relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                        placeholder="Search knowledge base..."
                                        className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500"
                                    />
                                </div>
                                <button
                                    onClick={handleSearch}
                                    disabled={isLoading}
                                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white flex items-center gap-2"
                                >
                                    <Search size={16} />
                                    Search
                                </button>
                            </div>
                        </div>

                        {/* Search Results */}
                        {searchResults.length > 0 && (
                            <div className="mb-6 p-4 bg-gray-800 rounded-lg">
                                <h3 className="font-semibold mb-3">Search Results</h3>
                                {searchResults.map((result, i) => (
                                    <div key={i} className="p-3 bg-gray-900 rounded mb-2">
                                        <div className="text-xs text-emerald-400 mb-1">Score: {result.score.toFixed(3)}</div>
                                        <p className="text-sm text-gray-300">{result.content}</p>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Indexing Settings */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Watched Folders */}
                            <div className="p-4 bg-gray-800 rounded-lg">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-semibold">Watched Folders</h3>
                                    <button
                                        onClick={handleAddFolder}
                                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded text-xs flex items-center gap-1"
                                    >
                                        <FolderPlus size={14} />
                                        Add Folder
                                    </button>
                                </div>
                                {watchedFolders.length === 0 ? (
                                    <p className="text-gray-500 text-sm">No folders being watched. Add a folder to start indexing.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {watchedFolders.map((folder, i) => (
                                            <div key={i} className="flex items-center justify-between p-2 bg-gray-900 rounded">
                                                <span className="text-sm truncate flex-1">{folder}</span>
                                                <button
                                                    onClick={() => handleRemoveFolder(folder)}
                                                    className="p-1 text-red-400 hover:text-red-300"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Index Status */}
                            <div className="p-4 bg-gray-800 rounded-lg">
                                <h3 className="font-semibold mb-4">Indexing Status</h3>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-400">Indexed Files</span>
                                        <span className="text-2xl font-bold text-emerald-400">{indexedCount}</span>
                                    </div>
                                    <div>
                                        <label className="text-sm text-gray-400 mb-2 block">Update Mode</label>
                                        <div className="flex gap-2">
                                            {(['idle', 'manual', 'realtime'] as const).map(mode => (
                                                <button
                                                    key={mode}
                                                    onClick={() => handleModeChange(mode)}
                                                    className={`px-3 py-1.5 rounded text-xs capitalize ${indexMode === mode ? 'bg-emerald-600 text-white' : 'bg-gray-700 text-gray-400'
                                                        }`}
                                                >
                                                    {mode}
                                                </button>
                                            ))}
                                        </div>
                                        <p className="text-xs text-gray-500 mt-2">
                                            {indexMode === 'idle' && 'Index updates when system is idle'}
                                            {indexMode === 'manual' && 'Index only when you click refresh'}
                                            {indexMode === 'realtime' && 'Index updates immediately on file changes'}
                                        </p>
                                    </div>
                                    <button
                                        onClick={handleReindex}
                                        disabled={isLoading}
                                        className="w-full py-2 bg-gray-700 hover:bg-gray-600 rounded flex items-center justify-center gap-2"
                                    >
                                        <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                                        {isLoading ? 'Indexing...' : 'Re-index Now'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {status && (
                            <div className="mt-4 p-3 bg-yellow-900/30 border border-yellow-700/50 rounded text-yellow-400 text-sm">
                                {status}
                            </div>
                        )}
                    </div>
                ) : (
                    // Dify Tab
                    <>
                        <div className="p-4 border-b border-gray-800 flex items-center gap-4">
                            <button
                                onClick={handleStartDify}
                                disabled={isLoading || isStarted}
                                className={`px-4 py-2 rounded-lg text-sm flex items-center gap-2 ${isStarted ? 'bg-emerald-600/20 text-emerald-400' : 'bg-blue-600 hover:bg-blue-500 text-white'
                                    }`}
                            >
                                {isLoading ? 'Starting...' : isStarted ? '✓ Dify Running' : '▶ Start Dify'}
                            </button>
                            <a
                                href="http://localhost/apps"
                                target="_blank"
                                rel="noreferrer"
                                className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-xs flex items-center gap-2"
                            >
                                Open in Browser <ExternalLink size={12} />
                            </a>
                            {status && <span className="text-xs text-yellow-500">{status}</span>}
                        </div>
                        {isStarted ? (
                            <iframe
                                src="http://localhost/apps"
                                className="w-full h-full border-0 bg-white"
                                title="Dify Interface"
                            />
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-gray-500 space-y-4 p-8">
                                <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center">
                                    <Server size={32} className="text-gray-600" />
                                </div>
                                <h3 className="text-lg font-medium text-gray-300">Dify Service Not Started</h3>
                                <p className="text-sm max-w-md text-center">
                                    Dify provides advanced RAG features with vector databases and LLM pipelines.
                                    Click "Start Dify" to initialize the Docker containers.
                                </p>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

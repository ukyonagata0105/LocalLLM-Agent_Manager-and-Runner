import { app, BrowserWindow, ipcMain } from 'electron';
import { exec } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.env.DIST = path.join(__dirname, '../dist');
process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : path.join(process.env.DIST, '../public');
let win;
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];
function createWindow() {
    win = new BrowserWindow({
        width: 1200,
        height: 800,
        icon: path.join(process.env.VITE_PUBLIC || '', 'electron-vite.svg'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
        },
    });
    // Test active push message to Dashboard Webview
    win.webContents.on('did-finish-load', () => {
        win?.webContents.send('main-process-message', (new Date).toLocaleString());
    });
    if (VITE_DEV_SERVER_URL) {
        win.loadURL(VITE_DEV_SERVER_URL);
    }
    else {
        // win.loadFile('dist/index.html')
        win.loadFile(path.join(process.env.DIST || '', 'index.html'));
    }
}
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
// IPC Handler for executing tasks - REMOVED for security (RCE risk)
// If workflow execution is needed, implement a whitelist-based approach
// with predefined, safe commands only.
import * as os from 'os';
// Helper to get CPU usage
let lastCpuInfo = os.cpus();
function getCpuUsage() {
    const cpuInfo = os.cpus();
    let user = 0, nice = 0, sys = 0, idle = 0, irq = 0;
    for (const cpu of cpuInfo) {
        user += cpu.times.user;
        nice += cpu.times.nice;
        sys += cpu.times.sys;
        idle += cpu.times.idle;
        irq += cpu.times.irq;
    }
    let prevUser = 0, prevNice = 0, prevSys = 0, prevIdle = 0, prevIrq = 0;
    for (const cpu of lastCpuInfo) {
        prevUser += cpu.times.user;
        prevNice += cpu.times.nice;
        prevSys += cpu.times.sys;
        prevIdle += cpu.times.idle;
        prevIrq += cpu.times.irq;
    }
    lastCpuInfo = cpuInfo;
    const total = (user + nice + sys + idle + irq) - (prevUser + prevNice + prevSys + prevIdle + prevIrq);
    const totalIdle = idle - prevIdle;
    return 100 - Math.floor((totalIdle / total) * 100);
}
ipcMain.handle('get-system-stats', async () => {
    return {
        cpu: getCpuUsage(),
        memory: Math.round((os.totalmem() - os.freemem()) / os.totalmem() * 100),
        memoryUsed: Math.round((os.totalmem() - os.freemem()) / 1024 / 1024),
        memoryTotal: Math.round(os.totalmem() / 1024 / 1024),
        uptime: os.uptime(),
    };
});
import Store from 'electron-store';
const store = new Store();
// Allowed config keys whitelist for security
const ALLOWED_CONFIG_KEYS = [
    'llm.provider', 'llm.model', 'llm.apiKey', 'llm.baseUrl',
    'services.autoStart', 'services.stopOnQuit', 'auth'
];
ipcMain.handle('get-config', (_event, key) => {
    return store.get(key);
});
ipcMain.handle('set-config', (_event, key, value) => {
    if (!ALLOWED_CONFIG_KEYS.includes(key)) {
        console.warn(`[Config] Blocked write to unauthorized key: ${key}`);
        return false;
    }
    store.set(key, value);
    return true;
});
// ============================================================
// LLM Config Sync - Auto-propagate to all services
// ============================================================
ipcMain.handle('sync-llm-config', async (_event, config) => {
    console.log('[Main] Syncing LLM config to all services:', config.provider, config.model);
    // Save to persistent store
    store.set('llm.provider', config.provider);
    store.set('llm.model', config.model);
    if (config.apiKey)
        store.set('llm.apiKey', config.apiKey);
    if (config.baseUrl)
        store.set('llm.baseUrl', config.baseUrl);
    const results = { openhands: false, n8n: false, dify: false };
    // Restart OpenHands with new config
    console.log('[Main] Restarting OpenHands with new LLM config...');
    const ohResult = await serviceManager.startOpenHands({
        apiKey: config.apiKey || 'not-needed',
        model: config.model,
        baseUrl: config.baseUrl,
        provider: config.provider,
    });
    results.openhands = ohResult.success;
    // Restart n8n with new config (for AI features)
    console.log('[Main] Restarting n8n with new LLM config...');
    const n8nResult = await serviceManager.startN8n({
        apiKey: config.apiKey,
        baseUrl: config.baseUrl,
    });
    results.n8n = n8nResult.success;
    // Configure Dify with LLM settings
    console.log('[Main] Configuring Dify with new LLM config...');
    const difyResult = await serviceManager.startDify({
        apiKey: config.apiKey,
        model: config.model,
        baseUrl: config.baseUrl,
        provider: config.provider,
    });
    results.dify = difyResult.success;
    console.log('[Main] LLM config sync complete:', results);
    return { success: true, results };
});
// Helper for fetching models from the configured provider
// Note: We moved getLLMManager to be a local dynamic import to avoid bundling issues
ipcMain.handle('get-llm-models', async () => {
    // Note: We can't easily import the singleton here because of how Electron/Vite bundling works.
    // Instead, we'll implement a simple fetch for LM Studio specifically since that's what we want to be "elegant".
    // Or better, we just allow the UI to fetch directly if it's localhost, BUT CORS might be an issue.
    // Safer to do it here. Let's do a direct fetch to the stored baseUrl.
    const baseUrl = store.get('llm.baseUrl') || 'http://localhost:1234/v1';
    const provider = store.get('llm.provider');
    if (provider === 'lmstudio' || provider === 'ollama') {
        try {
            // Standard OpenAI format
            const fetch = (await import('node-fetch')).default;
            const res = await fetch(`${baseUrl}/models`);
            if (!res.ok)
                throw new Error('Failed to fetch models');
            const data = await res.json();
            return { success: true, models: data.data.map((m) => m.id) };
        }
        catch (e) {
            return { success: false, error: e.message };
        }
    }
    return { success: false, error: 'Provider does not support auto-discovery' };
});
// ============================================================
// Remote Access & Security
// ============================================================
import { getRemoteAccessManager } from '../src/modules/M11_remote/index';
import { getAuthService } from '../src/modules/M11_remote/AuthService';
import { getRemoteServer } from './RemoteServer';
// Tunnel targets the Remote API Server (Express) instead of Vite directly
// The Express server serves the static build + API
const remoteManager = getRemoteAccessManager({
    targetPort: 3001,
    enabled: true
});
const authService = getAuthService();
const remoteServer = getRemoteServer();
// Initialize auth from store
const storedAuth = store.get('auth');
if (storedAuth) {
    authService.importConfig(storedAuth);
}
// Remote Access IPC
ipcMain.handle('remote-start', async () => {
    // 1. Start Express Server
    remoteServer.start();
    // 2. Start Tunnel pointing to Express
    return remoteManager.startTunnel();
});
ipcMain.handle('remote-stop', async () => {
    const result = await remoteManager.stopTunnel();
    remoteServer.stop();
    return result;
});
// ============================================
// Service Manager Integration
// ============================================
import { getServiceManager } from './ServiceManager';
const serviceManager = getServiceManager();
// IPC Handlers for Service Management
ipcMain.handle('get-services-status', async () => {
    return await serviceManager.getServicesStatus();
});
ipcMain.handle('start-all-services', async () => {
    const config = {
        apiKey: store.get('llm.apiKey'),
        model: store.get('llm.model'),
        baseUrl: store.get('llm.baseUrl'),
        provider: store.get('llm.provider'),
        language: store.get('app.llm_language') || 'en',
    };
    return await serviceManager.startAllServices(config);
});
ipcMain.handle('stop-all-services', async () => {
    await serviceManager.stopAllServices();
    return { success: true };
});
ipcMain.handle('start-openhands', async () => {
    const config = {
        apiKey: store.get('llm.apiKey'),
        model: store.get('llm.model'),
        baseUrl: store.get('llm.baseUrl'),
        language: store.get('app.llm_language') || 'en',
    };
    return await serviceManager.startOpenHands(config);
});
ipcMain.handle('start-n8n', async () => {
    const config = {
        apiKey: store.get('llm.apiKey'),
        baseUrl: store.get('llm.baseUrl'),
        language: store.get('app.llm_language') || 'en',
    };
    return await serviceManager.startN8n(config);
});
ipcMain.handle('start-dify', async () => {
    return await serviceManager.startDify();
});
// Auto-start services on app ready
async function initializeServices() {
    console.log('[Main] Initializing services...');
    // Check if auto-start is enabled (default: true for production)
    const autoStart = store.get('services.autoStart') !== false;
    if (autoStart) {
        console.log('[Main] Auto-starting Docker services...');
        const config = {
            apiKey: store.get('llm.apiKey'),
            model: store.get('llm.model'),
            baseUrl: store.get('llm.baseUrl'),
            provider: store.get('llm.provider'),
            language: store.get('app.llm_language') || 'en',
        };
        // Start in background, don't block window creation
        serviceManager.startAllServices(config).then(results => {
            console.log('[Main] Service startup results:', results);
            // Notify renderer about service status
            if (win) {
                win.webContents.send('services-started', results);
            }
        }).catch(err => {
            console.error('[Main] Failed to start services:', err);
        });
    }
    else {
        console.log('[Main] Auto-start disabled, skipping service initialization');
    }
}
// Clean up services on app quit
app.on('before-quit', async () => {
    // Optionally stop services on quit (configurable)
    const stopOnQuit = store.get('services.stopOnQuit') === true;
    if (stopOnQuit) {
        console.log('[Main] Stopping services before quit...');
        await serviceManager.stopAllServices();
    }
});
// ============================================================
// File System IPC Handlers for RAG Indexing
// ============================================================
import * as fs from 'fs';
import { dialog } from 'electron';
// Security: Path validation helper
function isPathSafe(filePath, allowedBase) {
    const resolved = path.resolve(filePath);
    // Ensure path is within allowedBase and doesn't contain traversal
    return resolved.startsWith(allowedBase) && !filePath.includes('..');
}
// Get the project root for path validation
function getProjectRoot() {
    // In production, use the app's path; in dev, use cwd
    return app.isPackaged ? path.dirname(app.getPath('exe')) : process.cwd();
}
// Read a single file (with path validation)
ipcMain.handle('read-file', async (_event, filePath) => {
    const projectRoot = getProjectRoot();
    if (!isPathSafe(filePath, projectRoot)) {
        console.warn(`[Main] Blocked read-file access to: ${filePath}`);
        return { success: false, error: 'Access denied: path outside project root' };
    }
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        return { success: true, content };
    }
    catch (err) {
        console.error('[Main] Failed to read file:', filePath, err);
        return { success: false, error: String(err) };
    }
});
// Write content to a file (with path validation)
ipcMain.handle('write-file', async (_event, filePath, content) => {
    const projectRoot = getProjectRoot();
    if (!isPathSafe(filePath, projectRoot)) {
        console.warn(`[Main] Blocked write-file access to: ${filePath}`);
        return { success: false, error: 'Access denied: path outside project root' };
    }
    try {
        const dir = path.dirname(filePath);
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(filePath, content, 'utf-8');
        return { success: true };
    }
    catch (err) {
        console.error('[Main] Failed to write file:', filePath, err);
        return { success: false, error: String(err) };
    }
});
// List directory contents (with path validation)
ipcMain.handle('list-directory', async (_event, dirPath) => {
    const projectRoot = getProjectRoot();
    if (!isPathSafe(dirPath, projectRoot)) {
        console.warn(`[Main] Blocked list-directory access to: ${dirPath}`);
        return { success: false, error: 'Access denied: path outside project root' };
    }
    try {
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });
        return {
            success: true,
            files: entries.map(e => ({
                name: e.name,
                isDirectory: e.isDirectory(),
            })),
        };
    }
    catch (err) {
        console.error('[Main] Failed to list directory:', dirPath, err);
        return { success: false, error: String(err) };
    }
});
// Execute shell command (with security restrictions)
ipcMain.handle('execute-command', async (_event, command, cwd) => {
    // Security: Block dangerous commands
    const blockedPatterns = [
        /rm\s+-rf\s+[/~]/i,
        /rm\s+--no-preserve-root/i,
        /mkfs/i,
        /dd\s+if=/i,
        /:(){ :|:& };:/,
        />\s*\/dev\/sd/i,
        /chmod\s+-R\s+777\s+\//i,
    ];
    for (const pattern of blockedPatterns) {
        if (pattern.test(command)) {
            console.warn(`[Main] Blocked dangerous command: ${command}`);
            return { success: false, error: 'Command blocked for security reasons' };
        }
    }
    const projectRoot = getProjectRoot();
    const workDir = cwd || projectRoot;
    if (!isPathSafe(workDir, projectRoot)) {
        return { success: false, error: 'Working directory outside project root' };
    }
    return new Promise((resolve) => {
        exec(command, { cwd: workDir, timeout: 30000, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
            if (error) {
                resolve({ success: false, error: error.message, stdout, stderr });
            }
            else {
                resolve({ success: true, stdout, stderr });
            }
        });
    });
});
// List files recursively in a directory (with path validation)
ipcMain.handle('list-files-recursive', async (_event, dirPath) => {
    const projectRoot = getProjectRoot();
    if (!isPathSafe(dirPath, projectRoot)) {
        console.warn(`[Main] Blocked list-files-recursive access to: ${dirPath}`);
        return [];
    }
    const supportedExtensions = ['.md', '.txt', '.ts', '.tsx', '.js', '.jsx', '.py', '.json', '.yaml', '.yml'];
    const excludePatterns = ['node_modules', '.git', 'dist', 'build', '.next'];
    const files = [];
    function walkDir(dir) {
        // Re-validate each subdirectory to prevent symlink attacks
        if (!isPathSafe(dir, projectRoot))
            return;
        try {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                // Skip excluded patterns
                if (excludePatterns.some(p => fullPath.includes(p)))
                    continue;
                if (entry.isDirectory()) {
                    walkDir(fullPath);
                }
                else if (entry.isFile()) {
                    const ext = path.extname(entry.name).toLowerCase();
                    if (supportedExtensions.includes(ext)) {
                        files.push(fullPath);
                    }
                }
            }
        }
        catch (err) {
            console.error('[Main] Failed to walk directory:', dir, err);
        }
    }
    walkDir(dirPath);
    return files;
});
// Open directory dialog
ipcMain.handle('dialog-open-directory', async () => {
    const result = await dialog.showOpenDialog({
        properties: ['openDirectory']
    });
    return result.filePaths;
});
// Import setup module
import { needsSetup, runSetupWithUI } from './setup';
app.whenReady().then(async () => {
    // Check if first-run setup is needed
    if (needsSetup()) {
        console.log('[Main] First-run setup required...');
        const success = await runSetupWithUI();
        if (!success) {
            console.error('[Main] Setup failed, exiting...');
            app.quit();
            return;
        }
        console.log('[Main] Setup completed successfully');
    }
    createWindow();
    // Initialize services after window is created
    await initializeServices();
});

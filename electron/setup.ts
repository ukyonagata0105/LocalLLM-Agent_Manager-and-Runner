/**
 * First-run setup module
 * Handles dependency installation and initial configuration
 */

import { app, dialog, BrowserWindow } from 'electron';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

export interface SetupProgress {
    step: string;
    progress: number;
    message: string;
}

export type ProgressCallback = (progress: SetupProgress) => void;

/**
 * Get the application root directory
 */
function getAppRoot(): string {
    return app.isPackaged
        ? path.dirname(app.getPath('exe'))
        : process.cwd();
}

/**
 * Check if node_modules exists and has required packages
 */
export function needsSetup(): boolean {
    const appRoot = getAppRoot();
    const nodeModulesPath = path.join(appRoot, 'node_modules');
    
    // Check if node_modules exists
    if (!fs.existsSync(nodeModulesPath)) {
        console.log('[Setup] node_modules not found');
        return true;
    }
    
    // Check for critical packages
    const criticalPackages = ['react', 'react-dom', 'zustand', 'express'];
    for (const pkg of criticalPackages) {
        const pkgPath = path.join(nodeModulesPath, pkg);
        if (!fs.existsSync(pkgPath)) {
            console.log(`[Setup] Missing critical package: ${pkg}`);
            return true;
        }
    }
    
    // Check setup marker file
    const setupMarker = path.join(appRoot, '.setup-complete');
    if (!fs.existsSync(setupMarker)) {
        console.log('[Setup] Setup marker not found');
        return true;
    }
    
    return false;
}

/**
 * Create a setup window to show progress
 */
export function createSetupWindow(): BrowserWindow {
    const win = new BrowserWindow({
        width: 500,
        height: 300,
        frame: false,
        resizable: false,
        center: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    });
    
    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Setting up LocalLLM Agent Manager</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            color: white;
            height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 40px;
        }
        h1 { font-size: 24px; margin-bottom: 10px; }
        .subtitle { color: #888; margin-bottom: 30px; }
        .progress-container {
            width: 100%;
            height: 8px;
            background: #333;
            border-radius: 4px;
            overflow: hidden;
            margin-bottom: 20px;
        }
        .progress-bar {
            height: 100%;
            background: linear-gradient(90deg, #4facfe 0%, #00f2fe 100%);
            width: 0%;
            transition: width 0.3s ease;
        }
        .status { color: #aaa; font-size: 14px; text-align: center; }
        .spinner {
            width: 40px;
            height: 40px;
            border: 3px solid #333;
            border-top-color: #4facfe;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: 20px;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
    </style>
</head>
<body>
    <div class="spinner"></div>
    <h1>Setting up LocalLLM Agent Manager</h1>
    <p class="subtitle">First-time setup in progress...</p>
    <div class="progress-container">
        <div class="progress-bar" id="progress"></div>
    </div>
    <p class="status" id="status">Initializing...</p>
    <script>
        const { ipcRenderer } = require('electron');
        ipcRenderer.on('setup-progress', (event, data) => {
            document.getElementById('progress').style.width = data.progress + '%';
            document.getElementById('status').textContent = data.message;
        });
    </script>
</body>
</html>`;
    
    win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    return win;
}

/**
 * Run npm install with progress reporting
 */
export async function runSetup(onProgress?: ProgressCallback): Promise<boolean> {
    const appRoot = getAppRoot();
    
    try {
        // Step 1: Check npm availability
        onProgress?.({ step: 'check', progress: 10, message: 'Checking npm availability...' });
        
        try {
            await execAsync('npm --version');
        } catch {
            dialog.showErrorBox(
                'Setup Error',
                'npm is not installed. Please install Node.js from https://nodejs.org'
            );
            return false;
        }
        
        // Step 2: Install dependencies
        onProgress?.({ step: 'install', progress: 20, message: 'Installing dependencies (this may take a few minutes)...' });
        
        const npmInstall = spawn('npm', ['install', '--omit=dev'], {
            cwd: appRoot,
            shell: true,
            env: { ...process.env, NODE_ENV: 'production' },
        });
        
        let installOutput = '';
        
        npmInstall.stdout?.on('data', (data) => {
            installOutput += data.toString();
            // Parse progress from npm output if possible
            const lines = installOutput.split('\n');
            const lastLine = lines[lines.length - 2] || '';
            onProgress?.({ step: 'install', progress: 50, message: lastLine.slice(0, 60) || 'Installing packages...' });
        });
        
        npmInstall.stderr?.on('data', (data) => {
            console.log('[Setup] npm stderr:', data.toString());
        });
        
        await new Promise<void>((resolve, reject) => {
            npmInstall.on('close', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`npm install failed with code ${code}`));
                }
            });
            npmInstall.on('error', reject);
        });
        
        // Step 3: Build if needed
        onProgress?.({ step: 'build', progress: 80, message: 'Finalizing setup...' });
        
        // Create setup marker
        const setupMarker = path.join(appRoot, '.setup-complete');
        fs.writeFileSync(setupMarker, new Date().toISOString());
        
        onProgress?.({ step: 'done', progress: 100, message: 'Setup complete!' });
        
        return true;
    } catch (error) {
        console.error('[Setup] Error:', error);
        dialog.showErrorBox(
            'Setup Error',
            `Failed to install dependencies: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
        return false;
    }
}

/**
 * Run the complete setup flow with UI
 */
export async function runSetupWithUI(): Promise<boolean> {
    const setupWindow = createSetupWindow();
    
    const success = await runSetup((progress) => {
        setupWindow.webContents.send('setup-progress', progress);
    });
    
    // Wait a moment to show completion
    if (success) {
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    setupWindow.close();
    return success;
}

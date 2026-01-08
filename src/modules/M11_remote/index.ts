/**
 * Remote Access Manager
 * Handles Cloudflare Tunnel for secure remote access
 */

import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';

export interface RemoteAccessConfig {
    enabled: boolean;
    provider: 'cloudflare' | 'tailscale' | 'ngrok';
    authRequired: boolean;
    allowedUsers?: string[];
    targetPort: number;
}

export interface TunnelStatus {
    connected: boolean;
    url?: string;
    error?: string;
    startedAt?: Date;
}

export class RemoteAccessManager extends EventEmitter {
    private config: RemoteAccessConfig;
    private status: TunnelStatus = { connected: false };
    private tunnelProcess: ChildProcess | null = null;

    constructor(config?: Partial<RemoteAccessConfig>) {
        super();
        this.config = {
            enabled: false,
            provider: 'cloudflare',
            authRequired: true,
            targetPort: 5173,
            ...config,
        };
    }

    /**
     * Start Cloudflare Tunnel using npx cloudflared
     */
    async startTunnel(): Promise<TunnelStatus> {
        if (this.tunnelProcess) {
            return { connected: false, error: 'Tunnel already running' };
        }

        if (!this.config.enabled) {
            return { connected: false, error: 'Remote access not enabled' };
        }

        console.log(`[Remote] Starting ${this.config.provider} tunnel on port ${this.config.targetPort}...`);

        return new Promise((resolve) => {
            const targetUrl = `http://localhost:${this.config.targetPort}`;

            // Use npx to run cloudflared without global install
            this.tunnelProcess = spawn('npx', ['cloudflared', 'tunnel', '--url', targetUrl], {
                stdio: ['ignore', 'pipe', 'pipe'],
            });

            let urlFound = false;
            const timeout = setTimeout(() => {
                if (!urlFound) {
                    this.status = { connected: false, error: 'Tunnel timeout - no URL received' };
                    resolve(this.status);
                }
            }, 30000);

            const parseUrl = (data: Buffer) => {
                const str = data.toString();
                console.log('[Tunnel]', str);

                // Parse the tunnel URL from cloudflared output
                const match = str.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
                if (match && !urlFound) {
                    urlFound = true;
                    clearTimeout(timeout);

                    this.status = {
                        connected: true,
                        url: match[0],
                        startedAt: new Date(),
                    };

                    this.emit('connected', this.status);
                    console.log(`[Remote] Tunnel connected: ${this.status.url}`);
                    resolve(this.status);
                }
            };

            this.tunnelProcess.stdout?.on('data', parseUrl);
            this.tunnelProcess.stderr?.on('data', parseUrl);

            this.tunnelProcess.on('error', (error) => {
                clearTimeout(timeout);
                this.status = { connected: false, error: error.message };
                this.tunnelProcess = null;
                this.emit('error', error);
                resolve(this.status);
            });

            this.tunnelProcess.on('exit', (code) => {
                console.log(`[Remote] Tunnel process exited with code ${code}`);
                this.status = { connected: false };
                this.tunnelProcess = null;
                this.emit('disconnected');
            });
        });
    }

    /**
     * Stop the tunnel
     */
    async stopTunnel(): Promise<void> {
        if (this.tunnelProcess) {
            console.log('[Remote] Stopping tunnel...');
            this.tunnelProcess.kill('SIGTERM');
            this.tunnelProcess = null;
        }
        this.status = { connected: false };
        this.emit('disconnected');
    }

    /**
     * Get current status
     */
    getStatus(): TunnelStatus {
        return { ...this.status };
    }

    /**
     * Update configuration
     */
    setConfig(config: Partial<RemoteAccessConfig>): void {
        this.config = { ...this.config, ...config };
    }

    /**
     * Check if tunnel is running
     */
    isRunning(): boolean {
        return this.tunnelProcess !== null && this.status.connected;
    }
}

// Singleton instance
let instance: RemoteAccessManager | null = null;

export function getRemoteAccessManager(config?: Partial<RemoteAccessConfig>): RemoteAccessManager {
    if (!instance) {
        instance = new RemoteAccessManager(config);
    } else if (config) {
        instance.setConfig(config);
    }
    return instance;
}

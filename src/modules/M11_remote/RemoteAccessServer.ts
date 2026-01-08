/**
 * Remote Access Server
 * Provides secure remote access to LocalLLM Agent Manager
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { createServer } from 'http';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

export interface RemoteAccessConfig {
    port: number;
    password: string;
    totpEnabled: boolean;
    totpSecret?: string;
    allowedOrigins: string[];
    sessionMaxAge: number; // in ms
}

interface Session {
    id: string;
    createdAt: number;
    lastActivity: number;
    deviceInfo?: string;
}

export class RemoteAccessServer {
    private app = express();
    private server: ReturnType<typeof createServer> | null = null;
    private sessions = new Map<string, Session>();
    private config: RemoteAccessConfig;

    constructor(config: Partial<RemoteAccessConfig> = {}) {
        this.config = {
            port: config.port || 3001,
            password: config.password || 'localllm-secure-2024',
            totpEnabled: config.totpEnabled ?? false,
            totpSecret: config.totpSecret,
            allowedOrigins: config.allowedOrigins || ['*'],
            sessionMaxAge: config.sessionMaxAge || 24 * 60 * 60 * 1000, // 24 hours
        };

        this.setupMiddleware();
        this.setupRoutes();
    }

    private setupMiddleware(): void {
        this.app.use(cors({
            origin: this.config.allowedOrigins,
            credentials: true,
        }));
        this.app.use(express.json());

        // Session validation middleware
        this.app.use((req: Request, res: Response, next: NextFunction) => {
            const publicPaths = ['/api/auth/login', '/api/auth/setup-totp', '/api/health'];
            if (publicPaths.includes(req.path)) {
                return next();
            }

            const sessionId = req.headers['x-session-id'] as string;
            if (!sessionId || !this.validateSession(sessionId)) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            // Update last activity
            const session = this.sessions.get(sessionId);
            if (session) {
                session.lastActivity = Date.now();
            }

            next();
        });
    }

    private setupRoutes(): void {
        // Health check
        this.app.get('/api/health', (_req: Request, res: Response) => {
            res.json({ status: 'ok', timestamp: Date.now() });
        });

        // Login
        this.app.post('/api/auth/login', (req: Request, res: Response) => {
            const { password, totpCode } = req.body;

            if (password !== this.config.password) {
                return res.status(401).json({ error: 'Invalid password' });
            }

            if (this.config.totpEnabled && this.config.totpSecret) {
                const verified = speakeasy.totp.verify({
                    secret: this.config.totpSecret,
                    encoding: 'base32',
                    token: totpCode,
                });

                if (!verified) {
                    return res.status(401).json({ error: 'Invalid TOTP code' });
                }
            }

            const sessionId = crypto.randomUUID();
            this.sessions.set(sessionId, {
                id: sessionId,
                createdAt: Date.now(),
                lastActivity: Date.now(),
                deviceInfo: req.headers['user-agent'],
            });

            res.json({
                sessionId,
                expiresAt: Date.now() + this.config.sessionMaxAge,
                totpRequired: this.config.totpEnabled,
            });
        });

        // Setup TOTP
        this.app.post('/api/auth/setup-totp', (req: Request, res: Response) => {
            const { password } = req.body;

            if (password !== this.config.password) {
                return res.status(401).json({ error: 'Invalid password' });
            }

            const secret = speakeasy.generateSecret({
                name: 'LocalLLM Agent Manager',
                issuer: 'LocalLLM',
            });

            this.config.totpSecret = secret.base32;

            QRCode.toDataURL(secret.otpauth_url || '', (err, dataUrl) => {
                if (err) {
                    return res.status(500).json({ error: 'Failed to generate QR code' });
                }

                res.json({
                    secret: secret.base32,
                    qrCode: dataUrl,
                    message: 'Scan the QR code with your authenticator app',
                });
            });
        });

        // Enable TOTP
        this.app.post('/api/auth/enable-totp', (req: Request, res: Response) => {
            const { totpCode } = req.body;

            if (!this.config.totpSecret) {
                return res.status(400).json({ error: 'TOTP not set up' });
            }

            const verified = speakeasy.totp.verify({
                secret: this.config.totpSecret,
                encoding: 'base32',
                token: totpCode,
            });

            if (!verified) {
                return res.status(401).json({ error: 'Invalid TOTP code' });
            }

            this.config.totpEnabled = true;
            res.json({ success: true, message: 'TOTP enabled' });
        });

        // Logout
        this.app.post('/api/auth/logout', (req: Request, res: Response) => {
            const sessionId = req.headers['x-session-id'] as string;
            this.sessions.delete(sessionId);
            res.json({ success: true });
        });

        // Get sessions
        this.app.get('/api/auth/sessions', (_req: Request, res: Response) => {
            const sessions = Array.from(this.sessions.values()).map(s => ({
                id: s.id.substring(0, 8) + '...',
                createdAt: s.createdAt,
                lastActivity: s.lastActivity,
                deviceInfo: s.deviceInfo?.substring(0, 50),
            }));
            res.json({ sessions });
        });

        // Proxy to main app API
        this.app.all('/api/*', async (req: Request, res: Response) => {
            // Forward to Electron IPC or local service
            res.json({
                error: 'API proxy not implemented',
                path: req.path,
            });
        });
    }

    private validateSession(sessionId: string): boolean {
        const session = this.sessions.get(sessionId);
        if (!session) return false;

        const now = Date.now();
        if (now - session.createdAt > this.config.sessionMaxAge) {
            this.sessions.delete(sessionId);
            return false;
        }

        return true;
    }

    async start(): Promise<void> {
        return new Promise((resolve) => {
            this.server = createServer(this.app);
            this.server.listen(this.config.port, () => {
                console.log(`[RemoteAccess] Server running on port ${this.config.port}`);
                resolve();
            });
        });
    }

    stop(): void {
        if (this.server) {
            this.server.close();
            this.server = null;
        }
    }

    getPort(): number {
        return this.config.port;
    }

    enableTotp(secret: string): void {
        this.config.totpSecret = secret;
        this.config.totpEnabled = true;
    }

    setPassword(password: string): void {
        this.config.password = password;
    }
}

// Singleton
let serverInstance: RemoteAccessServer | null = null;

export function getRemoteAccessServer(config?: Partial<RemoteAccessConfig>): RemoteAccessServer {
    if (!serverInstance) {
        serverInstance = new RemoteAccessServer(config);
    }
    return serverInstance;
}

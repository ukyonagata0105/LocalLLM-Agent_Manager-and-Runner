import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { getAuthService } from '../src/modules/M11_remote/AuthService';
import { getServiceManager } from './ServiceManager';

const PORT = 3001;

export class RemoteServer {
    private app: express.Express;
    private server: any;

    constructor() {
        this.app = express();
        this.setupMiddleware();
        this.setupRoutes();
    }

    private setupMiddleware() {
        // CORS: Restrict origins in production (same-origin only)
        this.app.use(cors({
            origin: process.env.NODE_ENV === 'development'
                ? 'http://localhost:5173'
                : false, // Disallow cross-origin in production
            credentials: true
        }));

        this.app.use(express.json());
        this.app.use(cookieParser());

        // Logging
        this.app.use((req, res, next) => {
            console.log(`[Remote API] ${req.method} ${req.url}`);
            next();
        });
    }

    private setupRoutes() {
        const auth = getAuthService();
        const serviceManager = getServiceManager();

        // Rate limiter for auth routes
        const authLimiter = rateLimit({
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 10, // max 10 attempts per window
            message: { error: 'Too many login attempts, please try again later.' },
            standardHeaders: true,
            legacyHeaders: false,
        });

        // 1. Public Routes
        this.app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

        this.app.post('/api/auth/login', authLimiter, async (req, res) => {
            const { password, deviceInfo } = req.body;

            // Check if auth is even configured
            if (!auth.isConfigured()) {
                return res.status(400).json({ error: 'Remote access not configured (no password set)' });
            }

            const result = await auth.loginWithPassword(password, deviceInfo);

            if (result.success && result.sessionId) {
                res.cookie('session_id', result.sessionId, {
                    httpOnly: true,
                    maxAge: 24 * 60 * 60 * 1000, // 24h
                    sameSite: 'lax'
                });
            }

            res.json(result);
        });

        this.app.post('/api/auth/verify-totp', authLimiter, async (req, res) => {
            // Expects { sessionId (temp), token }
            // In our implementation, we returned a temp session ID for pending auth?
            // Actually AuthService returns { requiresTOTP: true, sessionId: pendingId }

            const { pendingId, token, deviceInfo } = req.body;
            const result = await auth.completeTOTPLogin(pendingId, token, deviceInfo);

            if (result.success && result.sessionId) {
                res.cookie('session_id', result.sessionId, {
                    httpOnly: true,
                    maxAge: 24 * 60 * 60 * 1000,
                    sameSite: 'lax'
                });
            }

            res.json(result);
        });

        this.app.post('/api/auth/logout', (req, res) => {
            const sessionId = req.cookies['session_id'];
            if (sessionId) {
                auth.logout(sessionId);
            }
            res.clearCookie('session_id');
            res.json({ success: true });
        });

        // 2. Protected Middleware
        const requireAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
            const sessionId = req.cookies['session_id'];
            if (!sessionId || !auth.validateSession(sessionId)) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            next();
        };

        // 3. Protected Routes
        this.app.get('/api/status', requireAuth, async (req, res) => {
            const services = await serviceManager.getServicesStatus();
            res.json(services);
        });

        this.app.post('/api/openhands/start', requireAuth, async (req, res) => {
            // Limited control for now
            res.json({ success: false, error: 'Remote control not fully implemented yet' });
        });

        // 4. Serve Static Frontend (Dashboard)
        // In production, serve the 'dist' folder
        const distPath = path.join(__dirname, '../dist');
        const publicPath = path.join(__dirname, '../public'); // Fallback/Assets

        this.app.use(express.static(distPath));
        this.app.use(express.static(publicPath));

        // SPA Fallback
        this.app.get('*', (req, res) => {
            if (req.path.startsWith('/api')) {
                return res.status(404).json({ error: 'Not found' });
            }

            // If dist/index.html exists, serve it.
            // During dev, we might not have dist.
            res.sendFile(path.join(distPath, 'index.html'), (err) => {
                if (err) {
                    res.send('LocalLLM Agent Manager - Remote Interface (Build required)');
                }
            });
        });
    }

    start() {
        this.server = this.app.listen(PORT, '0.0.0.0', () => {
            console.log(`[Remote Server] Listening on port ${PORT}`);
        });
    }

    stop() {
        if (this.server) {
            this.server.close();
            console.log('[Remote Server] Stopped');
        }
    }
}

let instance: RemoteServer | null = null;

export function getRemoteServer(): RemoteServer {
    if (!instance) {
        instance = new RemoteServer();
    }
    return instance;
}

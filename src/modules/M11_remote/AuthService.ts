/**
 * Authentication Service
 * Handles TOTP-based 2FA and session management
 */

// Note: These are Node.js modules, only used in Electron main process
// Browser-side uses IPC to communicate with this service

export interface AuthConfig {
    passwordHash: string;  // bcrypt hash of password
    totpSecret?: string;   // Base32 encoded TOTP secret
    totpEnabled: boolean;
    sessionDurationMs: number;  // 24 hours default
}

export interface Session {
    id: string;
    createdAt: Date;
    expiresAt: Date;
    deviceInfo?: string;
    ipAddress?: string;
}

export interface AuthResult {
    success: boolean;
    sessionId?: string;
    error?: string;
    requiresTOTP?: boolean;
}

const DEFAULT_SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export class AuthService {
    private config: AuthConfig;
    private sessions: Map<string, Session> = new Map();
    private pendingAuth: Map<string, { passwordVerified: boolean; expiresAt: Date }> = new Map();

    constructor(config?: Partial<AuthConfig>) {
        this.config = {
            passwordHash: '',
            totpEnabled: false,
            sessionDurationMs: DEFAULT_SESSION_DURATION,
            ...config,
        };
    }

    /**
     * Generate a new TOTP secret and QR code URL
     */
    async generateTOTPSecret(accountName: string = 'LocalLLM Manager'): Promise<{
        secret: string;
        qrCodeUrl: string;
        otpauthUrl: string;
    }> {
        // Dynamic import for Node.js modules
        const speakeasy = await import('speakeasy');
        const QRCode = await import('qrcode');

        const secret = speakeasy.generateSecret({
            name: accountName,
            issuer: 'LocalLLM',
            length: 20,
        });

        const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url || '');

        return {
            secret: secret.base32,
            qrCodeUrl,
            otpauthUrl: secret.otpauth_url || '',
        };
    }

    /**
     * Enable TOTP with the given secret
     */
    enableTOTP(secret: string): void {
        this.config.totpSecret = secret;
        this.config.totpEnabled = true;
    }

    /**
     * Disable TOTP
     */
    disableTOTP(): void {
        this.config.totpSecret = undefined;
        this.config.totpEnabled = false;
    }

    /**
     * Set password (stores bcrypt hash)
     */
    async setPassword(password: string): Promise<void> {
        const bcrypt = await import('bcryptjs');
        this.config.passwordHash = await bcrypt.hash(password, 10);
    }

    /**
     * Verify password
     */
    async verifyPassword(password: string): Promise<boolean> {
        if (!this.config.passwordHash) return false;

        const bcrypt = await import('bcryptjs');
        return bcrypt.compare(password, this.config.passwordHash);
    }

    /**
     * Verify TOTP token
     */
    async verifyTOTP(token: string): Promise<boolean> {
        if (!this.config.totpSecret) return false;

        const speakeasy = await import('speakeasy');
        return speakeasy.totp.verify({
            secret: this.config.totpSecret,
            encoding: 'base32',
            token,
            window: 1, // Allow 1 step tolerance
        });
    }

    /**
     * Login with password (first step)
     */
    async loginWithPassword(password: string, deviceInfo?: string): Promise<AuthResult> {
        const passwordValid = await this.verifyPassword(password);

        if (!passwordValid) {
            return { success: false, error: 'Invalid password' };
        }

        if (this.config.totpEnabled) {
            // Store pending auth state (password verified, waiting for TOTP)
            const pendingId = this.generateId();
            this.pendingAuth.set(pendingId, {
                passwordVerified: true,
                expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 min to enter TOTP
            });

            return { success: false, requiresTOTP: true, sessionId: pendingId };
        }

        // No TOTP required, create session directly
        return this.createSession(deviceInfo);
    }

    /**
     * Complete login with TOTP (second step)
     */
    async completeTOTPLogin(pendingId: string, token: string, deviceInfo?: string): Promise<AuthResult> {
        const pending = this.pendingAuth.get(pendingId);

        if (!pending || pending.expiresAt < new Date()) {
            this.pendingAuth.delete(pendingId);
            return { success: false, error: 'TOTP verification expired' };
        }

        if (!pending.passwordVerified) {
            return { success: false, error: 'Password not verified' };
        }

        const totpValid = await this.verifyTOTP(token);
        if (!totpValid) {
            return { success: false, error: 'Invalid TOTP code' };
        }

        this.pendingAuth.delete(pendingId);
        return this.createSession(deviceInfo);
    }

    /**
     * Create a new session
     */
    private createSession(deviceInfo?: string): AuthResult {
        const sessionId = this.generateId();
        const now = new Date();

        const session: Session = {
            id: sessionId,
            createdAt: now,
            expiresAt: new Date(now.getTime() + this.config.sessionDurationMs),
            deviceInfo,
        };

        this.sessions.set(sessionId, session);
        console.log(`[Auth] Session created: ${sessionId.substring(0, 8)}...`);

        return { success: true, sessionId };
    }

    /**
     * Validate a session
     */
    validateSession(sessionId: string): boolean {
        const session = this.sessions.get(sessionId);

        if (!session) return false;

        if (session.expiresAt < new Date()) {
            this.sessions.delete(sessionId);
            return false;
        }

        return true;
    }

    /**
     * Logout / invalidate session
     */
    logout(sessionId: string): void {
        this.sessions.delete(sessionId);
    }

    /**
     * Get all active sessions
     */
    getActiveSessions(): Session[] {
        const now = new Date();
        const active: Session[] = [];

        for (const [id, session] of this.sessions) {
            if (session.expiresAt > now) {
                active.push(session);
            } else {
                this.sessions.delete(id);
            }
        }

        return active;
    }

    /**
     * Check if auth is configured
     */
    isConfigured(): boolean {
        return !!this.config.passwordHash;
    }

    /**
     * Check if TOTP is enabled
     */
    isTOTPEnabled(): boolean {
        return this.config.totpEnabled;
    }

    /**
     * Generate random ID
     */
    private generateId(): string {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < 32; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    /**
     * Export config for persistence
     */
    exportConfig(): AuthConfig {
        return { ...this.config };
    }

    /**
     * Import config from persistence
     */
    importConfig(config: AuthConfig): void {
        this.config = { ...config };
    }
}

// Singleton
let authInstance: AuthService | null = null;

export function getAuthService(): AuthService {
    if (!authInstance) {
        authInstance = new AuthService();
    }
    return authInstance;
}

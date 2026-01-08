/**
 * Authentication Service
 * Handles TOTP-based 2FA and session management
 */
const DEFAULT_SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours
export class AuthService {
    config;
    sessions = new Map();
    pendingAuth = new Map();
    constructor(config) {
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
    async generateTOTPSecret(accountName = 'LocalLLM Manager') {
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
    enableTOTP(secret) {
        this.config.totpSecret = secret;
        this.config.totpEnabled = true;
    }
    /**
     * Disable TOTP
     */
    disableTOTP() {
        this.config.totpSecret = undefined;
        this.config.totpEnabled = false;
    }
    /**
     * Set password (stores bcrypt hash)
     */
    async setPassword(password) {
        const bcrypt = await import('bcryptjs');
        this.config.passwordHash = await bcrypt.hash(password, 10);
    }
    /**
     * Verify password
     */
    async verifyPassword(password) {
        if (!this.config.passwordHash)
            return false;
        const bcrypt = await import('bcryptjs');
        return bcrypt.compare(password, this.config.passwordHash);
    }
    /**
     * Verify TOTP token
     */
    async verifyTOTP(token) {
        if (!this.config.totpSecret)
            return false;
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
    async loginWithPassword(password, deviceInfo) {
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
    async completeTOTPLogin(pendingId, token, deviceInfo) {
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
    createSession(deviceInfo) {
        const sessionId = this.generateId();
        const now = new Date();
        const session = {
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
    validateSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session)
            return false;
        if (session.expiresAt < new Date()) {
            this.sessions.delete(sessionId);
            return false;
        }
        return true;
    }
    /**
     * Logout / invalidate session
     */
    logout(sessionId) {
        this.sessions.delete(sessionId);
    }
    /**
     * Get all active sessions
     */
    getActiveSessions() {
        const now = new Date();
        const active = [];
        for (const [id, session] of this.sessions) {
            if (session.expiresAt > now) {
                active.push(session);
            }
            else {
                this.sessions.delete(id);
            }
        }
        return active;
    }
    /**
     * Check if auth is configured
     */
    isConfigured() {
        return !!this.config.passwordHash;
    }
    /**
     * Check if TOTP is enabled
     */
    isTOTPEnabled() {
        return this.config.totpEnabled;
    }
    /**
     * Generate random ID
     */
    generateId() {
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
    exportConfig() {
        return { ...this.config };
    }
    /**
     * Import config from persistence
     */
    importConfig(config) {
        this.config = { ...config };
    }
}
// Singleton
let authInstance = null;
export function getAuthService() {
    if (!authInstance) {
        authInstance = new AuthService();
    }
    return authInstance;
}

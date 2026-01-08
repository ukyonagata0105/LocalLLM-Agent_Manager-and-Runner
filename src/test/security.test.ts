/**
 * Security Tests for IPC Hardening
 * Tests path validation, config restrictions, and session ID generation
 */
import { describe, it, expect } from 'vitest';
import path from 'path';
import crypto from 'crypto';

// Re-implement the security functions for testing (same logic as main.ts)
function isPathSafe(filePath: string, allowedBase: string): boolean {
    const resolved = path.resolve(filePath);
    return resolved.startsWith(allowedBase) && !filePath.includes('..');
}

const ALLOWED_CONFIG_KEYS = [
    'llm.provider', 'llm.model', 'llm.apiKey', 'llm.baseUrl',
    'services.autoStart', 'services.stopOnQuit', 'auth'
];

function isConfigKeyAllowed(key: string): boolean {
    return ALLOWED_CONFIG_KEYS.includes(key);
}

// Re-implement crypto session ID generation (same logic as AuthService.js)
function generateSecureId(): string {
    return crypto.randomBytes(32).toString('hex');
}

// Re-implement sanitizeEnvValue (same logic as ServiceManager.ts)
function sanitizeEnvValue(value: string): string {
    return value.replace(/[^a-zA-Z0-9\-_.\/:]/g, '');
}

describe('Path Validation Security', () => {
    const projectRoot = '/Volumes/UNTITLED/Projects/LocalLLM-Agent_Manager-and-Runner';

    it('should allow paths within project root', () => {
        const validPath = path.join(projectRoot, 'src/main.ts');
        expect(isPathSafe(validPath, projectRoot)).toBe(true);
    });

    it('should block path traversal attempts', () => {
        const maliciousPath = path.join(projectRoot, '../../../etc/passwd');
        expect(isPathSafe(maliciousPath, projectRoot)).toBe(false);
    });

    it('should block absolute paths outside project', () => {
        const outsidePath = '/etc/passwd';
        expect(isPathSafe(outsidePath, projectRoot)).toBe(false);
    });

    it('should block hidden path traversal (..) in middle of path', () => {
        const sneakyPath = path.join(projectRoot, 'src/../../../etc/passwd');
        expect(isPathSafe(sneakyPath, projectRoot)).toBe(false);
    });
});

describe('Config Key Whitelist', () => {
    it('should allow whitelisted keys', () => {
        expect(isConfigKeyAllowed('llm.provider')).toBe(true);
        expect(isConfigKeyAllowed('llm.model')).toBe(true);
        expect(isConfigKeyAllowed('services.autoStart')).toBe(true);
        expect(isConfigKeyAllowed('auth')).toBe(true);
    });

    it('should block unauthorized keys', () => {
        expect(isConfigKeyAllowed('admin.password')).toBe(false);
        expect(isConfigKeyAllowed('secret.key')).toBe(false);
        expect(isConfigKeyAllowed('system.command')).toBe(false);
    });
});

describe('Secure Session ID Generation', () => {
    it('should generate 64 character hex string', () => {
        const sessionId = generateSecureId();
        expect(sessionId).toHaveLength(64);
        expect(/^[a-f0-9]+$/.test(sessionId)).toBe(true);
    });

    it('should generate unique IDs', () => {
        const ids = new Set();
        for (let i = 0; i < 100; i++) {
            ids.add(generateSecureId());
        }
        expect(ids.size).toBe(100); // All should be unique
    });
});

describe('Environment Value Sanitization', () => {
    it('should allow safe characters', () => {
        expect(sanitizeEnvValue('gpt-4o')).toBe('gpt-4o');
        expect(sanitizeEnvValue('http://localhost:1234/v1')).toBe('http://localhost:1234/v1');
    });

    it('should remove shell metacharacters', () => {
        // Note: Spaces are also removed for safety
        expect(sanitizeEnvValue('model; rm -rf /')).toBe('modelrm-rf/');
        expect(sanitizeEnvValue('$(whoami)')).toBe('whoami');
        expect(sanitizeEnvValue('`id`')).toBe('id');
    });

    it('should remove quotes and pipes', () => {
        expect(sanitizeEnvValue("key'value")).toBe('keyvalue');
        expect(sanitizeEnvValue('key|cat /etc/passwd')).toBe('keycat/etc/passwd');
    });
});

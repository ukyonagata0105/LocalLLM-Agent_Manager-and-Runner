/**
 * M10 Local Environment - Configuration Service
 * Production implementation using better-sqlite3 for persistence.
 */

import Database from 'better-sqlite3';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { AppConfig, ModuleConfig, SystemInfo, MODULE_DEFINITIONS } from './types';

export class ConfigService {
    private db: Database.Database;
    private configPath: string;

    constructor(dataDir?: string) {
        const baseDir = dataDir || path.join(os.homedir(), '.localllm-agent');

        // Ensure directories exist
        if (!fs.existsSync(baseDir)) {
            fs.mkdirSync(baseDir, { recursive: true });
        }

        this.configPath = path.join(baseDir, 'config.db');
        this.db = new Database(this.configPath);
        this.initializeDatabase();
    }

    private initializeDatabase(): void {
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS config (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER DEFAULT (strftime('%s', 'now'))
      );
      
      CREATE TABLE IF NOT EXISTS modules (
        id TEXT PRIMARY KEY,
        enabled INTEGER NOT NULL DEFAULT 0,
        settings TEXT DEFAULT '{}',
        updated_at INTEGER DEFAULT (strftime('%s', 'now'))
      );
    `);

        // Initialize default module configurations
        const insertModule = this.db.prepare(`
      INSERT OR IGNORE INTO modules (id, enabled, settings) VALUES (?, ?, ?)
    `);

        for (const mod of MODULE_DEFINITIONS) {
            insertModule.run(mod.id, mod.defaultEnabled ? 1 : 0, '{}');
        }
    }

    getConfig<T>(key: string, defaultValue: T): T {
        const row = this.db.prepare('SELECT value FROM config WHERE key = ?').get(key) as { value: string } | undefined;
        if (!row) return defaultValue;
        try {
            return JSON.parse(row.value) as T;
        } catch {
            return defaultValue;
        }
    }

    setConfig<T>(key: string, value: T): void {
        this.db.prepare(`
      INSERT INTO config (key, value, updated_at) VALUES (?, ?, strftime('%s', 'now'))
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `).run(key, JSON.stringify(value));
    }

    getModuleConfig(moduleId: string): ModuleConfig | null {
        const row = this.db.prepare('SELECT enabled, settings FROM modules WHERE id = ?').get(moduleId) as { enabled: number; settings: string } | undefined;
        if (!row) return null;
        return {
            enabled: row.enabled === 1,
            settings: JSON.parse(row.settings),
        };
    }

    setModuleEnabled(moduleId: string, enabled: boolean): void {
        this.db.prepare('UPDATE modules SET enabled = ?, updated_at = strftime(\'%s\', \'now\') WHERE id = ?').run(enabled ? 1 : 0, moduleId);
    }

    setModuleSettings(moduleId: string, settings: Record<string, unknown>): void {
        this.db.prepare('UPDATE modules SET settings = ?, updated_at = strftime(\'%s\', \'now\') WHERE id = ?').run(JSON.stringify(settings), moduleId);
    }

    getAllModuleConfigs(): Record<string, ModuleConfig> {
        const rows = this.db.prepare('SELECT id, enabled, settings FROM modules').all() as Array<{ id: string; enabled: number; settings: string }>;
        const result: Record<string, ModuleConfig> = {};
        for (const row of rows) {
            result[row.id] = {
                enabled: row.enabled === 1,
                settings: JSON.parse(row.settings),
            };
        }
        return result;
    }

    getAppConfig(): AppConfig {
        const modules = this.getAllModuleConfigs();
        return {
            mode: this.getConfig('mode', 'desktop'),
            dataDir: this.getConfig('dataDir', path.join(os.homedir(), '.localllm-agent', 'data')),
            logsDir: this.getConfig('logsDir', path.join(os.homedir(), '.localllm-agent', 'logs')),
            server: this.getConfig('server', {
                host: '127.0.0.1',
                port: 3000,
                requireAuth: true,
            }),
            modules,
        };
    }

    getSystemInfo(): SystemInfo {
        return {
            platform: os.platform(),
            arch: os.arch(),
            nodeVersion: process.version,
            electronVersion: process.versions.electron,
            cpuCores: os.cpus().length,
            totalMemory: os.totalmem(),
            freeMemory: os.freemem(),
        };
    }

    close(): void {
        this.db.close();
    }
}

// Singleton instance
let configServiceInstance: ConfigService | null = null;

export function getConfigService(dataDir?: string): ConfigService {
    if (!configServiceInstance) {
        configServiceInstance = new ConfigService(dataDir);
    }
    return configServiceInstance;
}

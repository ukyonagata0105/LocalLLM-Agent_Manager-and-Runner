/**
 * Service Manager - Auto-startup for all Docker services
 * Manages OpenHands, n8n, and Dify containers
 */
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
const execAsync = promisify(exec);
// Language code to locale mapping for different services
const LANGUAGE_LOCALES = {
    'en': { n8n: 'en', timezone: 'America/New_York', langName: 'English' },
    'ja': { n8n: 'ja', timezone: 'Asia/Tokyo', langName: 'Japanese' },
    'es': { n8n: 'es', timezone: 'Europe/Madrid', langName: 'Spanish' },
    'zh': { n8n: 'zh-CN', timezone: 'Asia/Shanghai', langName: 'Chinese' },
    'ko': { n8n: 'ko', timezone: 'Asia/Seoul', langName: 'Korean' },
};
class ServiceManager {
    projectRoot;
    isStarting = false;
    constructor() {
        this.projectRoot = process.cwd();
    }
    /**
     * Escape shell arguments to prevent command injection
     */
    escapeShellArg(arg) {
        // Remove any shell metacharacters and wrap in single quotes
        return "'" + arg.replace(/'/g, "'\\''") + "'";
    }
    /**
     * Validate that a string contains only safe characters for Docker env vars
     */
    sanitizeEnvValue(value) {
        // Remove shell metacharacters, allow only alphanumeric, -, _, ., /, :
        return value.replace(/[^a-zA-Z0-9\-_./:\s]/g, '');
    }
    /**
     * Wait for Docker daemon to be ready
     */
    async waitForDocker(maxWaitMs = 30000) {
        const startTime = Date.now();
        while (Date.now() - startTime < maxWaitMs) {
            try {
                await execAsync('docker info');
                return true;
            }
            catch {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        return false;
    }
    /**
     * Check if a container is running
     */
    async isContainerRunning(name) {
        try {
            const { stdout } = await execAsync(`docker ps --filter "name=${name}" --format "{{.Names}}"`);
            return stdout.trim().includes(name);
        }
        catch {
            return false;
        }
    }
    /**
     * Get status of all services
     */
    async getServicesStatus() {
        const services = [];
        // OpenHands
        const openhandsRunning = await this.isContainerRunning('openhands-app');
        services.push({
            name: 'OpenHands',
            running: openhandsRunning,
            healthy: openhandsRunning,
            port: 3000
        });
        // n8n
        const n8nRunning = await this.isContainerRunning('n8n-app');
        services.push({
            name: 'n8n',
            running: n8nRunning,
            healthy: n8nRunning,
            port: 5678
        });
        // Dify (multiple containers)
        const difyApiRunning = await this.isContainerRunning('docker-api-1');
        const difyWebRunning = await this.isContainerRunning('docker-web-1');
        services.push({
            name: 'Dify',
            running: difyApiRunning && difyWebRunning,
            healthy: difyApiRunning && difyWebRunning,
            port: 80
        });
        return services;
    }
    /**
     * Start OpenHands container
     */
    async startOpenHands(config) {
        try {
            // Clean up any existing container
            try {
                await execAsync('docker rm -f openhands-app');
            }
            catch { /* ignore */ }
            const apiKey = this.sanitizeEnvValue(config?.apiKey || 'not-needed');
            let model = this.sanitizeEnvValue(config?.model || 'gpt-4o');
            let baseUrl = this.sanitizeEnvValue(config?.baseUrl || '');
            // Fix localhost for Docker networking
            if (baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1')) {
                baseUrl = baseUrl.replace('localhost', 'host.docker.internal').replace('127.0.0.1', 'host.docker.internal');
            }
            // LiteLLM requires openai/ prefix for OpenAI-compatible APIs
            // LM Studio models like "qwen/qwen3-coder-30b" need to become "openai/qwen/qwen3-coder-30b"
            if (baseUrl && !model.startsWith('openai/')) {
                model = `openai/${model}`;
            }
            // Language settings
            const langCode = config?.language || 'en';
            const locale = LANGUAGE_LOCALES[langCode] || LANGUAGE_LOCALES['en'];
            // Generate config file (values already sanitized)
            // Note: OpenHands uses 'language' in [core] section for UI language
            const configContent = `
[core]
workspace_base = "/opt/workspace_base"
language = "${langCode}"

[llm]
model = "${model}"
api_key = "${apiKey}"
base_url = "${baseUrl}"
custom_llm_provider = "openai"

[agent]
# System prompt language instruction
default_agent_config = "CodeActAgent"
`;
            const configPath = path.join(this.projectRoot, '.openhands_config.toml');
            fs.writeFileSync(configPath, configContent);
            // Get user ID
            let userId = '1000';
            try {
                const { stdout } = await execAsync('id -u');
                userId = stdout.trim();
            }
            catch { /* use default */ }
            const cmd = `docker run -d -p 3000:3000 \
                --add-host=host.docker.internal:host-gateway \
                -e SANDBOX_RUNTIME_CONTAINER_IMAGE=docker.all-hands.dev/all-hands-ai/runtime:0.9-nikolaik \
                -e SANDBOX_USER_ID=${userId} \
                -e WORKSPACE_MOUNT_PATH=${this.projectRoot} \
                -e OPENAI_API_KEY="${apiKey}" \
                -v "${configPath}":/app/config.toml \
                -v /var/run/docker.sock:/var/run/docker.sock \
                -v ${this.projectRoot}:/opt/workspace_base \
                --name openhands-app \
                ghcr.io/all-hands-ai/openhands:0.9`;
            await execAsync(cmd);
            console.log('[ServiceManager] OpenHands started');
            return { success: true };
        }
        catch (e) {
            console.error('[ServiceManager] Failed to start OpenHands:', e.message);
            return { success: false, error: e.message };
        }
    }
    /**
     * Start n8n container with auto-owner setup
     */
    async startN8n(config) {
        try {
            // Clean up any existing container
            try {
                await execAsync('docker rm -f n8n-app');
            }
            catch { /* ignore */ }
            const apiKey = config?.apiKey || 'not-needed';
            let baseUrl = config?.baseUrl || 'https://api.openai.com/v1';
            if (baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1')) {
                baseUrl = baseUrl.replace('localhost', 'host.docker.internal').replace('127.0.0.1', 'host.docker.internal');
            }
            const apiKeyEnv = apiKey ? `-e N8N_AI_OPENAI_API_KEY="${apiKey}"` : '';
            // Language settings
            const langCode = config?.language || 'en';
            const locale = LANGUAGE_LOCALES[langCode] || LANGUAGE_LOCALES['en'];
            // Auto-owner setup: Skip setup wizard with default credentials
            // n8n will use these for the first user creation
            const cmd = `docker run -d --name n8n-app -p 5678:5678 \
                --add-host=host.docker.internal:host-gateway \
                ${apiKeyEnv} \
                -e N8N_DEFAULT_LOCALE=${locale.n8n} \
                -e GENERIC_TIMEZONE=${locale.timezone} \
                -e TZ=${locale.timezone} \
                -e N8N_BASIC_AUTH_ACTIVE=false \
                -e N8N_SKIP_OWNER_SETUP=true \
                -e N8N_USER_MANAGEMENT_DISABLED=true \
                -v n8n_data:/home/node/.n8n \
                docker.n8n.io/n8nio/n8n`;
            await execAsync(cmd);
            console.log('[ServiceManager] n8n started (owner setup skipped)');
            return { success: true };
        }
        catch (e) {
            console.error('[ServiceManager] Failed to start n8n:', e.message);
            return { success: false, error: e.message };
        }
    }
    /**
     * Start Dify containers with LLM configuration
     */
    async startDify(config) {
        const difyDir = path.join(this.projectRoot, '.dify');
        const difyDockerDir = path.join(difyDir, 'docker');
        try {
            // Clone if missing
            if (!fs.existsSync(difyDir)) {
                console.log('[ServiceManager] Cloning Dify...');
                await execAsync('git clone https://github.com/langgenius/dify.git .dify', { cwd: this.projectRoot });
            }
            if (fs.existsSync(difyDockerDir)) {
                // Setup env
                const envPath = path.join(difyDockerDir, '.env');
                const exampleEnvPath = path.join(difyDockerDir, '.env.example');
                // Read existing or example env
                let envContent = '';
                if (fs.existsSync(envPath)) {
                    envContent = fs.readFileSync(envPath, 'utf-8');
                }
                else if (fs.existsSync(exampleEnvPath)) {
                    envContent = fs.readFileSync(exampleEnvPath, 'utf-8');
                }
                // Update LLM provider settings if config provided
                if (config) {
                    let baseUrl = config.baseUrl || '';
                    if (baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1')) {
                        baseUrl = baseUrl.replace('localhost', 'host.docker.internal').replace('127.0.0.1', 'host.docker.internal');
                    }
                    // Add/update OpenAI-compatible settings for local LLM
                    const llmSettings = `
# LLM Configuration (Auto-synced)
OPENAI_API_KEY=${config.apiKey || 'not-needed'}
OPENAI_API_BASE=${baseUrl || 'https://api.openai.com/v1'}
`;
                    // Check if these settings already exist
                    if (!envContent.includes('# LLM Configuration (Auto-synced)')) {
                        envContent += llmSettings;
                    }
                    else {
                        // Replace existing LLM config block
                        envContent = envContent.replace(/# LLM Configuration \(Auto-synced\)[\s\S]*?(?=\n[A-Z]|\n$|$)/, llmSettings.trim());
                    }
                }
                // 既存のコード ...
                // 既存のコード ...
                fs.writeFileSync(envPath, envContent);
                // Restart Dify
                try {
                    await execAsync('docker compose down', { cwd: difyDockerDir });
                }
                catch { /* ignore */ }
                await execAsync('docker compose up -d', { cwd: difyDockerDir });
                console.log('[ServiceManager] Dify started with LLM config');
                // Auto-create Admin Account
                this.autoCreateDifyAdmin().catch(err => {
                    console.error('[ServiceManager] Failed to auto-create Dify admin:', err);
                });
                return { success: true };
            }
            else {
                return { success: false, error: 'Dify docker directory not found' };
            }
        }
        catch (e) {
            console.error('[ServiceManager] Failed to start Dify:', e.message);
            return { success: false, error: e.message };
        }
    }
    /**
     * Auto-create default Dify admin account if not exists
     */
    async autoCreateDifyAdmin() {
        console.log('[ServiceManager] Checking Dify admin account...');
        // Wait for DB to be ready
        let dbReady = false;
        for (let i = 0; i < 30; i++) {
            try {
                // Check if postgres is ready to accept connections
                await execAsync('docker exec docker-db_postgres-1 pg_isready -U postgres');
                dbReady = true;
                break;
            }
            catch {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
        if (!dbReady) {
            console.error('[ServiceManager] Dify DB not ready after 60s');
            return;
        }
        try {
            // Check if any account exists
            const { stdout: countOut } = await execAsync('docker exec docker-db_postgres-1 psql -U postgres dify -t -c "SELECT count(*) FROM accounts"');
            if (parseInt(countOut.trim()) > 0) {
                console.log('[ServiceManager] Dify accounts already exist. Skipping auto-creation.');
                return;
            }
            console.log('[ServiceManager] Creating default Dify admin account (admin@local.dev)...');
            // Password hash for "admin123" (bcrypt cost 10)
            const hash = '$2b$10$qFf5LyV5uop6UT8rnIgj1ufuElKjXV5ZSitP25ehITncIpnhT7Xi.';
            // Generate UUIDs using Postgres function
            const { stdout: uuidOut } = await execAsync('docker exec docker-db_postgres-1 psql -U postgres dify -t -c "SELECT uuid_generate_v4(), uuid_generate_v4(), uuid_generate_v4()"');
            const [tenantId, accountId, joinId] = uuidOut.trim().split('|').map(s => s.trim());
            if (!tenantId || !accountId || !joinId) {
                throw new Error('Failed to generate UUIDs');
            }
            // Insert Tenant
            await execAsync(`docker exec docker-db_postgres-1 psql -U postgres dify -c "INSERT INTO tenants (id, name, status, plan, created_at, updated_at) VALUES ('${tenantId}', 'My Workspace', 'normal', 'basic', NOW(), NOW())"`);
            // Insert Account
            await execAsync(`docker exec docker-db_postgres-1 psql -U postgres dify -c "INSERT INTO accounts (id, name, email, password, status, created_at, updated_at, last_active_at, initialized_at, interface_language) VALUES ('${accountId}', 'Admin', 'admin@local.dev', '${hash}', 'active', NOW(), NOW(), NOW(), NOW(), 'en-US')"`);
            // Insert Join
            await execAsync(`docker exec docker-db_postgres-1 psql -U postgres dify -c "INSERT INTO tenant_account_joins (id, tenant_id, account_id, role, created_at, updated_at, current) VALUES ('${joinId}', '${tenantId}', '${accountId}', 'owner', NOW(), NOW(), true)"`);
            console.log('[ServiceManager] Dify admin account created successfully.');
        }
        catch (e) {
            console.error('[ServiceManager] Error auto-creating Dify admin:', e);
        }
    }
    /**
     * Start all services
     */
    async startAllServices(config) {
        if (this.isStarting) {
            return {
                openhands: { success: false, error: 'Already starting' },
                n8n: { success: false, error: 'Already starting' },
                dify: { success: false, error: 'Already starting' }
            };
        }
        this.isStarting = true;
        console.log('[ServiceManager] Starting all services...');
        try {
            // Wait for Docker
            const dockerReady = await this.waitForDocker();
            if (!dockerReady) {
                return {
                    openhands: { success: false, error: 'Docker not available' },
                    n8n: { success: false, error: 'Docker not available' },
                    dify: { success: false, error: 'Docker not available' }
                };
            }
            // Check what's already running
            const status = await this.getServicesStatus();
            const results = {
                openhands: { success: true, error: undefined },
                n8n: { success: true, error: undefined },
                dify: { success: true, error: undefined }
            };
            // Start OpenHands if not running
            if (!status.find(s => s.name === 'OpenHands')?.running) {
                results.openhands = await this.startOpenHands(config);
            }
            else {
                console.log('[ServiceManager] OpenHands already running');
                results.openhands = { success: true };
            }
            // Start n8n if not running
            if (!status.find(s => s.name === 'n8n')?.running) {
                results.n8n = await this.startN8n(config);
            }
            else {
                console.log('[ServiceManager] n8n already running');
                results.n8n = { success: true };
            }
            // Start Dify if not running - Always try to start Dify to ensure config sync and account creation
            // Dify check is complex because of multiple containers, so we trust startDify to be idempotent-ish
            // But if it's already running we might skip restart unless forced? 
            // For now, let's just run it. The startDify method handles "Already starting" but doesn't handle "Already running" explicitly
            // except by restarting via docker-compose.
            if (!status.find(s => s.name === 'Dify')?.running) {
                results.dify = await this.startDify(config);
            }
            else {
                console.log('[ServiceManager] Dify already running, checking admin account...');
                this.autoCreateDifyAdmin().catch(err => {
                    console.error('[ServiceManager] Failed to auto-create Dify admin:', err);
                });
                results.dify = { success: true };
            }
            return results;
        }
        finally {
            this.isStarting = false;
        }
    }
    /**
     * Stop all services
     */
    async stopAllServices() {
        console.log('[ServiceManager] Stopping all services...');
        try {
            await execAsync('docker rm -f openhands-app');
        }
        catch { /* ignore */ }
        try {
            await execAsync('docker rm -f n8n-app');
        }
        catch { /* ignore */ }
        const difyDockerDir = path.join(this.projectRoot, '.dify', 'docker');
        if (fs.existsSync(difyDockerDir)) {
            try {
                await execAsync('docker compose down', { cwd: difyDockerDir });
            }
            catch { /* ignore */ }
        }
        console.log('[ServiceManager] All services stopped');
    }
}
// Singleton
let serviceManagerInstance = null;
export function getServiceManager() {
    if (!serviceManagerInstance) {
        serviceManagerInstance = new ServiceManager();
    }
    return serviceManagerInstance;
}

export interface Plugin {
    id: string;
    name: string;
    version: string;
    description: string;
    author: string;
    installed: boolean;
    enabled: boolean;
}

export class Marketplace {
    private plugins: Map<string, Plugin> = new Map();
    private readonly installedDir: string;

    constructor(_installedDir?: string) {
        this.installedDir = _installedDir || '.localllm/plugins';
    }

    async fetchAvailablePlugins(): Promise<Plugin[]> {
        // In production: fetch from registry API
        console.log(`[Marketplace] Fetching plugins for ${this.installedDir}...`);
        return [];
    }

    async installPlugin(pluginId: string): Promise<boolean> {
        console.log(`[Marketplace] Installing plugin: ${pluginId}`);
        const plugin = this.plugins.get(pluginId);
        if (plugin) {
            plugin.installed = true;
            return true;
        }
        return false;
    }

    async uninstallPlugin(pluginId: string): Promise<boolean> {
        console.log(`[Marketplace] Uninstalling plugin: ${pluginId}`);
        const plugin = this.plugins.get(pluginId);
        if (plugin) {
            plugin.installed = false;
            plugin.enabled = false;
            return true;
        }
        return false;
    }

    async enablePlugin(pluginId: string): Promise<boolean> {
        const plugin = this.plugins.get(pluginId);
        if (plugin && plugin.installed) {
            plugin.enabled = true;
            return true;
        }
        return false;
    }

    async disablePlugin(pluginId: string): Promise<boolean> {
        const plugin = this.plugins.get(pluginId);
        if (plugin) {
            plugin.enabled = false;
            return true;
        }
        return false;
    }

    getInstalledPlugins(): Plugin[] {
        return Array.from(this.plugins.values()).filter(p => p.installed);
    }

    getEnabledPlugins(): Plugin[] {
        return Array.from(this.plugins.values()).filter(p => p.enabled);
    }
}

let instance: Marketplace | null = null;

export function getMarketplace(installedDir?: string): Marketplace {
    if (!instance) instance = new Marketplace(installedDir);
    return instance;
}

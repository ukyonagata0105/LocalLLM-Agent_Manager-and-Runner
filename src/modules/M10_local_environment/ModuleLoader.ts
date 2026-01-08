/**
 * M10 Local Environment - Module Loader
 * Dynamic module loading with dependency resolution.
 */

import { MODULE_DEFINITIONS, ModuleDefinition, ModuleConfig } from './types';
import { getConfigService } from './ConfigService';

export interface LoadedModule {
    definition: ModuleDefinition;
    config: ModuleConfig;
    instance: unknown;
    status: 'loaded' | 'failed' | 'disabled';
    error?: string;
}

export class ModuleLoader {
    private loadedModules: Map<string, LoadedModule> = new Map();

    async loadAllModules(): Promise<Map<string, LoadedModule>> {
        const configService = getConfigService();
        const moduleConfigs = configService.getAllModuleConfigs();

        // Sort by tier and dependencies
        const sorted = this.topologicalSort(MODULE_DEFINITIONS);

        for (const definition of sorted) {
            const config = moduleConfigs[definition.id] || { enabled: definition.defaultEnabled };

            if (!config.enabled) {
                this.loadedModules.set(definition.id, {
                    definition,
                    config,
                    instance: null,
                    status: 'disabled',
                });
                continue;
            }

            // Check dependencies
            const unmetDeps = definition.dependencies.filter(depId => {
                const depModule = this.loadedModules.get(depId);
                return !depModule || depModule.status !== 'loaded';
            });

            if (unmetDeps.length > 0) {
                this.loadedModules.set(definition.id, {
                    definition,
                    config,
                    instance: null,
                    status: 'failed',
                    error: `Unmet dependencies: ${unmetDeps.join(', ')}`,
                });
                continue;
            }

            try {
                const instance = await this.loadModule(definition.id);
                this.loadedModules.set(definition.id, {
                    definition,
                    config,
                    instance,
                    status: 'loaded',
                });
            } catch (error) {
                this.loadedModules.set(definition.id, {
                    definition,
                    config,
                    instance: null,
                    status: 'failed',
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        }

        return this.loadedModules;
    }

    private async loadModule(moduleId: string): Promise<unknown> {
        // Dynamic import based on module ID
        const moduleMap: Record<string, string> = {
            'M01': '../M01_core',
            'M02': '../M02_llm',
            'M03': '../M03_mcp',
            'M04': '../M04_workflow',
            'M05': '../M05_rag',
            'M06': '../M06_voice',
            'M07': '../M07_pdf',
            'M08': '../M08_browser',
            'M09': '../M09_task',
            'M10': '../M10_local_environment',
            'M11': '../M11_remote',
            'M12': '../M12_voice_interface',
            'M13': '../M13_multimodel',
            'M14': '../M14_memory',
            'M15': '../M15_docker',
            'M16': '../M16_multimodal',
            'M17': '../M17_marketplace',
            'M18': '../M18_analytics',
            'M19': '../M19_team',
            'M20': '../M20_api',
            'M21': '../M21_dashboard',
            'M22': '../M22_cli',
        };

        const modulePath = moduleMap[moduleId];
        if (!modulePath) {
            throw new Error(`Unknown module: ${moduleId}`);
        }

        try {
            const module = await import(modulePath);
            return module;
        } catch (error) {
            // Module not yet implemented - this is expected during development
            console.warn(`Module ${moduleId} not yet implemented`);
            return null;
        }
    }

    private topologicalSort(modules: ModuleDefinition[]): ModuleDefinition[] {
        const result: ModuleDefinition[] = [];
        const visited = new Set<string>();
        const visiting = new Set<string>();
        const moduleMap = new Map(modules.map(m => [m.id, m]));

        const visit = (mod: ModuleDefinition) => {
            if (visited.has(mod.id)) return;
            if (visiting.has(mod.id)) {
                throw new Error(`Circular dependency detected: ${mod.id}`);
            }

            visiting.add(mod.id);

            for (const depId of mod.dependencies) {
                const dep = moduleMap.get(depId);
                if (dep) visit(dep);
            }

            visiting.delete(mod.id);
            visited.add(mod.id);
            result.push(mod);
        };

        for (const mod of modules) {
            visit(mod);
        }

        return result;
    }

    getModule(moduleId: string): LoadedModule | undefined {
        return this.loadedModules.get(moduleId);
    }

    getAllModules(): LoadedModule[] {
        return Array.from(this.loadedModules.values());
    }
}

// Singleton
let moduleLoaderInstance: ModuleLoader | null = null;

export function getModuleLoader(): ModuleLoader {
    if (!moduleLoaderInstance) {
        moduleLoaderInstance = new ModuleLoader();
    }
    return moduleLoaderInstance;
}

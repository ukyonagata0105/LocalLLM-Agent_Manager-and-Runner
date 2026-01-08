export interface Container {
    id: string;
    image: string;
    status: 'created' | 'running' | 'stopped' | 'removed';
    createdAt: number;
}

export interface DockerConfig {
    socketPath?: string;
    defaultImage: string;
    memoryLimit?: string;
    cpuLimit?: number;
}

export class DockerSandbox {
    private config: DockerConfig;
    private containers: Map<string, Container> = new Map();

    constructor(config?: Partial<DockerConfig>) {
        this.config = {
            defaultImage: 'python:3.11-slim',
            memoryLimit: '512m',
            cpuLimit: 1,
            ...config,
        };
    }

    async createContainer(image?: string): Promise<Container> {
        // In production: use dockerode to create container
        const container: Container = {
            id: crypto.randomUUID().substring(0, 12),
            image: image || this.config.defaultImage,
            status: 'created',
            createdAt: Date.now(),
        };

        this.containers.set(container.id, container);
        console.log(`[Docker] Created container ${container.id} with image ${container.image}`);
        return container;
    }

    async startContainer(containerId: string): Promise<boolean> {
        const container = this.containers.get(containerId);
        if (!container) return false;

        container.status = 'running';
        console.log(`[Docker] Started container ${containerId}`);
        return true;
    }

    async executeCommand(containerId: string, command: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
        const container = this.containers.get(containerId);
        if (!container || container.status !== 'running') {
            return { stdout: '', stderr: 'Container not running', exitCode: 1 };
        }

        // In production: use dockerode exec
        console.log(`[Docker] Executing in ${containerId}: ${command}`);
        return { stdout: 'Command output would appear here', stderr: '', exitCode: 0 };
    }

    async stopContainer(containerId: string): Promise<void> {
        const container = this.containers.get(containerId);
        if (container) {
            container.status = 'stopped';
            console.log(`[Docker] Stopped container ${containerId}`);
        }
    }

    async removeContainer(containerId: string): Promise<void> {
        this.containers.delete(containerId);
        console.log(`[Docker] Removed container ${containerId}`);
    }

    getContainer(containerId: string): Container | undefined {
        return this.containers.get(containerId);
    }

    listContainers(): Container[] {
        return Array.from(this.containers.values());
    }
}

let instance: DockerSandbox | null = null;

export function getDockerSandbox(config?: Partial<DockerConfig>): DockerSandbox {
    if (!instance) instance = new DockerSandbox(config);
    return instance;
}

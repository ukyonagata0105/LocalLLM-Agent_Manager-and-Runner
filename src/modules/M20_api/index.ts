export interface APIConfig {
    port: number;
    host: string;
    requireAuth: boolean;
    rateLimit: number;
}

export interface APIEndpoint {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    path: string;
    handler: (req: unknown, res: unknown) => Promise<void>;
    auth: boolean;
}

export class APIGateway {
    private config: APIConfig;
    private endpoints: APIEndpoint[] = [];
    private running: boolean = false;

    constructor(config?: Partial<APIConfig>) {
        this.config = {
            port: 3000,
            host: '127.0.0.1',
            requireAuth: true,
            rateLimit: 100,
            ...config,
        };
    }

    registerEndpoint(endpoint: APIEndpoint): void {
        this.endpoints.push(endpoint);
        console.log(`[API] Registered endpoint: ${endpoint.method} ${endpoint.path}`);
    }

    async start(): Promise<void> {
        if (this.running) return;

        // In production: start Express/Fastify server
        console.log(`[API] Starting server on ${this.config.host}:${this.config.port}`);
        this.running = true;
    }

    async stop(): Promise<void> {
        console.log('[API] Stopping server...');
        this.running = false;
    }

    isRunning(): boolean {
        return this.running;
    }

    getEndpoints(): APIEndpoint[] {
        return this.endpoints;
    }
}

let instance: APIGateway | null = null;

export function getAPIGateway(config?: Partial<APIConfig>): APIGateway {
    if (!instance) instance = new APIGateway(config);
    return instance;
}

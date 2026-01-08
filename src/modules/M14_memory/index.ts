export interface MemoryEntry {
    id: string;
    content: string;
    embedding?: number[];
    metadata: {
        agentId?: string;
        sessionId?: string;
        timestamp: number;
        importance: number;
    };
}

export class AgentMemory {
    private shortTerm: MemoryEntry[] = [];
    private longTerm: MemoryEntry[] = [];
    private maxShortTerm: number = 100;
    private maxLongTerm: number = 1000;

    async addMemory(content: string, importance: number = 0.5): Promise<MemoryEntry> {
        const entry: MemoryEntry = {
            id: crypto.randomUUID(),
            content,
            metadata: {
                timestamp: Date.now(),
                importance,
            },
        };

        if (importance > 0.7) {
            this.longTerm.push(entry);
            if (this.longTerm.length > this.maxLongTerm) {
                this.longTerm = this.longTerm.slice(-this.maxLongTerm);
            }
        } else {
            this.shortTerm.push(entry);
            if (this.shortTerm.length > this.maxShortTerm) {
                this.shortTerm.shift();
            }
        }

        return entry;
    }

    async recall(query: string, limit: number = 10): Promise<MemoryEntry[]> {
        // In production: use vector similarity search
        const keywords = query.toLowerCase().split(/\s+/);
        const all = [...this.shortTerm, ...this.longTerm];

        return all
            .filter(entry => keywords.some(k => entry.content.toLowerCase().includes(k)))
            .slice(0, limit);
    }

    getRecentMemories(count: number = 10): MemoryEntry[] {
        return [...this.shortTerm, ...this.longTerm]
            .sort((a, b) => b.metadata.timestamp - a.metadata.timestamp)
            .slice(0, count);
    }

    clear(): void {
        this.shortTerm = [];
        this.longTerm = [];
    }
}

let instance: AgentMemory | null = null;

export function getAgentMemory(): AgentMemory {
    if (!instance) instance = new AgentMemory();
    return instance;
}

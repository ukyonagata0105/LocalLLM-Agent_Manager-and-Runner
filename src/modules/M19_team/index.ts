export interface User {
    id: string;
    username: string;
    email: string;
    role: 'admin' | 'user' | 'viewer';
    createdAt: number;
}

export interface TeamConfig {
    maxUsers: number;
    authProvider: 'local' | 'oauth';
}

export class TeamManager {
    private users: Map<string, User> = new Map();

    constructor(_config?: Partial<TeamConfig>) { }

    async createUser(username: string, email: string, role: User['role'] = 'user'): Promise<User> {
        const user: User = {
            id: crypto.randomUUID(),
            username,
            email,
            role,
            createdAt: Date.now(),
        };
        this.users.set(user.id, user);
        console.log(`[Team] Created user: ${username}`);
        return user;
    }

    async deleteUser(userId: string): Promise<boolean> {
        return this.users.delete(userId);
    }

    async updateUserRole(userId: string, role: User['role']): Promise<boolean> {
        const user = this.users.get(userId);
        if (user) {
            user.role = role;
            return true;
        }
        return false;
    }

    getUser(userId: string): User | undefined {
        return this.users.get(userId);
    }

    getAllUsers(): User[] {
        return Array.from(this.users.values());
    }

    hasPermission(userId: string, permission: string): boolean {
        const user = this.users.get(userId);
        if (!user) return false;

        const rolePermissions: Record<string, string[]> = {
            admin: ['*'],
            user: ['read', 'write', 'execute'],
            viewer: ['read'],
        };

        const perms = rolePermissions[user.role] || [];
        return perms.includes('*') || perms.includes(permission);
    }
}

let instance: TeamManager | null = null;

export function getTeamManager(config?: Partial<TeamConfig>): TeamManager {
    if (!instance) instance = new TeamManager(config);
    return instance;
}

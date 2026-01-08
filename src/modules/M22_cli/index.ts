export interface CLICommand {
    name: string;
    description: string;
    args?: Array<{ name: string; required: boolean; description: string }>;
    flags?: Array<{ name: string; char?: string; description: string }>;
    run: (args: Record<string, unknown>, flags: Record<string, unknown>) => Promise<void>;
}

export class CLI {
    private commands: Map<string, CLICommand> = new Map();

    register(command: CLICommand): void {
        this.commands.set(command.name, command);
    }

    async run(argv: string[]): Promise<void> {
        const [commandName, ...rest] = argv;

        if (!commandName || commandName === 'help') {
            this.showHelp();
            return;
        }

        const command = this.commands.get(commandName);
        if (!command) {
            console.error(`Unknown command: ${commandName}`);
            this.showHelp();
            return;
        }

        // Parse args and flags
        const args: Record<string, unknown> = {};
        const flags: Record<string, unknown> = {};

        for (let i = 0; i < rest.length; i++) {
            const arg = rest[i];
            if (arg.startsWith('--')) {
                const [key, value] = arg.substring(2).split('=');
                flags[key] = value ?? true;
            } else if (arg.startsWith('-')) {
                flags[arg.substring(1)] = rest[++i] ?? true;
            } else if (command.args && command.args[Object.keys(args).length]) {
                args[command.args[Object.keys(args).length].name] = arg;
            }
        }

        await command.run(args, flags);
    }

    private showHelp(): void {
        console.log('LocalLLM Agent Manager CLI');
        console.log('\nCommands:');
        for (const [name, cmd] of this.commands) {
            console.log(`  ${name.padEnd(20)} ${cmd.description}`);
        }
    }

    getCommands(): CLICommand[] {
        return Array.from(this.commands.values());
    }
}

let instance: CLI | null = null;

export function getCLI(): CLI {
    if (!instance) {
        instance = new CLI();

        // Register default commands
        instance.register({
            name: 'start',
            description: 'Start the agent manager',
            run: async () => console.log('Starting LocalLLM Agent Manager...'),
        });

        instance.register({
            name: 'chat',
            description: 'Start an interactive chat session',
            run: async () => console.log('Starting chat session...'),
        });

        instance.register({
            name: 'config',
            description: 'Manage configuration',
            run: async () => console.log('Configuration options...'),
        });
    }
    return instance;
}

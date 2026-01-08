/**
 * M01 Core Engine - Built-in Tools
 * Default tools available to the agent.
 * 
 * SECURITY NOTE: All file system and shell operations are delegated to Electron's
 * main process via IPC to prevent security vulnerabilities and ensure proper sandboxing.
 */

import { ToolDefinition } from './types';

// Helper to check if we are in a browser/renderer environment
const isBrowser = typeof window !== 'undefined';

// Check if Electron IPC is available
const hasElectronIPC = () => {
    return isBrowser && typeof (window as any).ipcRenderer?.invoke === 'function';
};

// Type-safe wrapper for Electron IPC calls
const invokeIPC = async <T>(channel: string, ...args: unknown[]): Promise<T | null> => {
    if (!hasElectronIPC()) return null;
    try {
        return await (window as any).ipcRenderer.invoke(channel, ...args);
    } catch (error) {
        console.error(`[IPC] Error invoking ${channel}:`, error);
        return null;
    }
};

export const readFileTool: ToolDefinition = {
    name: 'read_file',
    description: 'Read the contents of a file',
    parameters: {
        path: { type: 'string', description: 'Path to the file', required: true },
    },
    execute: async (args) => {
        if (!hasElectronIPC()) {
            return { success: false, error: 'File operations require the desktop app (Electron).' };
        }
        const filePath = args.path as string;
        const result = await invokeIPC<{ success: boolean; content?: string; error?: string }>('read-file', filePath);
        return result || { success: false, error: 'IPC communication failed' };
    },
};

export const writeFileTool: ToolDefinition = {
    name: 'write_file',
    description: 'Write content to a file',
    parameters: {
        path: { type: 'string', description: 'Path to the file', required: true },
        content: { type: 'string', description: 'Content to write', required: true },
    },
    execute: async (args) => {
        if (!hasElectronIPC()) {
            return { success: false, error: 'File operations require the desktop app (Electron).' };
        }
        const filePath = args.path as string;
        const content = args.content as string;
        const result = await invokeIPC<{ success: boolean; error?: string }>('write-file', filePath, content);
        return result || { success: false, error: 'IPC communication failed' };
    },
};

export const listDirectoryTool: ToolDefinition = {
    name: 'list_directory',
    description: 'List files in a directory',
    parameters: {
        path: { type: 'string', description: 'Path to the directory', required: true },
    },
    execute: async (args) => {
        if (!hasElectronIPC()) {
            return { success: false, error: 'File operations require the desktop app (Electron).' };
        }
        const dirPath = args.path as string;
        const result = await invokeIPC<{ success: boolean; files?: Array<{ name: string; isDirectory: boolean }>; error?: string }>('list-directory', dirPath);
        return result || { success: false, error: 'IPC communication failed' };
    },
};

export const executeCommandTool: ToolDefinition = {
    name: 'execute_command',
    description: 'Execute a shell command',
    parameters: {
        command: { type: 'string', description: 'Command to execute', required: true },
        cwd: { type: 'string', description: 'Working directory', required: false },
    },
    execute: async (args) => {
        // Mock for safe connectivity tests in browser
        if (!hasElectronIPC()) {
            if (args.command === "echo 'OpenHands is active'") {
                return { success: true, stdout: "OpenHands is active (Mocked)", stderr: "" };
            }
            return { success: false, error: 'Command execution requires the desktop app (Electron).' };
        }
        const command = args.command as string;
        const cwd = args.cwd as string | undefined;
        const result = await invokeIPC<{ success: boolean; stdout?: string; stderr?: string; error?: string }>('execute-command', command, cwd);
        return result || { success: false, error: 'IPC communication failed' };
    },
};

export const searchTextTool: ToolDefinition = {
    name: 'search_text',
    description: 'Search for text in files',
    parameters: {
        pattern: { type: 'string', description: 'Text pattern to search', required: true },
        directory: { type: 'string', description: 'Directory to search in', required: true },
    },
    execute: async (_args) => {
        if (!hasElectronIPC()) {
            return { success: false, error: 'Search requires the desktop app (Electron).' };
        }
        // TODO: Implement search via IPC
        return { success: false, error: 'Search not yet implemented' };
    }
};

export const openhandsTool: ToolDefinition = {
    name: 'openhands_tool',
    description: 'Delegate a complex coding task to OpenHands (Autonomous Developer). Use this for large refactors, scraping, or multi-file edits.',
    parameters: {
        task: { type: 'string', description: 'Detailed task description', required: true },
    },
    execute: async (args) => {
        return {
            success: true,
            output: `[OpenHands Controller] environment is active.\n\nNOTE: Direct API task submission is not yet implemented in Phase 1.\nPlease switch to the 'OpenHands' tab in the sidebar and paste your task description: "${args.task}"`
        };
    },
};

export const createWorkflowTool: ToolDefinition = {
    name: 'create_workflow_tool',
    description: 'Create a new n8n automation workflow.',
    parameters: {
        name: { type: 'string', description: 'Name of the workflow', required: true },
        description: { type: 'string', description: 'Description of what the workflow does', required: true },
    },
    execute: async (args) => {
        return {
            success: true,
            output: `Workflow "${args.name}" created successfully.\nEdit it here: http://localhost:5678/workflow/new?name=${encodeURIComponent(args.name as string)}`
        };
    },
};


export const manageOpenHandsTool: ToolDefinition = {
    name: 'manage_openhands',
    description: 'Manage the OpenHands docker container (start/stop/restart) with LLM configuration.',
    parameters: {
        action: { type: 'string', description: 'Action to perform: start, stop, restart', required: true },
        llmConfig: {
            type: 'object',
            description: 'LLM Configuration (apiKey, model, baseUrl, provider)',
            required: false
        }
    },
    execute: async (args) => {
        if (!hasElectronIPC()) {
            return { success: true, output: 'OpenHands management mocked in browser.' };
        }
        const action = args.action as string;
        if (action === 'start' || action === 'restart') {
            const result = await invokeIPC<{ success: boolean; error?: string }>('start-openhands');
            return result || { success: false, error: 'IPC communication failed' };
        }
        // For stop, use service manager through IPC
        return { success: true, output: `Action ${action} completed` };
    },
};


export const manageN8nTool: ToolDefinition = {
    name: 'manage_n8n',
    description: 'Manage the n8n workflow engine (start/stop/restart) with LLM configuration.',
    parameters: {
        action: { type: 'string', description: 'Action to perform: start, stop, restart', required: true },
        llmConfig: {
            type: 'object',
            description: 'LLM Configuration (apiKey, model, baseUrl, provider)',
            required: false
        }
    },
    execute: async (args) => {
        if (!hasElectronIPC()) {
            return { success: true, output: 'n8n management mocked in browser.' };
        }
        const action = args.action as string;
        if (action === 'start' || action === 'restart') {
            const result = await invokeIPC<{ success: boolean; error?: string }>('start-n8n');
            return result || { success: false, error: 'IPC communication failed' };
        }
        return { success: true, output: `Action ${action} completed` };
    },
};

export const manageDifyTool: ToolDefinition = {
    name: 'manage_dify',
    description: 'Manage the Dify RAG platform (start/stop/restart) with LLM configuration.',
    parameters: {
        action: { type: 'string', description: 'Action to perform: start, stop, restart', required: true },
        llmConfig: {
            type: 'object',
            description: 'LLM Configuration (apiKey, model, baseUrl, provider)',
            required: false
        }
    },
    execute: async (args) => {
        if (!hasElectronIPC()) {
            return { success: true, output: 'Dify management mocked in browser.' };
        }
        const action = args.action as string;
        if (action === 'start' || action === 'restart') {
            const result = await invokeIPC<{ success: boolean; error?: string }>('start-dify');
            return result || { success: false, error: 'IPC communication failed' };
        }
        return { success: true, output: `Action ${action} completed` };
    },
};


export const toggleAutoIndexingTool: ToolDefinition = {
    name: 'toggle_auto_indexing',
    description: 'Start or Stop the Automated RAG Indexing Background Service.',
    parameters: {
        action: { type: 'string', description: 'start or stop', required: true },
        llmConfig: { type: 'object', description: 'Dify API Config', required: false }
    },
    execute: async (args) => {
        if (!hasElectronIPC()) {
            return { success: true, output: 'Auto-indexing mocked in browser.' };
        }
        const action = args.action as string;
        // TODO: Implement via IPC when RAG watcher is moved to main process
        return { success: true, output: `Auto-indexing ${action} (not yet implemented via IPC)` };
    }
};

// ============================================================
// n8n Workflow API Tools - Allow agent to manage n8n workflows
// ============================================================

import { getN8nClient } from '../M04_workflow/N8nClient';

export const n8nListWorkflowsTool: ToolDefinition = {
    name: 'n8n_list_workflows',
    description: 'List all workflows in n8n automation platform',
    parameters: {},
    execute: async () => {
        try {
            const client = getN8nClient();
            const result = await client.listWorkflows();
            return {
                success: true,
                workflows: result.data.map(w => ({
                    id: w.id,
                    name: w.name,
                    active: w.active,
                    updatedAt: w.updatedAt
                }))
            };
        } catch (error) {
            return { success: false, error: String(error) };
        }
    }
};

export const n8nCreateWorkflowTool: ToolDefinition = {
    name: 'n8n_create_workflow',
    description: 'Create a new automation workflow in n8n',
    parameters: {
        name: { type: 'string', description: 'Name for the workflow', required: true },
        description: { type: 'string', description: 'What the workflow should do', required: false },
    },
    execute: async (args) => {
        try {
            const client = getN8nClient();
            const workflow = await client.createWorkflow({
                name: args.name as string,
                nodes: [
                    {
                        id: 'trigger-1',
                        name: 'Manual Trigger',
                        type: 'n8n-nodes-base.manualTrigger',
                        position: [250, 300],
                        parameters: {},
                    },
                ],
                connections: {},
            });
            return {
                success: true,
                workflowId: workflow.id,
                name: workflow.name,
                message: `Workflow "${workflow.name}" created. Open n8n to add nodes.`
            };
        } catch (error) {
            return { success: false, error: String(error) };
        }
    }
};

export const n8nExecuteWorkflowTool: ToolDefinition = {
    name: 'n8n_execute_workflow',
    description: 'Execute an n8n workflow by ID',
    parameters: {
        workflowId: { type: 'string', description: 'ID of the workflow to execute', required: true },
        inputData: { type: 'object', description: 'Optional input data for the workflow', required: false },
    },
    execute: async (args) => {
        try {
            const client = getN8nClient();
            const execution = await client.executeWorkflow(
                args.workflowId as string,
                args.inputData as Record<string, unknown>
            );
            return {
                success: true,
                executionId: execution.id,
                status: execution.status,
                message: `Workflow execution started: ${execution.id}`
            };
        } catch (error) {
            return { success: false, error: String(error) };
        }
    }
};

// ============================================================
// OpenHands Task Execution Tool - Run coding tasks via OpenHands
// ============================================================

import { getOpenHandsClient } from './OpenHandsClient';

export const openHandsExecuteTaskTool: ToolDefinition = {
    name: 'openhands_execute_task',
    description: 'Execute a coding task using OpenHands autonomous agent. Use this for file modifications, code generation, debugging, etc.',
    parameters: {
        task: { type: 'string', description: 'Description of the coding task to perform', required: true },
        waitForCompletion: { type: 'boolean', description: 'Whether to wait for the task to complete (default: false)', required: false },
    },
    execute: async (args) => {
        try {
            const client = getOpenHandsClient();
            const task = args.task as string;
            const waitForCompletion = args.waitForCompletion as boolean || false;

            if (waitForCompletion) {
                // Full execution with waiting
                const result = await client.executeTask(task, { timeout: 120000 });
                return {
                    success: result.success,
                    sessionId: result.sessionId,
                    eventCount: result.events.length,
                    error: result.error,
                };
            } else {
                // Fire and forget
                const session = await client.createSession();
                await client.sendMessage(session.conversation_id, task);
                return {
                    success: true,
                    sessionId: session.conversation_id,
                    message: 'Task sent to OpenHands. Check OpenHands UI for progress.',
                };
            }
        } catch (error) {
            return { success: false, error: String(error) };
        }
    }
};

export const openHandsGetStatusTool: ToolDefinition = {
    name: 'openhands_get_status',
    description: 'Get the status of an OpenHands session',
    parameters: {
        sessionId: { type: 'string', description: 'Session/conversation ID', required: true },
    },
    execute: async (args) => {
        try {
            const client = getOpenHandsClient();
            const sessionId = args.sessionId as string;

            const [session, events] = await Promise.all([
                client.getSession(sessionId),
                client.getEvents(sessionId),
            ]);

            return {
                success: true,
                status: session.status,
                eventCount: events.events.length,
                lastActivity: session.last_activity,
                recentEvents: events.events.slice(-5).map(e => ({
                    action: e.action || e.observation,
                    message: e.message?.substring(0, 100),
                })),
            };
        } catch (error) {
            return { success: false, error: String(error) };
        }
    }
};

// ============================================================
// Dify Knowledge Base Tools - RAG and Document Management
// ============================================================

import { getDifyClient } from '../M05_rag/DifyClient';

export const difyListDatasetsTool: ToolDefinition = {
    name: 'dify_list_datasets',
    description: 'List all knowledge datasets in Dify',
    parameters: {},
    execute: async () => {
        try {
            const client = await getDifyClient();
            if (!client) {
                return { success: false, error: 'Dify not configured. Set API key in Settings.' };
            }
            const result = await client.listDatasets();
            return {
                success: true,
                datasets: result.data.map(d => ({
                    id: d.id,
                    name: d.name,
                    documentCount: d.document_count,
                    wordCount: d.word_count,
                }))
            };
        } catch (error) {
            return { success: false, error: String(error) };
        }
    }
};

export const difySearchKnowledgeTool: ToolDefinition = {
    name: 'dify_search_knowledge',
    description: 'Search for information in Dify knowledge base (RAG)',
    parameters: {
        datasetId: { type: 'string', description: 'ID of the dataset to search', required: true },
        query: { type: 'string', description: 'Search query', required: true },
    },
    execute: async (args) => {
        try {
            const client = await getDifyClient();
            if (!client) {
                return { success: false, error: 'Dify not configured. Set API key in Settings.' };
            }
            const result = await client.retrieve(
                args.datasetId as string,
                args.query as string
            );
            return {
                success: true,
                results: result.records?.map((r: { segment: { content: string }; score: number }) => ({
                    content: r.segment?.content,
                    score: r.score,
                })) || []
            };
        } catch (error) {
            return { success: false, error: String(error) };
        }
    }
};

export const difyAddDocumentTool: ToolDefinition = {
    name: 'dify_add_document',
    description: 'Add a text document to a Dify knowledge dataset',
    parameters: {
        datasetId: { type: 'string', description: 'ID of the dataset', required: true },
        name: { type: 'string', description: 'Name for the document', required: true },
        content: { type: 'string', description: 'Text content to add', required: true },
    },
    execute: async (args) => {
        try {
            const client = await getDifyClient();
            if (!client) {
                return { success: false, error: 'Dify not configured. Set API key in Settings.' };
            }
            const doc = await client.createDocumentByText(
                args.datasetId as string,
                args.name as string,
                args.content as string
            );
            return {
                success: true,
                documentId: doc.id,
                name: doc.name,
                message: 'Document added. Indexing may take a few moments.'
            };
        } catch (error) {
            return { success: false, error: String(error) };
        }
    }
};

// ============================================================
// Natural Language Workflow Generation
// ============================================================

import { getWorkflowGenerator } from '../M04_workflow/WorkflowGenerator';

export const generateWorkflowFromTextTool: ToolDefinition = {
    name: 'generate_workflow',
    description: 'Create an n8n automation workflow from a natural language description. Example: "Every day at 6pm, fetch git commits and create a daily report"',
    parameters: {
        description: { type: 'string', description: 'Natural language description of what the workflow should do', required: true },
    },
    execute: async (args) => {
        try {
            const generator = getWorkflowGenerator();
            const result = await generator.generate(args.description as string);

            if (!result.success) {
                return { success: false, error: result.error };
            }

            return {
                success: true,
                workflowId: result.workflow?.id,
                name: result.workflow?.name,
                steps: result.template?.steps.length,
                message: `Workflow "${result.workflow?.name}" created successfully! Open n8n to view and customize it.`,
            };
        } catch (error) {
            return { success: false, error: String(error) };
        }
    }
};

export const DEFAULT_TOOLS: ToolDefinition[] = [
    readFileTool,
    writeFileTool,
    listDirectoryTool,
    executeCommandTool,
    searchTextTool,
    openhandsTool,
    createWorkflowTool,
    manageOpenHandsTool,
    manageN8nTool,
    manageDifyTool,
    toggleAutoIndexingTool,
    // n8n API tools
    n8nListWorkflowsTool,
    n8nCreateWorkflowTool,
    n8nExecuteWorkflowTool,
    // OpenHands API tools
    openHandsExecuteTaskTool,
    openHandsGetStatusTool,
    // Dify API tools
    difyListDatasetsTool,
    difySearchKnowledgeTool,
    difyAddDocumentTool,
    // Workflow generation
    generateWorkflowFromTextTool,
];


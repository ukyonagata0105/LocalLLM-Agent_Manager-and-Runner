/**
 * RAG MCP Server
 * Exposes RAG/Knowledge functions as MCP tools for OpenHands
 */

import { getDifyClient } from './DifyClient';
import { getDocumentStore } from './DocumentStore';

export interface MCPTool {
    name: string;
    description: string;
    inputSchema: {
        type: 'object';
        properties: Record<string, { type: string; description: string }>;
        required: string[];
    };
}

export interface MCPToolResult {
    content: Array<{ type: 'text'; text: string }>;
    isError?: boolean;
}

/**
 * RAG Tools exposed via MCP protocol
 */
export const RAG_MCP_TOOLS: MCPTool[] = [
    {
        name: 'search_knowledge',
        description: 'Search the knowledge base for relevant information using semantic search',
        inputSchema: {
            type: 'object',
            properties: {
                query: { type: 'string', description: 'Search query' },
                topK: { type: 'number', description: 'Number of results to return (default: 5)' },
            },
            required: ['query'],
        },
    },
    {
        name: 'add_to_knowledge',
        description: 'Add new information to the knowledge base',
        inputSchema: {
            type: 'object',
            properties: {
                title: { type: 'string', description: 'Title/name for the document' },
                content: { type: 'string', description: 'Content to add' },
                tags: { type: 'string', description: 'Comma-separated tags' },
            },
            required: ['title', 'content'],
        },
    },
    {
        name: 'list_knowledge_sources',
        description: 'List all available knowledge sources/datasets',
        inputSchema: {
            type: 'object',
            properties: {},
            required: [],
        },
    },
];

/**
 * Handle MCP tool calls for RAG
 */
export async function handleRAGToolCall(
    toolName: string,
    args: Record<string, unknown>
): Promise<MCPToolResult> {
    try {
        switch (toolName) {
            case 'search_knowledge': {
                const query = args.query as string;
                const topK = (args.topK as number) || 5;

                // Try Dify first
                const difyClient = await getDifyClient();
                if (difyClient) {
                    try {
                        const datasets = await difyClient.listDatasets({ limit: 1 });
                        if (datasets.data.length > 0) {
                            const result = await difyClient.retrieve(datasets.data[0].id, query);
                            const texts = result.records?.slice(0, topK).map((r: { segment?: { content?: string }; score?: number }) =>
                                `[Score: ${r.score?.toFixed(2)}] ${r.segment?.content || 'No content'}`
                            ) || [];
                            return {
                                content: [{ type: 'text', text: texts.join('\n\n---\n\n') || 'No results found' }],
                            };
                        }
                    } catch (e) {
                        console.warn('[RAG MCP] Dify search failed, falling back to local:', e);
                    }
                }

                // Fallback to local DocumentStore
                const store = getDocumentStore();
                const results = await store.search(query, topK);
                const texts = results.map(r =>
                    `[Score: ${r.score.toFixed(2)}] ${r.document.content.substring(0, 500)}...`
                );
                return {
                    content: [{ type: 'text', text: texts.join('\n\n---\n\n') || 'No results found' }],
                };
            }

            case 'add_to_knowledge': {
                const title = args.title as string;
                const content = args.content as string;
                const tags = (args.tags as string)?.split(',').map(t => t.trim()) || [];

                // Try Dify first
                const difyClient = await getDifyClient();
                if (difyClient) {
                    try {
                        const datasets = await difyClient.listDatasets({ limit: 1 });
                        if (datasets.data.length > 0) {
                            await difyClient.createDocumentByText(datasets.data[0].id, title, content);
                            return {
                                content: [{ type: 'text', text: `Document "${title}" added to Dify knowledge base.` }],
                            };
                        }
                    } catch (e) {
                        console.warn('[RAG MCP] Dify add failed, falling back to local:', e);
                    }
                }

                // Fallback to local DocumentStore
                const store = getDocumentStore();
                await store.addDocument(content, { title, tags, source: 'mcp-tool' });
                return {
                    content: [{ type: 'text', text: `Document "${title}" added to local knowledge base.` }],
                };
            }

            case 'list_knowledge_sources': {
                const sources: string[] = [];

                // Check Dify
                const difyClient = await getDifyClient();
                if (difyClient) {
                    try {
                        const datasets = await difyClient.listDatasets();
                        sources.push(...datasets.data.map(d =>
                            `[Dify] ${d.name} (${d.document_count} docs, ${d.word_count} words)`
                        ));
                    } catch (e) {
                        sources.push('[Dify] Not connected');
                    }
                } else {
                    sources.push('[Dify] Not configured');
                }

                // Check local store
                const store = getDocumentStore();
                const count = store.getDocumentCount();
                sources.push(`[Local] In-memory store (${count} docs)`);

                return {
                    content: [{ type: 'text', text: sources.join('\n') }],
                };
            }

            default:
                return {
                    content: [{ type: 'text', text: `Unknown tool: ${toolName}` }],
                    isError: true,
                };
        }
    } catch (error) {
        return {
            content: [{ type: 'text', text: `Error: ${String(error)}` }],
            isError: true,
        };
    }
}

/**
 * Generate MCP server manifest
 */
export function getRAGMCPManifest() {
    return {
        name: 'localllm-rag',
        version: '1.0.0',
        description: 'Knowledge base and RAG tools for LocalLLM Agent Manager',
        tools: RAG_MCP_TOOLS,
    };
}

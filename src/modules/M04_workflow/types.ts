/**
 * M04 Workflow Engine - Types
 * Based on Claude Code Workflow Studio data model
 */

import { Node, Edge } from '@xyflow/react';

// ============================================================================
// Core Enums
// ============================================================================

export enum NodeType {
    SubAgent = 'subAgent',
    AskUserQuestion = 'askUserQuestion',
    IfElse = 'ifElse', // 2-way branch
    Switch = 'switch', // Multi-way branch
    Start = 'start',
    End = 'end',
    Prompt = 'prompt',
    Skill = 'skill', // Claude Code Skill
    Mcp = 'mcp',     // MCP Tool
    SubAgentFlow = 'subAgentFlow', // Sub-workflow reference
}

// ============================================================================
// Base Types
// ============================================================================

export interface Position {
    x: number;
    y: number;
}

export interface WorkflowMetadata {
    tags?: string[];
    author?: string;
    [key: string]: unknown;
}

// ============================================================================
// Node Data Types
// ============================================================================

export interface SubAgentData {
    label?: string;
    description: string;
    prompt: string;
    tools?: string;
    model?: 'sonnet' | 'opus' | 'haiku' | 'inherit';
    color?: 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'orange' | 'pink' | 'cyan';
    outputPorts: number;
    [key: string]: unknown;
}

export interface QuestionOption {
    id?: string;
    label: string;
    description: string;
}

export interface AskUserQuestionData {
    label?: string;
    questionText: string;
    options: QuestionOption[];
    multiSelect?: boolean;
    useAiSuggestions?: boolean;
    outputPorts: number;
    [key: string]: unknown;
}

export interface PromptNodeData {
    label?: string;
    prompt: string;
    variables?: Record<string, string>;
    [key: string]: unknown;
}

export interface BranchCondition {
    id?: string;
    label: string;
    condition: string;
}

export interface IfElseNodeData {
    label?: string;
    evaluationTarget?: string;
    branches: BranchCondition[]; // Exactly 2
    outputPorts: 2;
    [key: string]: unknown;
}

export interface SwitchNodeData {
    label?: string;
    evaluationTarget?: string;
    branches: BranchCondition[]; // 2-N
    outputPorts: number;
    [key: string]: unknown;
}

export interface SkillNodeData {
    label?: string;
    name: string;
    description: string;
    skillPath: string;
    scope: 'user' | 'project' | 'local';
    allowedTools?: string;
    validationStatus: 'valid' | 'missing' | 'invalid';
    outputPorts: 1;
    [key: string]: unknown;
}

export interface ToolParameter {
    name: string;
    type: string;
    description?: string | null;
    required: boolean;
    default?: unknown;
}

export interface McpNodeData {
    label?: string;
    serverId: string;
    toolName?: string;
    toolDescription?: string;
    parameters?: ToolParameter[];
    parameterValues?: Record<string, unknown>;
    validationStatus: 'valid' | 'missing' | 'invalid';
    outputPorts: 1;
    [key: string]: unknown;
}

// ============================================================================
// Node Types
// ============================================================================

export type WorkflowNodeData =
    | SubAgentData
    | AskUserQuestionData
    | IfElseNodeData
    | SwitchNodeData
    | PromptNodeData
    | SkillNodeData
    | McpNodeData
    | { label: string;[key: string]: unknown }; // Fallback for Start, End

export type WorkflowNode = Node<WorkflowNodeData>;
export type WorkflowEdge = Edge;

// ============================================================================
// Workflow Type
// ============================================================================

export interface Workflow {
    id: string;
    name: string;
    description?: string;
    version: number;
    schemaVersion?: string; // "1.0.0", "1.1.0" etc.
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
    createdAt: number;
    updatedAt: number;
    metadata?: WorkflowMetadata;
    variables?: Record<string, unknown>; // Legacy support
}

// Legacy type aliases for backwards compatibility
export type WorkflowYAML = Workflow;

export interface WorkflowExecution {
    id: string;
    workflowId: string;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
    startedAt: number;
    completedAt?: number;
    result?: unknown;
    error?: string;
    currentNodeId?: string;
}


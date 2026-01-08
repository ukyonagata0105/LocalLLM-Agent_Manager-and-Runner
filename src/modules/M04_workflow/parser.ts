/**
 * M04 Workflow Engine - YAML Parser
 * Parse and serialize workflow YAML definitions.
 */

import YAML from 'yaml';
import { Workflow, WorkflowNode, WorkflowEdge } from './types';

interface YAMLNode {
    id: string;
    type: string;
    label?: string;
    config?: Record<string, unknown>;
    position?: { x: number; y: number };
}

interface YAMLEdge {
    from: string;
    to: string;
    condition?: string;
}

interface WorkflowYAMLFormat {
    name: string;
    description?: string;
    variables?: Record<string, unknown>;
    nodes: YAMLNode[];
    edges: YAMLEdge[];
}

export function parseWorkflowYAML(content: string): Workflow {
    const yaml = YAML.parse(content) as WorkflowYAMLFormat;

    const nodes: WorkflowNode[] = yaml.nodes.map((node: YAMLNode, index: number) => ({
        id: node.id,
        type: node.type,
        position: node.position || { x: 100, y: 100 + index * 100 },
        data: {
            label: node.label || node.id,
            config: node.config,
        },
    }));

    const edges: WorkflowEdge[] = yaml.edges.map((edge: YAMLEdge, index: number) => ({
        id: `edge-${index}`,
        source: edge.from,
        target: edge.to,
        label: edge.condition,
    }));

    return {
        id: crypto.randomUUID(),
        name: yaml.name,
        description: yaml.description,
        version: 1,
        nodes,
        edges,
        variables: yaml.variables || {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
    };
}

export function serializeWorkflowYAML(workflow: Workflow): string {
    const yaml: WorkflowYAMLFormat = {
        name: workflow.name,
        description: workflow.description,
        variables: workflow.variables && Object.keys(workflow.variables).length > 0 ? workflow.variables : undefined,
        nodes: workflow.nodes.map((node) => ({
            id: node.id,
            type: node.type as string,
            label: (node.data as { label?: string })?.label,
            config: (node.data as { config?: Record<string, unknown> })?.config,
            position: node.position,
        })),
        edges: workflow.edges.map((edge) => ({
            from: edge.source,
            to: edge.target,
            condition: edge.label as string | undefined,
        })),
    };

    return YAML.stringify(yaml);
}

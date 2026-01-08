/**
 * Natural Language Workflow Generator
 * Creates n8n workflows from plain text descriptions
 */

import { getN8nClient, N8nWorkflow } from './N8nClient';
import { getLLMManager } from '../M02_llm/LLMManager';

export interface WorkflowTemplate {
    trigger: 'manual' | 'schedule' | 'webhook';
    scheduleExpression?: string;
    steps: WorkflowStep[];
}

export interface WorkflowStep {
    type: 'llm' | 'code' | 'http' | 'file' | 'condition';
    description: string;
    config?: Record<string, unknown>;
}

const WORKFLOW_GENERATION_PROMPT = `You are a workflow automation expert. 
Given a natural language description, generate a JSON workflow template.

Available step types:
- llm: Call LLM for text generation/analysis
- code: Run JavaScript code
- http: Make HTTP request
- file: Read/write files
- condition: Branch based on condition

Output format (JSON only, no markdown):
{
  "name": "workflow name",
  "trigger": "manual" | "schedule",
  "scheduleExpression": "cron expression if schedule",
  "steps": [
    { "type": "stepType", "description": "what this step does", "config": {} }
  ]
}

User request: `;

export class WorkflowGenerator {
    private llm = getLLMManager();

    /**
     * Generate a workflow from natural language description
     */
    async generate(description: string): Promise<{
        success: boolean;
        workflow?: N8nWorkflow;
        template?: WorkflowTemplate;
        error?: string;
    }> {
        try {
            // Step 1: Use LLM to understand the request
            const response = await this.llm.chat({
                messages: [
                    {
                        role: 'user',
                        content: WORKFLOW_GENERATION_PROMPT + description
                    }
                ],
                model: 'gpt-4o',
                temperature: 0.3,
            });

            // Step 2: Parse the LLM response
            const content = response.content;
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('Failed to parse workflow template from LLM response');
            }

            const template = JSON.parse(jsonMatch[0]) as WorkflowTemplate & { name: string };

            // Step 3: Convert to n8n workflow format
            const n8nWorkflow = this.templateToN8n(template);

            // Step 4: Create in n8n
            const client = getN8nClient();
            const created = await client.createWorkflow(n8nWorkflow);

            return {
                success: true,
                workflow: created,
                template,
            };
        } catch (error) {
            return {
                success: false,
                error: String(error),
            };
        }
    }

    /**
     * Convert our template format to n8n workflow format
     */
    private templateToN8n(template: WorkflowTemplate & { name: string }): Partial<N8nWorkflow> {
        const nodes: N8nWorkflow['nodes'] = [];
        const connections: N8nWorkflow['connections'] = {};
        let yPos = 300;

        // Add trigger node
        if (template.trigger === 'schedule' && template.scheduleExpression) {
            nodes.push({
                id: 'trigger',
                name: 'Schedule Trigger',
                type: 'n8n-nodes-base.scheduleTrigger',
                position: [250, yPos],
                parameters: {
                    rule: {
                        interval: [{ field: 'cronExpression', expression: template.scheduleExpression }]
                    }
                },
            });
        } else if (template.trigger === 'webhook') {
            nodes.push({
                id: 'trigger',
                name: 'Webhook',
                type: 'n8n-nodes-base.webhook',
                position: [250, yPos],
                parameters: { path: template.name.toLowerCase().replace(/\s+/g, '-') },
            });
        } else {
            nodes.push({
                id: 'trigger',
                name: 'Manual Trigger',
                type: 'n8n-nodes-base.manualTrigger',
                position: [250, yPos],
                parameters: {},
            });
        }

        // Add step nodes
        let prevNodeName = 'Schedule Trigger';
        if (template.trigger === 'manual') prevNodeName = 'Manual Trigger';
        if (template.trigger === 'webhook') prevNodeName = 'Webhook';

        template.steps.forEach((step, index) => {
            const nodeName = `Step ${index + 1}: ${step.description.substring(0, 30)}`;
            yPos += 150;

            const node = this.createStepNode(step, nodeName, yPos, index);
            nodes.push(node);

            // Connect to previous node
            connections[prevNodeName] = {
                main: [[{ node: nodeName, type: 'main', index: 0 }]],
            };
            prevNodeName = nodeName;
        });

        return {
            name: template.name,
            nodes,
            connections,
            settings: { saveManualExecutions: true },
        };
    }

    private createStepNode(step: WorkflowStep, name: string, yPos: number, index: number) {
        switch (step.type) {
            case 'llm':
                return {
                    id: `step-${index}`,
                    name,
                    type: 'n8n-nodes-base.openAi',
                    position: [450, yPos] as [number, number],
                    parameters: {
                        operation: 'chat',
                        prompt: step.config?.prompt || step.description,
                    },
                };
            case 'http':
                return {
                    id: `step-${index}`,
                    name,
                    type: 'n8n-nodes-base.httpRequest',
                    position: [450, yPos] as [number, number],
                    parameters: {
                        url: step.config?.url || '',
                        method: step.config?.method || 'GET',
                    },
                };
            case 'file':
                return {
                    id: `step-${index}`,
                    name,
                    type: 'n8n-nodes-base.readWriteFile',
                    position: [450, yPos] as [number, number],
                    parameters: {
                        operation: step.config?.operation || 'read',
                        filePath: step.config?.path || '',
                    },
                };
            case 'code':
            default:
                return {
                    id: `step-${index}`,
                    name,
                    type: 'n8n-nodes-base.code',
                    position: [450, yPos] as [number, number],
                    parameters: {
                        jsCode: step.config?.code || `// ${step.description}\nreturn items;`,
                    },
                };
        }
    }

    /**
     * Quick helper: Create workflow from one-liner
     */
    async quickCreate(description: string): Promise<string> {
        const result = await this.generate(description);
        if (!result.success || !result.workflow) {
            throw new Error(result.error || 'Failed to create workflow');
        }
        return `Workflow "${result.workflow.name}" created (ID: ${result.workflow.id})`;
    }
}

// Singleton
let generatorInstance: WorkflowGenerator | null = null;

export function getWorkflowGenerator(): WorkflowGenerator {
    if (!generatorInstance) {
        generatorInstance = new WorkflowGenerator();
    }
    return generatorInstance;
}

/**
 * M04 Workflow Engine - Flow Editor Component
 * React Flow based visual workflow editor.
 */

import React, { useCallback, useMemo, useState, useEffect } from 'react';
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    addEdge,
    useNodesState,
    useEdgesState,
    Connection,
    Node,
    Edge,
    NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useWorkflowStore } from './store';
import { NodeType } from './types';
import { SubAgentNode, PromptNode, IfElseNode, BaseNode } from './nodes';
import { Play, Square, Loader2 } from 'lucide-react';
import { getWorkflowExecutor, ExecutionEvent } from './executor';

// --- Simple Fallback Nodes ---
const StartNode: React.FC<any> = ({ selected }) => (
    <BaseNode label="Start" icon={Play} color="from-green-600 to-emerald-600" selected={selected} outputs={[{ label: 'Start' }]} />
);

const EndNode: React.FC<any> = ({ selected }) => (
    <BaseNode label="End" icon={Square} color="from-red-600 to-orange-600" selected={selected} />
);

const nodeTypes: NodeTypes = {
    [NodeType.SubAgent]: SubAgentNode,
    [NodeType.Prompt]: PromptNode,
    [NodeType.IfElse]: IfElseNode,
    [NodeType.Start]: StartNode,
    [NodeType.End]: EndNode,
    // Add other mappings as needed
};

export const FlowEditor: React.FC = () => {
    const { workflows, activeWorkflowId, addEdge: storeAddEdge, updateNode } = useWorkflowStore();
    const activeWorkflow = workflows.find((w) => w.id === activeWorkflowId);

    // Execution State
    const [isExecuting, setIsExecuting] = useState(false);
    // const [executionId, setExecutionId] = useState<string | null>(null); // Unused for now
    const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
    const [executionLog, setExecutionLog] = useState<string[]>([]);

    // Convert workflow nodes to React Flow format
    const initialNodes: Node[] = useMemo(() => {
        if (!activeWorkflow) return [];
        return activeWorkflow.nodes.map((node) => ({
            id: node.id,
            type: node.type,
            position: node.position,
            data: {
                ...node.data,
                // Inject execution state into data for styling if needed, 
                // though we mainly use selected/style props in regular React Flow
            },
            className: node.id === activeNodeId
                ? 'ring-4 ring-yellow-500 shadow-[0_0_30px_rgba(234,179,8,0.6)] transition-all duration-300 transform scale-105'
                : ''
        }));
    }, [activeWorkflow, activeNodeId]);

    const initialEdges: Edge[] = useMemo(() => {
        if (!activeWorkflow) return [];
        return activeWorkflow.edges.map((edge) => ({
            id: edge.id,
            source: edge.source,
            target: edge.target,
            sourceHandle: edge.sourceHandle,
            targetHandle: edge.targetHandle,
            animated: isExecuting, // Animate edges when running
            style: {
                stroke: isExecuting ? '#eab308' : '#6b7280',
                strokeWidth: isExecuting ? 3 : 2,
                opacity: isExecuting ? 0.8 : 0.5
            },
        }));
    }, [activeWorkflow, isExecuting]);

    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

    // Sync when workflow or execution state changes
    useEffect(() => {
        setNodes(initialNodes);
        setEdges(initialEdges);
    }, [initialNodes, initialEdges, setNodes, setEdges]);

    const handleRunWorkflow = async () => {
        if (!activeWorkflow || isExecuting) return;

        setIsExecuting(true);
        setExecutionLog(['Starting workflow execution...']);
        setActiveNodeId(null);

        const executor = getWorkflowExecutor();

        // Subscribe to events
        const unsubscribe = executor.onEvent((event: ExecutionEvent) => {
            console.log('[Workflow Event]', event);

            switch (event.type) {
                case 'node_start':
                    setActiveNodeId(event.nodeId || null);
                    setExecutionLog(prev => [...prev, `Node started: ${event.nodeId} `]);
                    break;
                case 'node_complete':
                    setExecutionLog(prev => [...prev, `Node completed: ${event.nodeId} `]);
                    break;
                case 'node_error':
                    setExecutionLog(prev => [...prev, `Error in node ${event.nodeId}: ${(event.data as any)?.error} `]);
                    break;
                case 'complete':
                    setExecutionLog(prev => [...prev, 'Workflow completed successfully.']);
                    setIsExecuting(false);
                    setActiveNodeId(null);
                    break;
                case 'error':
                    setExecutionLog(prev => [...prev, `Workflow failed: ${(event.data as any)?.error} `]);
                    setIsExecuting(false);
                    setActiveNodeId(null);
                    break;
            }
        });

        try {
            await executor.execute(activeWorkflow);
            // setExecutionId(execution.id);
        } catch (error) {
            console.error('Execution failed to start', error);
            setIsExecuting(false);
        } finally {
            // Cleanup listener happens via closure/unsubscribe if we stored it, 
            // but executor.execute awaits completion, so we can unsubscribe here
            unsubscribe();
        }
    };

    const handleStopWorkflow = () => {
        // TODO: Implement cancel in executor
        setIsExecuting(false);
        setActiveNodeId(null);
        setExecutionLog(prev => [...prev, 'Execution stopped by user.']);
    };

    const onConnect = useCallback(
        (params: Connection) => {
            if (!activeWorkflowId || !params.source || !params.target) return;

            const newEdge = {
                id: `e - ${params.source} -${params.target} -${Date.now()} `,
                source: params.source,
                target: params.target,
                sourceHandle: params.sourceHandle || undefined,
                targetHandle: params.targetHandle || undefined,
            };

            storeAddEdge(activeWorkflowId, newEdge);
            setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: '#6b7280', strokeWidth: 2 } }, eds));
        },
        [activeWorkflowId, storeAddEdge, setEdges]
    );

    const onNodeDragStop = useCallback(
        (_event: React.MouseEvent, node: Node) => {
            if (!activeWorkflowId) return;
            updateNode(activeWorkflowId, node.id, { position: node.position });
        },
        [activeWorkflowId, updateNode]
    );

    if (!activeWorkflow) {
        return (
            <div className="h-full flex items-center justify-center text-gray-400">
                Select or create a workflow to begin
            </div>
        );
    }

    return (
        <div className="h-full w-full relative">
            {/* Top Control Bar */}
            <div className="absolute top-4 left-4 right-4 z-40 bg-gray-800/90 backdrop-blur-sm border border-gray-700 rounded-xl p-3 flex items-center justify-between shadow-2xl">
                <div className="flex items-center gap-4">
                    <h2 className="text-white font-semibold pl-2">{activeWorkflow.name}</h2>
                    <div className="h-6 w-[1px] bg-gray-600" />
                    <div className="text-xs text-gray-400 font-mono">
                        {nodes.length} nodes · {edges.length} edges
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {!isExecuting ? (
                        <button
                            onClick={handleRunWorkflow}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium transition-all shadow-lg shadow-green-900/20 active:scale-95"
                        >
                            <Play size={16} fill="currentColor" /> Run Workflow
                        </button>
                    ) : (
                        <button
                            onClick={handleStopWorkflow}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-medium transition-all shadow-lg shadow-red-900/20 animate-pulse"
                        >
                            <Loader2 size={16} className="animate-spin" /> Running...
                        </button>
                    )}
                </div>
            </div>

            {/* Logs Overlay (Bottom Left) - Optional or visible when running */}
            {executionLog.length > 0 && (
                <div className="absolute bottom-4 left-4 z-40 w-80 max-h-60 overflow-y-auto bg-black/80 text-green-400 font-mono text-xs p-4 rounded-lg border border-gray-800 pointer-events-none">
                    {executionLog.slice(-5).map((log, i) => (
                        <div key={i} className="mb-1 last:mb-0 opacity-80 border-l-2 border-green-500/30 pl-2">
                            {log}
                        </div>
                    ))}
                </div>
            )}

            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeDragStop={onNodeDragStop}
                nodeTypes={nodeTypes}
                fitView
                className="bg-gray-900"
                defaultEdgeOptions={{
                    animated: true,
                    style: { stroke: '#6b7280', strokeWidth: 2 },
                }}
            >
                <Background color="#374151" gap={20} />
                <Controls className="bg-gray-800 border-gray-700 text-white fill-white" />
                <MiniMap
                    nodeColor={(n) => {
                        switch (n.type) {
                            case NodeType.SubAgent: return '#2563eb';
                            case NodeType.Prompt: return '#9333ea';
                            case NodeType.IfElse: return '#d97706';
                            case NodeType.Start: return '#16a34a';
                            default: return '#4b5563';
                        }
                    }}
                    maskColor="rgba(0,0,0,0.8)"
                    className="bg-gray-800 border-gray-700"
                />
            </ReactFlow>
        </div>
    );
};

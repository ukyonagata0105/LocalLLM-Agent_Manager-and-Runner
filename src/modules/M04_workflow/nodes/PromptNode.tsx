import React from 'react';
import { MessageSquare, Variable } from 'lucide-react';
import { BaseNode } from './BaseNode';
import { PromptNodeData } from '../types';
import { NodeProps, Node } from '@xyflow/react';

export const PromptNode: React.FC<NodeProps<Node<PromptNodeData>>> = ({ data, selected }) => {
    const variableCount = data.variables ? Object.keys(data.variables).length : 0;

    return (
        <BaseNode
            label={data.label || 'Prompt'}
            icon={MessageSquare}
            color="from-purple-600 to-pink-600"
            selected={selected}
        >
            <div className="text-xs text-gray-300 font-mono bg-gray-800 p-2.5 rounded-lg border border-gray-700/50 mb-2 whitespace-pre-wrap max-h-[80px] overflow-hidden leading-relaxed">
                {data.prompt || 'No prompt defined...'}
            </div>

            {variableCount > 0 && (
                <div className="px-2 py-1.5 rounded bg-purple-500/10 border border-purple-500/20 text-[10px] text-purple-300 flex items-center gap-1.5 w-fit">
                    <Variable size={10} />
                    {variableCount} variables
                </div>
            )}
        </BaseNode>
    );
};

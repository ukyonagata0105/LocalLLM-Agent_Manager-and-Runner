import React from 'react';
import { Bot, Cpu } from 'lucide-react';
import { BaseNode } from './BaseNode';
import { SubAgentData } from '../types';
import { NodeProps, Node } from '@xyflow/react';

export const SubAgentNode: React.FC<NodeProps<Node<SubAgentData>>> = ({ data, selected }) => {
    return (
        <BaseNode
            label={data.label || 'Sub Agent'}
            icon={Bot}
            color="from-blue-600 to-indigo-600"
            selected={selected}
        >
            {data.description && (
                <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                    {data.description}
                </p>
            )}

            <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-800">
                <div className="px-2 py-1 rounded bg-gray-800 border border-gray-700 text-[10px] text-gray-400 flex items-center gap-1.5">
                    <Cpu size={10} />
                    {data.model || 'Default Model'}
                </div>
            </div>
        </BaseNode>
    );
};

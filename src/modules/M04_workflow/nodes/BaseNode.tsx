import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { LucideIcon } from 'lucide-react';

interface BaseNodeProps {
    label: string;
    icon: LucideIcon;
    color: string;
    selected?: boolean;
    children?: React.ReactNode;
    outputs?: { id?: string; label?: string }[];
}

export const BaseNode: React.FC<BaseNodeProps> = ({ label, icon: Icon, color, selected, children, outputs = [] }) => {
    return (
        <div className={`
            min-w-[280px] rounded-xl bg-gray-900 border-2 
            ${selected ? 'border-white shadow-[0_0_15px_rgba(255,255,255,0.3)]' : 'border-gray-700 shadow-xl'} 
            transition-all duration-200 overflow-hidden
        `}>
            {/* Header */}
            <div className={`px-4 py-3 flex items-center gap-3 bg-gradient-to-r ${color}`}>
                <div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm text-white">
                    <Icon size={16} />
                </div>
                <span className="font-semibold text-white text-sm tracking-wide">{label}</span>
            </div>

            {/* Input Handle */}
            <Handle
                type="target"
                position={Position.Top}
                className="!w-3 !h-3 !bg-gray-400 !border-2 !border-gray-900 hover:!bg-white transition-colors"
            />

            {/* Content */}
            <div className="p-4 space-y-3">
                {children}
            </div>

            {/* Output Handles */}
            <div className="absolute bottom-0 w-full flex justify-around opacity-0 group-hover:opacity-100 transition-opacity">
                {outputs.length === 0 ? (
                    <Handle
                        type="source"
                        position={Position.Bottom}
                        className="!w-3 !h-3 !bg-gray-400 !border-2 !border-gray-900 hover:!bg-white transition-colors"
                    />
                ) : (
                    outputs.map((output, i) => (
                        <div key={i} className="relative group/handle">
                            <Handle
                                id={output.id}
                                type="source"
                                position={Position.Bottom}
                                className="!relative !transform-none !left-0 !w-3 !h-3 !bg-gray-400 !border-2 !border-gray-900 hover:!bg-white transition-colors"
                            />
                            {output.label && (
                                <span className="absolute top-4 left-1/2 -translate-x-1/2 text-[10px] text-gray-500 whitespace-nowrap opacity-0 group-hover/handle:opacity-100 transition-opacity">
                                    {output.label}
                                </span>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

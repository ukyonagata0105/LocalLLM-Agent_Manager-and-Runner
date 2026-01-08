import { GitBranch } from 'lucide-react';
import { IfElseNodeData } from '../types';
import { NodeProps, Handle, Position, Node } from '@xyflow/react';

export const IfElseNode: React.FC<NodeProps<Node<IfElseNodeData>>> = ({ data, selected }) => {
    return (
        <div className={`
            min-w-[240px] rounded-xl bg-gray-900 border-2 
            ${selected ? 'border-white shadow-[0_0_15px_rgba(255,255,255,0.3)]' : 'border-gray-700 shadow-xl'} 
            transition-all duration-200 overflow-hidden
        `}>
            {/* Custom header for branching logic */}
            <div className="px-4 py-3 flex items-center gap-3 bg-gradient-to-r from-amber-600 to-orange-600">
                <div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm text-white">
                    <GitBranch size={16} />
                </div>
                <span className="font-semibold text-white text-sm tracking-wide">{data.label || 'Condition'}</span>
            </div>

            <Handle
                type="target"
                position={Position.Top}
                className="!w-3 !h-3 !bg-gray-400 !border-2 !border-gray-900 hover:!bg-white transition-colors"
            />

            <div className="p-4 bg-gray-900">
                <div className="text-sm text-center text-gray-300 font-medium py-2 px-3 bg-gray-800 rounded-lg border border-gray-700 mb-4">
                    {data.evaluationTarget || 'Check condition...'}
                </div>

                <div className="flex justify-between items-center gap-4">
                    <div className="relative flex-1 group">
                        <div className="text-xs text-emerald-400 mb-1 font-semibold text-center uppercase tracking-wider">True</div>
                        <div className="h-1 bg-gradient-to-r from-emerald-500/0 to-emerald-500 rounded-full" />
                        <Handle
                            id="true"
                            type="source"
                            position={Position.Bottom}
                            style={{ left: '50%' }}
                            className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-gray-900 hover:!bg-white transition-colors"
                        />
                    </div>
                    <div className="w-[1px] h-8 bg-gray-800" />
                    <div className="relative flex-1 group">
                        <div className="text-xs text-red-400 mb-1 font-semibold text-center uppercase tracking-wider">False</div>
                        <div className="h-1 bg-gradient-to-r from-red-500 to-red-500/0 rounded-full" />
                        <Handle
                            id="false"
                            type="source"
                            position={Position.Bottom}
                            style={{ left: '50%' }}
                            className="!w-3 !h-3 !bg-red-500 !border-2 !border-gray-900 hover:!bg-white transition-colors"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

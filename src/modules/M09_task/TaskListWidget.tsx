/**
 * M09 Task Management - Task List Widget
 * Compact list view for dashboard widget.
 */

import React from 'react';
import { Check } from 'lucide-react';
import { useTaskStore } from './store';
import { Task } from './types';

interface TaskItemProps {
    task: Task;
    onToggle: () => void;
}

const TaskItem: React.FC<TaskItemProps> = ({ task, onToggle }) => {
    const isDone = task.status === 'done';

    return (
        <div className="flex items-center gap-3 py-2 px-1 hover:bg-gray-700/50 rounded cursor-pointer group">
            <button
                onClick={onToggle}
                className={`
          w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors
          ${isDone
                        ? 'bg-green-600 border-green-600'
                        : 'border-gray-500 hover:border-blue-500'
                    }
        `}
            >
                {isDone && <Check size={12} className="text-white" />}
            </button>
            <span className={`flex-1 text-sm ${isDone ? 'line-through text-gray-500' : ''}`}>
                {task.title}
            </span>
            {task.priority === 'high' || task.priority === 'urgent' ? (
                <span className="text-xs text-orange-400">!</span>
            ) : null}
        </div>
    );
};

export const TaskListWidget: React.FC = () => {
    const { taskLists, activeListId, setTaskStatus } = useTaskStore();
    const activeList = taskLists.find((l) => l.id === activeListId);

    if (!activeList) {
        return <div className="text-gray-400 text-sm">No tasks</div>;
    }

    const pendingTasks = activeList.tasks.filter((t) => t.status !== 'done');
    const completedTasks = activeList.tasks.filter((t) => t.status === 'done');

    const handleToggle = (task: Task) => {
        const newStatus = task.status === 'done' ? 'todo' : 'done';
        setTaskStatus(activeList.id, task.id, newStatus);
    };

    return (
        <div className="space-y-2">
            {pendingTasks.length === 0 && completedTasks.length === 0 ? (
                <div className="text-gray-400 text-sm text-center py-4">
                    No tasks yet
                </div>
            ) : (
                <>
                    {pendingTasks.map((task) => (
                        <TaskItem
                            key={task.id}
                            task={task}
                            onToggle={() => handleToggle(task)}
                        />
                    ))}
                    {completedTasks.length > 0 && (
                        <div className="pt-2 border-t border-gray-700">
                            <div className="text-xs text-gray-500 mb-2">
                                Completed ({completedTasks.length})
                            </div>
                            {completedTasks.slice(0, 3).map((task) => (
                                <TaskItem
                                    key={task.id}
                                    task={task}
                                    onToggle={() => handleToggle(task)}
                                />
                            ))}
                            {completedTasks.length > 3 && (
                                <div className="text-xs text-gray-500 text-center py-1">
                                    +{completedTasks.length - 3} more
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

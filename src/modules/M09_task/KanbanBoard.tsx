/**
 * M09 Task Management - Kanban Board Component
 * Premium Kanban board with modern design and proper modals.
 */

import React, { useState, useEffect } from 'react';
import { Plus, GripVertical, Check, Clock, AlertCircle, X, Trash2, FileText, Layout } from 'lucide-react';
import { useTaskStore } from './store';
import { Task, TaskStatus, TaskPriority } from './types';

const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
    todo: { label: 'To Do', color: 'border-amber-500', bgColor: 'from-amber-500/10 to-amber-600/5', icon: <AlertCircle size={14} /> },
    in_progress: { label: 'In Progress', color: 'border-blue-500', bgColor: 'from-blue-500/10 to-blue-600/5', icon: <Clock size={14} /> },
    done: { label: 'Done', color: 'border-emerald-500', bgColor: 'from-emerald-500/10 to-emerald-600/5', icon: <Check size={14} /> },
    blocked: { label: 'Blocked', color: 'border-red-500', bgColor: 'from-red-500/10 to-red-600/5', icon: <AlertCircle size={14} /> },
};

const PRIORITY_COLORS: Record<string, string> = {
    low: 'bg-gray-500',
    medium: 'bg-blue-500',
    high: 'bg-orange-500',
    urgent: 'bg-red-500',
};

// --- Helper for basic Markdown Preview ---
const SimpleMarkdownPreview: React.FC<{ content: string }> = ({ content }) => {
    if (!content) return <p className="text-gray-500 italic">No description provided.</p>;

    // Very basic unsafe parser for demo purposes. In production use react-markdown.
    const lines = content.split('\n');
    return (
        <div className="space-y-2 text-sm text-gray-300">
            {lines.map((line, i) => {
                if (line.startsWith('# ')) return <h1 key={i} className="text-xl font-bold text-white mt-4 first:mt-0">{line.slice(2)}</h1>;
                if (line.startsWith('## ')) return <h2 key={i} className="text-lg font-bold text-white mt-3">{line.slice(3)}</h2>;
                if (line.startsWith('### ')) return <h3 key={i} className="text-md font-bold text-white mt-2">{line.slice(4)}</h3>;
                if (line.startsWith('- [ ]')) return <div key={i} className="flex gap-2 items-center"><div className="w-4 h-4 border border-gray-600 rounded" /> <span>{line.slice(5)}</span></div>;
                if (line.startsWith('- [x]')) return <div key={i} className="flex gap-2 items-center"><div className="w-4 h-4 border border-blue-500 bg-blue-500/20 rounded flex items-center justify-center text-xs text-blue-500">✓</div> <span className="line-through text-gray-500">{line.slice(5)}</span></div>;
                if (line.startsWith('- ')) return <li key={i} className="ml-4 list-disc">{line.slice(2)}</li>;
                if (line.startsWith('```')) return <div key={i} className="bg-gray-950 p-2 rounded font-mono text-xs my-1 text-gray-400">Code block (preview limited)</div>;
                return <p key={i} className="min-h-[1em]">{line}</p>;
            })}
        </div>
    );
};

interface AddTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (title: string) => void;
    status: TaskStatus;
}

const AddTaskModal: React.FC<AddTaskModalProps> = ({ isOpen, onClose, onSubmit, status }) => {
    const [title, setTitle] = useState('');

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (title.trim()) {
            onSubmit(title.trim());
            setTitle('');
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-md border border-gray-700 shadow-2xl animate-fade-in">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-white">Add New Task</h2>
                    <button onClick={onClose} className="p-1 hover:bg-gray-700 rounded-lg transition-colors">
                        <X size={20} className="text-gray-400" />
                    </button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-sm text-gray-400 mb-2">Task Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Enter task title..."
                            className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            autoFocus
                        />
                    </div>
                    <div className="mb-4">
                        <span className="text-sm text-gray-400">Status: </span>
                        <span className={`text-sm px-2 py-1 rounded ${STATUS_CONFIG[status].color.replace('border', 'bg').replace('-500', '-500/20')} text-white`}>
                            {STATUS_CONFIG[status].label}
                        </span>
                    </div>
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 bg-gray-700 rounded-xl font-medium hover:bg-gray-600 transition-colors text-white"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl font-medium hover:from-blue-500 hover:to-blue-600 transition-all shadow-lg shadow-blue-500/20 text-white"
                        >
                            Add Task
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

interface TaskDetailModalProps {
    task: Task | null;
    onClose: () => void;
    onSave: (taskId: string, updates: Partial<Task>) => void;
    onDelete: (taskId: string) => void;
}

const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ task, onClose, onSave, onDelete }) => {
    const [tab, setTab] = useState<'write' | 'preview'>('write');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState<TaskPriority>('medium');
    const [status, setStatus] = useState<TaskStatus>('todo');

    useEffect(() => {
        if (task) {
            setTitle(task.title);
            setDescription(task.description || '');
            setPriority(task.priority);
            setStatus(task.status);
        }
    }, [task]);

    if (!task) return null;

    const handleSave = () => {
        onSave(task.id, {
            title,
            description,
            priority,
            status,
        });
        onClose();
    };

    const handleDelete = () => {
        if (confirm('Are you sure you want to delete this task?')) {
            onDelete(task.id);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-gray-800 rounded-2xl w-full max-w-4xl h-[85vh] border border-gray-700 shadow-2xl animate-fade-in flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-700">
                    <div className="flex items-center gap-3 flex-1">
                        <Layout className="text-gray-400" size={20} />
                        <input
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            className="bg-transparent border-none text-xl font-bold text-white focus:outline-none focus:ring-0 w-full"
                            placeholder="Task Title"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={handleDelete} className="p-2 hover:bg-red-500/10 text-gray-400 hover:text-red-400 rounded-lg transition-colors">
                            <Trash2 size={20} />
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-gray-700 rounded-lg transition-colors text-gray-400">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* Main Content (Description) */}
                    <div className="flex-1 flex flex-col border-r border-gray-700 p-6 overflow-hidden">
                        <div className="flex items-center gap-4 mb-4 border-b border-gray-700/50 pb-2">
                            <h3 className="font-semibold text-gray-300 flex items-center gap-2">
                                <FileText size={18} /> Description
                            </h3>
                            <div className="flex bg-gray-900 rounded-lg p-1">
                                <button
                                    onClick={() => setTab('write')}
                                    className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${tab === 'write' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-gray-300'}`}
                                >
                                    Write
                                </button>
                                <button
                                    onClick={() => setTab('preview')}
                                    className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${tab === 'preview' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-gray-300'}`}
                                >
                                    Preview
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-auto">
                            {tab === 'write' ? (
                                <textarea
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    placeholder="Add a more detailed description..."
                                    className="w-full h-full bg-transparent resize-none text-gray-300 placeholder-gray-600 focus:outline-none font-mono text-sm leading-relaxed"
                                />
                            ) : (
                                <div className="prose prose-invert max-w-none">
                                    <SimpleMarkdownPreview content={description} />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Sidebar (Meta) */}
                    <div className="w-80 p-6 flex flex-col gap-6 overflow-y-auto bg-gray-800/50">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Status</label>
                            <div className="space-y-2">
                                {(Object.entries(STATUS_CONFIG) as [TaskStatus, typeof STATUS_CONFIG[TaskStatus]][]).map(([s, config]) => (
                                    <div
                                        key={s}
                                        onClick={() => setStatus(s)}
                                        className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors border ${status === s ? config.color + ' bg-gray-700' : 'border-transparent hover:bg-gray-700/50'}`}
                                    >
                                        <div className={`p-1 rounded-full ${status === s ? 'text-white' : 'text-gray-400'}`}>
                                            {config.icon}
                                        </div>
                                        <span className={`text-sm ${status === s ? 'text-white font-medium' : 'text-gray-400'}`}>{config.label}</span>
                                        {status === s && <Check size={14} className="ml-auto text-white" />}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Priority</label>
                            <div className="grid grid-cols-2 gap-2">
                                {(['low', 'medium', 'high', 'urgent'] as TaskPriority[]).map((p) => (
                                    <button
                                        key={p}
                                        onClick={() => setPriority(p)}
                                        className={`px-3 py-1.5 rounded-lg text-sm capitalize border ${priority === p ? 'border-gray-500 bg-gray-700 text-white' : 'border-gray-700 text-gray-400 hover:bg-gray-700/50'}`}
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            {/* Tags placeholder - functional but basic */}
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Tags</label>
                            <div className="flex flex-wrap gap-2 text-sm text-gray-400 italic">
                                #agent #ui #feature
                            </div>
                        </div>

                        <div className="mt-auto pt-6 border-t border-gray-700">
                            <button
                                onClick={handleSave}
                                className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl font-medium hover:from-blue-500 hover:to-blue-600 transition-all text-white shadow-lg shadow-blue-500/20"
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

interface TaskCardProps {
    task: Task;
    onStatusChange: (status: TaskStatus) => void;
    onDelete: (taskId: string) => void;
    onClick: (task: Task) => void;
}

// ... imports ...

const TaskCard: React.FC<TaskCardProps> = ({ task, onStatusChange, onDelete, onClick }) => {
    return (
        <article
            data-testid={`task-card-${task.id}`}
            onClick={() => onClick(task)}
            className="bg-gray-800/80 backdrop-blur-sm rounded-xl p-4 group hover:bg-gray-700/80 cursor-pointer border border-gray-700/50 transition-all hover:shadow-lg hover:shadow-black/20"
        >
            <div className="flex items-start gap-3">
                <GripVertical size={14} className="text-gray-600 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                        <span className={`w-2 h-2 rounded-full ${PRIORITY_COLORS[task.priority]}`} aria-label={`Priority: ${task.priority}`} />
                        <h4 className={`text-sm font-medium ${task.status === 'done' ? 'line-through text-gray-500' : 'text-white'}`}>
                            {task.title}
                        </h4>
                    </div>
                    {task.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2" aria-label="Tags">
                            {task.tags.map((tag) => (
                                <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-gray-700/50 text-gray-400">
                                    #{tag}
                                </span>
                            ))}
                        </div>
                    )}
                    <div className="flex items-center justify-between mt-3">
                        {task.status !== 'done' && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onStatusChange('done');
                                }}
                                aria-label="Mark task as done"
                                className="text-xs text-gray-400 hover:text-emerald-400 flex items-center gap-1.5 transition-colors"
                            >
                                <Check size={12} /> Mark done
                            </button>
                        )}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete(task.id);
                            }}
                            aria-label="Delete task"
                            className="text-xs text-gray-400 hover:text-red-400 flex items-center gap-1.5 transition-colors ml-auto"
                        >
                            <Trash2 size={12} /> Delete
                        </button>
                    </div>
                </div>
            </div>
        </article>
    );
};

interface KanbanColumnProps {
    status: TaskStatus;
    tasks: Task[];
    onStatusChange: (taskId: string, status: TaskStatus) => void;
    onDelete: (taskId: string) => void;
    onAddTask: () => void;
    onTaskClick: (task: Task) => void;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({ status, tasks, onStatusChange, onDelete, onAddTask, onTaskClick }) => {
    const config = STATUS_CONFIG[status];

    return (
        <section
            className={`flex-1 min-w-[280px] bg-gradient-to-b ${config.bgColor} rounded-2xl p-4 border-t-2 ${config.color}`}
            aria-label={`${config.label} column`}
        >
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <span className="text-gray-400" aria-hidden="true">{config.icon}</span>
                    <h3 className="font-semibold text-white">{config.label}</h3>
                    <span className="text-xs text-gray-400 bg-gray-700/50 px-2 py-0.5 rounded-full" aria-label={`${tasks.length} tasks`}>
                        {tasks.length}
                    </span>
                </div>
                <button
                    onClick={onAddTask}
                    aria-label={`Add task to ${config.label}`}
                    className="p-1.5 hover:bg-gray-700/50 rounded-lg transition-colors text-gray-400 hover:text-white"
                >
                    <Plus size={16} />
                </button>
            </div>
            <div className="space-y-3" role="list">
                {tasks.map((task) => (
                    <TaskCard
                        key={task.id}
                        task={task}
                        onStatusChange={(newStatus) => onStatusChange(task.id, newStatus)}
                        onDelete={onDelete}
                        onClick={onTaskClick}
                    />
                ))}
                {tasks.length === 0 && (
                    <div className="text-center py-8 text-gray-500 text-sm">
                        No tasks
                    </div>
                )}
            </div>
        </section>
    );
};

export const KanbanBoard: React.FC = () => {
    const { taskLists, activeListId, setTaskStatus, createTask, deleteTask, updateTask } = useTaskStore();
    const activeList = taskLists.find((l) => l.id === activeListId);

    // UI State
    const [modalOpen, setModalOpen] = useState(false);
    const [modalStatus, setModalStatus] = useState<TaskStatus>('todo');
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);

    if (!activeList) {
        return (
            <div className="h-full flex items-center justify-center text-gray-400">
                <div className="text-center">
                    <div className="text-4xl mb-4" aria-hidden="true">📋</div>
                    <p>No task list selected</p>
                </div>
            </div>
        );
    }

    const tasksByStatus: Record<TaskStatus, Task[]> = {
        todo: [],
        in_progress: [],
        done: [],
        blocked: [],
    };

    for (const task of activeList.tasks) {
        tasksByStatus[task.status].push(task);
    }

    const handleAddTask = (status: TaskStatus) => {
        setModalStatus(status);
        setModalOpen(true);
    };

    const handleCreateTask = (title: string) => {
        createTask(activeList.id, {
            title,
            status: modalStatus,
            priority: 'medium',
            tags: [],
            dependencies: [],
            description: '',
        });
    };

    const handleUpdateTask = (taskId: string, updates: Partial<Task>) => {
        updateTask(activeList.id, taskId, updates);
    };

    return (
        <>
            <div className="h-full overflow-x-auto bg-gradient-to-br from-gray-900 via-gray-900 to-gray-950">
                <div className="flex gap-4 p-6 min-w-max">
                    {(['todo', 'in_progress', 'done', 'blocked'] as TaskStatus[]).map((status) => (
                        <KanbanColumn
                            key={status}
                            status={status}
                            tasks={tasksByStatus[status]}
                            onStatusChange={(taskId, newStatus) =>
                                setTaskStatus(activeList.id, taskId, newStatus)
                            }
                            onDelete={(taskId) => deleteTask(activeList.id, taskId)}
                            onAddTask={() => handleAddTask(status)}
                            onTaskClick={setSelectedTask}
                        />
                    ))}
                </div>
            </div>
            <AddTaskModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSubmit={handleCreateTask}
                status={modalStatus}
            />
            {selectedTask && (
                <TaskDetailModal
                    task={selectedTask}
                    onClose={() => setSelectedTask(null)}
                    onSave={handleUpdateTask}
                    onDelete={(taskId) => deleteTask(activeList.id, taskId)}
                />
            )}
        </>
    );
};

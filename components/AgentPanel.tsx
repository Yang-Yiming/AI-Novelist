
import React, { useState, useEffect, useRef } from 'react';
import { AgentState, AgentLogEntry } from '../types';
import LoadingSpinner from './LoadingSpinner';
import { SparklesIcon } from './icons';

interface AgentPanelProps {
    isOpen: boolean;
    onClose: () => void;
    onRunAgent: (task: string) => void;
    agentState: AgentState;
    disabled: boolean;
}

const AgentPanel: React.FC<AgentPanelProps> = ({ isOpen, onClose, onRunAgent, agentState, disabled }) => {
    const [task, setTask] = useState('');
    const logsEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [agentState.logs]);

    if (!isOpen) return null;

    const handleRun = () => {
        if (task.trim()) {
            onRunAgent(task);
        }
    };

    const renderLogContent = (log: AgentLogEntry) => {
        if (typeof log.content === 'string') {
            return <p className="whitespace-pre-wrap">{log.content}</p>;
        }
        if (typeof log.content === 'object' && log.content !== null) {
            return (
                <pre className="bg-gray-100 dark:bg-slate-900 p-2 rounded-md text-xs overflow-x-auto">
                    <code>{JSON.stringify(log.content, null, 2)}</code>
                </pre>
            );
        }
        return null;
    };

    const getLogStyle = (type: AgentLogEntry['type']) => {
        switch (type) {
            case 'thought': return { icon: '🤔', color: 'text-gray-500 dark:text-gray-400', title: 'Thought' };
            case 'action': return { icon: '⚙️', color: 'text-blue-600 dark:text-blue-400', title: 'Action' };
            case 'result': return { icon: '✅', color: 'text-green-600 dark:text-green-400', title: 'Result' };
            case 'error': return { icon: '❌', color: 'text-red-600 dark:text-red-400', title: 'Error' };
            case 'finish': return { icon: '🎉', color: 'text-indigo-600 dark:text-indigo-400', title: 'Finished' };
            default: return { icon: '📝', color: 'text-gray-800 dark:text-gray-200', title: 'Log' };
        }
    }

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center" 
            onClick={agentState.isRunning ? undefined : onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="agent-panel-title"
        >
            <div 
                className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl p-6 flex flex-col max-h-[90vh]" 
                onClick={(e) => e.stopPropagation()}
            >
                <h2 id="agent-panel-title" className="text-2xl font-bold text-gray-900 dark:text-white mb-4">AI Agent</h2>
                
                <div className="flex-grow overflow-y-auto pr-2 mb-4 border-t border-b border-gray-200 dark:border-gray-700 py-4">
                    <div className="space-y-4">
                        {agentState.logs.length === 0 && (
                            <p className="text-gray-500 dark:text-gray-400 text-center">The agent's thoughts and actions will appear here.</p>
                        )}
                        {agentState.logs.map((log, index) => {
                            const { icon, color, title } = getLogStyle(log.type);
                            return (
                                <div key={index} className="flex gap-3">
                                    <div className="text-lg">{icon}</div>
                                    <div className="flex-1">
                                        <p className={`font-bold text-sm ${color}`}>{title}</p>
                                        <div className="text-sm text-gray-800 dark:text-gray-200 mt-1">{renderLogContent(log)}</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div ref={logsEndRef} />
                </div>

                <div className='mt-auto'>
                    <label htmlFor="agent-task" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Agent Task
                    </label>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                        Give the agent a high-level task to perform on your novel.
                    </p>
                    <textarea
                        id="agent-task"
                        rows={3}
                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600"
                        placeholder="e.g., 'The antagonist feels weak. Rework their motivation and revise Chapter 3 to show their cruelty.'"
                        value={task}
                        onChange={(e) => setTask(e.target.value)}
                        disabled={agentState.isRunning}
                    />
                </div>

                <div className="flex justify-end gap-4 mt-4">
                    <button
                        onClick={onClose}
                        disabled={agentState.isRunning}
                        className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 disabled:opacity-50"
                    >
                        Close
                    </button>
                    <button
                        onClick={handleRun}
                        disabled={!task.trim() || agentState.isRunning || disabled}
                        className="px-4 py-2 flex items-center gap-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-indigo-400"
                    >
                        {agentState.isRunning ? <><LoadingSpinner size="h-5 w-5"/> Running...</> : <><SparklesIcon /> Run Agent</>}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AgentPanel;

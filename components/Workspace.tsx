
import React, { useState, useEffect, useRef } from 'react';
import { marked } from 'marked';
import { AppState, Chapter, ActiveTasks, Plan } from '../types';
import LoadingSpinner from './LoadingSpinner';
import ManuscriptToolbar from './ManuscriptToolbar';
import { SparklesIcon, CodeBracketIcon, DocumentTextIcon } from './icons';

interface WorkspaceProps {
    appState: AppState;
    isPlanLoading: boolean;
    loadingMessage: string;
    initialIdea: string;
    onInitialIdeaChange: (value: string) => void;
    onGeneratePlan: () => void;
    plan: Plan | null;
    chapters: Chapter[];
    activeChapterId: number | null;
    onActiveChapterChange: (id: number) => void;
    onChapterContentChange: (index: number, content: string) => void;
    onWriteChapter: (userPrompt: string) => void;
    onCheckChapter: (index: number) => void;
    onReviseChapter: (index: number, prompt: string) => void;
    onRegenerateChapter: (index: number) => void;
    onSyncPlanWithChapter: (index: number) => void;
    onOpenAgentPanel: () => void;
    isPlanReady: boolean;
    activeTasks: ActiveTasks;
}

const Workspace: React.FC<WorkspaceProps> = ({
    appState,
    isPlanLoading,
    loadingMessage,
    initialIdea,
    onInitialIdeaChange,
    onGeneratePlan,
    plan,
    chapters,
    activeChapterId,
    onActiveChapterChange,
    onChapterContentChange,
    onWriteChapter,
    onCheckChapter,
    onReviseChapter,
    onRegenerateChapter,
    onSyncPlanWithChapter,
    onOpenAgentPanel,
    isPlanReady,
    activeTasks,
}) => {
    const [viewModes, setViewModes] = useState<Record<number, 'text' | 'markdown'>>({});
    const activeChapterTextareaRef = useRef<HTMLTextAreaElement | null>(null);

    const activeChapterIndex = activeChapterId !== null ? chapters.findIndex(c => c.id === activeChapterId) : -1;
    const activeChapter = activeChapterIndex !== -1 ? chapters[activeChapterIndex] : null;

    const resizeTextarea = (textarea: HTMLTextAreaElement | null) => {
        if (textarea) {
            textarea.style.height = 'auto'; // Reset height
            textarea.style.height = `${textarea.scrollHeight}px`; // Set to scroll height
        }
    };

    // Effect to resize textarea when switching chapters
    useEffect(() => {
        resizeTextarea(activeChapterTextareaRef.current);
    }, [activeChapterId]);

    const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        // Resize immediately on input to avoid cursor jumps
        resizeTextarea(e.currentTarget);
        // Then, update the application state
        if (activeChapterIndex !== -1) {
            onChapterContentChange(activeChapterIndex, e.target.value);
        }
    };

    const handleToggleViewMode = (chapterId: number, mode: 'text' | 'markdown') => {
        setViewModes(prev => ({
            ...prev,
            [chapterId]: mode,
        }));
    };
    
    const handleNavigateChapter = (direction: 'prev' | 'next') => {
        if (activeChapterId === null && chapters.length > 0) {
            onActiveChapterChange(chapters[0].id);
            return;
        }
        if (activeChapterId === null) return;

        const currentIndex = chapters.findIndex(c => c.id === activeChapterId);
        if (currentIndex === -1) return;

        let nextIndex;
        if (direction === 'prev') {
            nextIndex = Math.max(0, currentIndex - 1);
        } else {
            nextIndex = Math.min(chapters.length - 1, currentIndex + 1);
        }
        const nextChapterId = chapters[nextIndex].id;
        onActiveChapterChange(nextChapterId);
    };

    const handleChapterAction = <T extends any[]>(action: (index: number, ...args: T) => void, ...args: T) => {
        if (activeChapterId !== null) {
            const chapterIndex = chapters.findIndex(c => c.id === activeChapterId);
            if (chapterIndex !== -1) {
                action(chapterIndex, ...args);
            }
        }
    };
    
    const handleExportChapter = () => {
        if (activeChapterId === null) return;
        const chapter = chapters.find(c => c.id === activeChapterId);
        if (!chapter) return;

        const content = chapter.content;
        const title = chapter.title;
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const sanitizedTitle = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        a.download = `${sanitizedTitle || 'chapter'}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };


    if (isPlanLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center">
                <LoadingSpinner />
                <p className="text-lg mt-4 text-indigo-500 dark:text-indigo-400 font-semibold">{loadingMessage}</p>
            </div>
        );
    }

    const isAnyTaskActive = Object.values(activeTasks).some(v => typeof v === 'boolean' ? v : Object.keys(v).length > 0);

    const renderContent = () => {
        switch (appState) {
            case 'INITIAL':
            case 'ERROR':
                return (
                    <div className="max-w-2xl mx-auto text-center p-8 bg-white dark:bg-slate-800/50 rounded-lg shadow-lg">
                        <h2 className="text-2xl font-bold mb-4">Let's start your story.</h2>
                        <p className="text-gray-600 dark:text-gray-300 mb-6">Describe your novel idea, a character, a scene, or a simple premise. The AI Planner will use this to build the foundation of your world.</p>
                        <textarea
                            className="w-full h-32 p-3 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-slate-900 dark:border-gray-600"
                            placeholder="e.g., A detective in a steampunk city powered by captured lightning..."
                            value={initialIdea}
                            onChange={(e) => onInitialIdeaChange(e.target.value)}
                        />
                        <button
                            onClick={onGeneratePlan}
                            disabled={!initialIdea.trim()}
                            className="mt-4 w-full flex justify-center items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-transform transform hover:scale-105"
                        >
                            <SparklesIcon /> Generate Plan
                        </button>
                    </div>
                );
            case 'PLANNING':
            case 'WRITING':
                const viewMode = activeChapter ? (viewModes[activeChapter.id] || 'text') : 'text';

                return (
                    <>
                        <div className="max-w-4xl mx-auto pb-48 flex flex-col min-h-full w-full">
                            {chapters.length === 0 && !activeTasks.writingChapter && (
                                <div className="text-center p-8 m-auto bg-white dark:bg-slate-800/50 rounded-lg shadow-md">
                                    <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-200">Your Manuscript Awaits</h3>
                                    <p className="mt-2 text-gray-500 dark:text-gray-400">The plan is ready. Click the "Write Chapter" button to begin bringing your story to life.</p>
                                </div>
                            )}

                            {activeChapter ? (
                                <div key={activeChapter.id} id={`chapter-${activeChapter.id}`} className="pt-10 flex-grow flex flex-col">
                                     <div className="flex justify-between items-center mb-6 border-b border-gray-300 dark:border-gray-700 pb-2">
                                        <h2 className="text-3xl font-bold text-gray-800 dark:text-white">{activeChapter.title}</h2>
                                        <div className="flex items-center gap-1 p-1 bg-gray-200 dark:bg-slate-800 rounded-lg">
                                            <button
                                                onClick={() => handleToggleViewMode(activeChapter.id, 'text')}
                                                className={`p-2 rounded-md transition-colors ${viewMode === 'text' ? 'bg-white dark:bg-slate-700 shadow' : 'hover:bg-gray-300/50 dark:hover:bg-slate-700/50'}`}
                                                aria-label="View raw text"
                                                title="View raw text"
                                            >
                                                <CodeBracketIcon />
                                            </button>
                                            <button
                                                onClick={() => handleToggleViewMode(activeChapter.id, 'markdown')}
                                                className={`p-2 rounded-md transition-colors ${viewMode === 'markdown' ? 'bg-white dark:bg-slate-700 shadow' : 'hover:bg-gray-300/50 dark:hover:bg-slate-700/50'}`}
                                                aria-label="View rendered markdown"
                                                title="View rendered markdown"
                                            >
                                                <DocumentTextIcon />
                                            </button>
                                        </div>
                                     </div>

                                    {viewMode === 'text' ? (
                                        <textarea
                                            ref={activeChapterTextareaRef}
                                            className="w-full max-w-none flex-grow p-2 font-serif leading-relaxed bg-transparent resize-none border-0 focus:ring-0 disabled:opacity-70 text-gray-900 dark:text-gray-300"
                                            style={{ fontSize: 'var(--markdown-font-size)' }}
                                            value={activeChapter.content}
                                            onChange={handleContentChange}
                                            disabled={isAnyTaskActive}
                                            rows={1}
                                        />
                                    ) : (
                                        <div
                                            className="prose dark:prose-invert font-serif leading-relaxed p-2 max-w-none prose-dynamic"
                                            dangerouslySetInnerHTML={{ __html: marked(activeChapter.content) as string }}
                                        />
                                    )}

                                     {activeChapter.feedback && (
                                        <div className="mt-4 bg-gray-100 dark:bg-slate-900/50 p-4 rounded-lg border border-gray-200 dark:border-slate-700">
                                            <div className="flex justify-between items-center mb-2">
                                                <h4 className="font-bold text-lg text-gray-800 dark:text-gray-200">Checker's Feedback</h4>
                                                <span className={`px-3 py-1 text-sm font-semibold rounded-full ${
                                                    activeChapter.feedback.verdict === 'Approved' 
                                                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                                                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                                }`}>
                                                    {activeChapter.feedback.verdict}
                                                </span>
                                            </div>
                                            <p className="italic text-gray-600 dark:text-gray-400 mb-3">"{activeChapter.feedback.thoughts.overallImpression}"</p>
                                            <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 dark:text-gray-300">
                                                {activeChapter.feedback.thoughts.detailedFeedback.map((fb, i) => (
                                                    <li key={i}>{fb}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            ) : (chapters.length > 0 && !activeChapter) && (
                                <div className="text-center p-8 m-auto bg-white dark:bg-slate-800/50 rounded-lg shadow-md">
                                    <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-200">Select a Chapter</h3>
                                    <p className="mt-2 text-gray-500 dark:text-gray-400">Use the toolbar below to navigate your manuscript.</p>
                                </div>
                            )
                        }
                        </div>
                        <ManuscriptToolbar
                            plan={plan}
                            chapters={chapters}
                            activeChapterId={activeChapterId}
                            onWriteChapter={onWriteChapter}
                            onExportChapter={handleExportChapter}
                            onChapterSelect={onActiveChapterChange}
                            onNavigateChapter={handleNavigateChapter}
                            onCheckChapter={() => handleChapterAction(onCheckChapter)}
                            onReviseChapter={(prompt: string) => handleChapterAction(onReviseChapter, prompt)}
                            onRegenerateChapter={() => handleChapterAction(onRegenerateChapter)}
                            onSyncPlanWithChapter={() => handleChapterAction(onSyncPlanWithChapter)}
                            onOpenAgentPanel={onOpenAgentPanel}
                            isPlanReady={isPlanReady}
                            activeTasks={activeTasks}
                        />
                    </>
                );
        }
    };
    
    return <div className="flex-grow flex flex-col">{renderContent()}</div>;
};

export default Workspace;

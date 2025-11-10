
import React, { useState, useRef, useEffect } from 'react';
import { Chapter, ActiveTasks, Plan, WorldSettings } from '../types';
import { BookOpenIcon, DownloadIcon, SparklesIcon, CheckBadgeIcon, SyncIcon, RefreshIcon, MagicWandIcon } from './icons';
import LoadingSpinner from './LoadingSpinner';

interface ManuscriptToolbarProps {
    plan: Plan | null,
    chapters: Chapter[];
    activeChapterId: number | null;
    onWriteChapter: (prompt: string) => void;
    onExportChapter: () => void;
    onChapterSelect: (id: number) => void;
    onNavigateChapter: (direction: 'prev' | 'next') => void;
    onCheckChapter: () => void;
    onReviseChapter: (prompt: string) => void;
    onRegenerateChapter: () => void;
    onSyncPlanWithChapter: () => void;
    onOpenAgentPanel: () => void;
    isPlanReady: boolean;
    activeTasks: ActiveTasks;
}

const PaperAirplaneIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
    </svg>
);

const ManuscriptToolbar: React.FC<ManuscriptToolbarProps> = ({
    plan, chapters, activeChapterId, onWriteChapter, onExportChapter, onChapterSelect, onNavigateChapter, onCheckChapter, onReviseChapter, onRegenerateChapter, onSyncPlanWithChapter, onOpenAgentPanel, isPlanReady, activeTasks
}) => {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [showRevisionPanel, setShowRevisionPanel] = useState(false);
    const [revisionPrompt, setRevisionPrompt] = useState('');
    const [showWritingPanel, setShowWritingPanel] = useState(false);
    const [writingPrompt, setWritingPrompt] = useState('');

    const dropdownRef = useRef<HTMLDivElement>(null);
    const activeChapterIndex = activeChapterId !== null ? chapters.findIndex(c => c.id === activeChapterId) : -1;

    const isAnyTaskActive = activeTasks.writingChapter || Object.keys(activeTasks.checkingChapter).length > 0 || Object.keys(activeTasks.revisingChapter).length > 0 || Object.keys(activeTasks.syncingPlan).length > 0 || activeTasks.agentIsRunning;
    const isCurrentChecking = activeChapterIndex !== -1 && activeTasks.checkingChapter[activeChapterIndex];
    const isCurrentRevising = activeChapterIndex !== -1 && activeTasks.revisingChapter[activeChapterIndex];
    const isCurrentSyncing = activeChapterIndex !== -1 && activeTasks.syncingPlan[activeChapterIndex];

    const handleChapterClick = (chapterId: number) => {
        onChapterSelect(chapterId);
        setIsDropdownOpen(false);
    };
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const augmentPromptWithContext = (prompt: string): string => {
        if (!plan) return prompt;
    
        const mentionRegex = /@(\w+)\(([^)]+)\)/g;
        let match;
        const contexts = new Set<string>();
    
        while ((match = mentionRegex.exec(prompt)) !== null) {
            const type = match[1].toLowerCase();
            const key = match[2].trim();
    
            switch (type) {
                case 'chapter':
                    const chapterId = parseInt(key, 10);
                    const chapter = chapters.find(c => c.id === chapterId);
                    if (chapter) {
                        contexts.add(`[Reference from Chapter ${chapter.id}: ${chapter.title}]\n${chapter.content.substring(0, 500)}...\n`);
                    }
                    break;
                case 'character':
                    const character = plan.characterSettings.find(c => c.name.toLowerCase() === key.toLowerCase());
                    if (character) {
                        contexts.add(`[Reference for Character: ${character.name}]\nDescription: ${character.description}\nMotivation: ${character.motivation}\n`);
                    }
                    break;
                case 'world':
                    const worldKey = key as keyof WorldSettings;
                    if (plan.worldSettings.hasOwnProperty(worldKey)) {
                        contexts.add(`[Reference from World Settings: ${key}]\n${plan.worldSettings[worldKey]}\n`);
                    }
                    break;
                case 'plot':
                     const plotPoint = plan.plotOutline.find(p => p.title.toLowerCase().includes(key.toLowerCase()));
                     if (plotPoint) {
                        contexts.add(`[Reference from Plot Outline: ${plotPoint.title}]\n${plotPoint.description}\n`);
                     }
                     break;
            }
        }
    
        if (contexts.size === 0) {
            return prompt;
        }
    
        const contextHeader = '--- Begin Referenced Context ---\n';
        const contextFooter = '--- End Referenced Context ---\n\n';
        const fullContext = Array.from(contexts).join('\n');
    
        return `${contextHeader}${fullContext}${contextFooter}${prompt}`;
    };

    const handleRevisionSubmit = () => {
        if (revisionPrompt.trim()) {
            const augmentedPrompt = augmentPromptWithContext(revisionPrompt);
            onReviseChapter(augmentedPrompt);
            setShowRevisionPanel(false);
            setRevisionPrompt('');
        }
    };
    
    const handleWritingSubmit = () => {
        const augmentedPrompt = augmentPromptWithContext(writingPrompt);
        onWriteChapter(augmentedPrompt);
        setShowWritingPanel(false);
        setWritingPrompt('');
    };

    const mentionHelperText = (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Use mentions for context: <code className="bg-gray-200 dark:bg-slate-700 p-0.5 rounded">@character(Name)</code>, <code className="bg-gray-200 dark:bg-slate-700 p-0.5 rounded">@chapter(1)</code>, <code className="bg-gray-200 dark:bg-slate-700 p-0.5 rounded">@world(summary)</code>, <code className="bg-gray-200 dark:bg-slate-700 p-0.5 rounded">@plot(Title)</code>.
        </p>
    );

    return (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 w-full max-w-xs sm:max-w-md md:max-w-2xl lg:max-w-4xl px-2">
            <div className="flex flex-col items-center gap-3">
                 {(showRevisionPanel || showWritingPanel) && (
                    <div className="w-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl p-4 rounded-xl shadow-2xl border border-gray-200 dark:border-slate-700 space-y-3">
                        {showRevisionPanel && (
                            <>
                                <label htmlFor="revision-prompt-toolbar" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Describe how to revise "{chapters.find(c => c.id === activeChapterId)?.title || 'this chapter'}":
                                </label>
                                <textarea
                                    id="revision-prompt-toolbar"
                                    rows={3}
                                    className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-slate-800 dark:border-slate-600"
                                    placeholder="e.g., 'Make the dialogue more tense in the second half.'"
                                    value={revisionPrompt}
                                    onChange={(e) => setRevisionPrompt(e.target.value)}
                                />
                                {mentionHelperText}
                                <div className="flex justify-end gap-2">
                                    <button onClick={() => setShowRevisionPanel(false)} className="px-4 py-2 text-sm bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 dark:bg-slate-600 dark:text-gray-200 dark:hover:bg-slate-500">
                                        Cancel
                                    </button>
                                    <button onClick={handleRevisionSubmit} disabled={!revisionPrompt.trim() || isCurrentRevising} className="px-4 py-2 text-sm flex items-center gap-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-indigo-400">
                                        {isCurrentRevising ? <><LoadingSpinner size="h-5 w-5" /><span>Revising...</span></> : <><PaperAirplaneIcon /><span>Submit Revision</span></>}
                                    </button>
                                </div>
                            </>
                        )}
                        {showWritingPanel && (
                             <>
                                <label htmlFor="writing-prompt-toolbar" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Instructions for "{`Chapter ${chapters.length + 1}`}":
                                </label>
                                <textarea
                                    id="writing-prompt-toolbar"
                                    rows={3}
                                    className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-slate-800 dark:border-slate-600"
                                    placeholder="e.g., 'Focus on the character's internal conflict. Start the chapter with a flashback.'"
                                    value={writingPrompt}
                                    onChange={(e) => setWritingPrompt(e.target.value)}
                                />
                                {mentionHelperText}
                                <div className="flex justify-end gap-2">
                                    <button onClick={() => setShowWritingPanel(false)} className="px-4 py-2 text-sm bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 dark:bg-slate-600 dark:text-gray-200 dark:hover:bg-slate-500">
                                        Cancel
                                    </button>
                                    <button onClick={handleWritingSubmit} disabled={activeTasks.writingChapter} className="px-4 py-2 text-sm flex items-center gap-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-green-400">
                                        {activeTasks.writingChapter ? <><LoadingSpinner size="h-5 w-5" /><span>Writing...</span></> : <><PaperAirplaneIcon /><span>Generate Chapter</span></>}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )}
                <div className="flex items-center justify-between w-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl p-2 rounded-full shadow-2xl border border-gray-200 dark:border-slate-700">
                    <div className="flex items-center gap-1">
                        <button onClick={() => onNavigateChapter('prev')} disabled={isAnyTaskActive || chapters.length < 2} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" /></svg></button>
                        <div className="relative" ref={dropdownRef}>
                            <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} disabled={chapters.length === 0 || isAnyTaskActive} className="px-3 py-2 text-sm font-medium rounded-full hover:bg-gray-200 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors">
                                {activeChapterId ? `Chapter ${activeChapterId}` : 'Go to'}
                            </button>
                            {isDropdownOpen && (
                                <div className="absolute bottom-full mb-2 w-56 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-md shadow-lg max-h-60 overflow-y-auto">
                                    <ul>{chapters.map(c => <li key={c.id}><button onClick={() => handleChapterClick(c.id)} className={`w-full text-left px-4 py-2 text-sm ${activeChapterId === c.id ? 'bg-indigo-600 text-white' : 'hover:bg-gray-100 dark:hover:bg-slate-800'}`}>{c.title}</button></li>)}</ul>
                                </div>
                            )}
                        </div>
                         <button onClick={() => onNavigateChapter('next')} disabled={isAnyTaskActive || chapters.length < 2} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4-4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg></button>
                    </div>

                    <div className="hidden md:flex items-center gap-2">
                        <div className="relative group">
                            <button onClick={onCheckChapter} disabled={isAnyTaskActive || activeChapterId === null} className="flex items-center justify-center w-11 h-11 rounded-full text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors">
                                {isCurrentChecking ? <LoadingSpinner size="h-5 w-5"/> : <CheckBadgeIcon/>}
                            </button>
                            {!isCurrentChecking && (
                                <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 whitespace-nowrap px-3 py-1.5 text-sm font-medium text-white bg-gray-900 rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-opacity dark:bg-gray-700 pointer-events-none">
                                    Check Chapter
                                </span>
                            )}
                        </div>
                        <div className="relative group">
                            <button onClick={onRegenerateChapter} disabled={isAnyTaskActive || activeChapterId === null} className="flex items-center justify-center w-11 h-11 rounded-full text-white bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 disabled:cursor-not-allowed transition-colors">
                                {isCurrentRevising ? <LoadingSpinner size="h-5 w-5"/> : <RefreshIcon/>}
                            </button>
                            {!isCurrentRevising && (
                                <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 whitespace-nowrap px-3 py-1.5 text-sm font-medium text-white bg-gray-900 rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-opacity dark:bg-gray-700 pointer-events-none">
                                    Regenerate Chapter
                                </span>
                            )}
                        </div>
                        <div className="relative group">
                            <button onClick={() => setShowRevisionPanel(!showRevisionPanel)} disabled={isAnyTaskActive || activeChapterId === null} className="flex items-center justify-center w-11 h-11 rounded-full text-white bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 disabled:cursor-not-allowed transition-colors">
                                <SparklesIcon/>
                            </button>
                            <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 whitespace-nowrap px-3 py-1.5 text-sm font-medium text-white bg-gray-900 rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-opacity dark:bg-gray-700 pointer-events-none">
                                Revise with AI
                            </span>
                        </div>
                        <div className="relative group">
                            <button onClick={onSyncPlanWithChapter} disabled={isAnyTaskActive || activeChapterId === null} className="flex items-center justify-center w-11 h-11 rounded-full text-white bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 disabled:cursor-not-allowed transition-colors">
                                {isCurrentSyncing ? <LoadingSpinner size="h-5 w-5"/> : <SyncIcon/>}
                            </button>
                            {!isCurrentSyncing && (
                                <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 whitespace-nowrap px-3 py-1.5 text-sm font-medium text-white bg-gray-900 rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-opacity dark:bg-gray-700 pointer-events-none">
                                    Sync Plan
                                </span>
                            )}
                        </div>
                         <div className="relative group">
                            <button onClick={onExportChapter} disabled={isAnyTaskActive || activeChapterId === null} className="flex items-center justify-center w-11 h-11 rounded-full text-white bg-slate-600 hover:bg-slate-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors">
                                <DownloadIcon/>
                            </button>
                            <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 whitespace-nowrap px-3 py-1.5 text-sm font-medium text-white bg-gray-900 rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-opacity dark:bg-gray-700 pointer-events-none">
                                Export .txt
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-1">
                        <div className="relative group">
                            <button onClick={onOpenAgentPanel} disabled={!isPlanReady || isAnyTaskActive} className="flex items-center justify-center w-11 h-11 bg-indigo-600 text-white font-semibold rounded-full hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-colors">
                                <MagicWandIcon />
                            </button>
                            <span className="absolute bottom-full mb-2 right-0 whitespace-nowrap px-3 py-1.5 text-sm font-medium text-white bg-gray-900 rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-opacity dark:bg-gray-700 pointer-events-none">
                                AI Agent
                            </span>
                        </div>
                        <div className="relative group">
                            <button onClick={() => setShowWritingPanel(true)} disabled={!isPlanReady || isAnyTaskActive} className="flex items-center justify-center w-11 h-11 bg-green-600 text-white font-semibold rounded-full hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed transition-colors">
                                {activeTasks.writingChapter ? <LoadingSpinner size="h-5 w-5" /> : <BookOpenIcon />}
                            </button>
                            {!activeTasks.writingChapter && (
                                <span className="absolute bottom-full mb-2 right-0 whitespace-nowrap px-3 py-1.5 text-sm font-medium text-white bg-gray-900 rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-opacity dark:bg-gray-700 pointer-events-none">
                                    {chapters.length > 0 ? `Write Ch. ${chapters.length + 1}` : 'Write Ch. 1'}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ManuscriptToolbar;


import React, { useState, useRef, useEffect } from 'react';
import { Chapter, ActiveTasks } from '../types';
import { BookOpenIcon, ChevronDownIcon, DownloadIcon, SparklesIcon, CheckBadgeIcon, SyncIcon } from './icons';
import LoadingSpinner from './LoadingSpinner';

interface ManuscriptToolbarProps {
    chapters: Chapter[];
    activeChapterId: number | null;
    onWriteChapter: () => void;
    onExportChapter: () => void;
    onNavigateChapter: (direction: 'prev' | 'next') => void;
    onCheckChapter: () => void;
    onReviseChapter: (prompt: string) => void;
    onSyncPlanWithChapter: () => void;
    isPlanReady: boolean;
    activeTasks: ActiveTasks;
}

const PaperAirplaneIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
    </svg>
);

const ManuscriptToolbar: React.FC<ManuscriptToolbarProps> = ({
    chapters, activeChapterId, onWriteChapter, onExportChapter, onNavigateChapter, onCheckChapter, onReviseChapter, onSyncPlanWithChapter, isPlanReady, activeTasks
}) => {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [showRevisionPanel, setShowRevisionPanel] = useState(false);
    const [revisionPrompt, setRevisionPrompt] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);
    const activeChapterIndex = activeChapterId !== null ? chapters.findIndex(c => c.id === activeChapterId) : -1;

    const isAnyTaskActive = activeTasks.writingChapter || Object.keys(activeTasks.checkingChapter).length > 0 || Object.keys(activeTasks.revisingChapter).length > 0 || Object.keys(activeTasks.syncingPlan).length > 0;
    const isCurrentChecking = activeChapterIndex !== -1 && activeTasks.checkingChapter[activeChapterIndex];
    const isCurrentRevising = activeChapterIndex !== -1 && activeTasks.revisingChapter[activeChapterIndex];
    const isCurrentSyncing = activeChapterIndex !== -1 && activeTasks.syncingPlan[activeChapterIndex];

    const handleChapterClick = (chapterId: number) => {
        document.getElementById(`chapter-${chapterId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

    const handleRevisionSubmit = () => {
        if (revisionPrompt.trim()) {
            onReviseChapter(revisionPrompt);
            setShowRevisionPanel(false);
            setRevisionPrompt('');
        }
    };

    return (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 w-full max-w-xs sm:max-w-md md:max-w-2xl lg:max-w-4xl px-2">
            <div className="flex flex-col items-center gap-3">
                 {showRevisionPanel && (
                    <div className="w-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl p-4 rounded-xl shadow-2xl border border-gray-200 dark:border-slate-700 space-y-3">
                        <label htmlFor={`revision-prompt-toolbar`} className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Describe how to revise "{chapters.find(c => c.id === activeChapterId)?.title || 'this chapter'}":
                        </label>
                        <textarea
                            id={`revision-prompt-toolbar`}
                            rows={3}
                            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-slate-800 dark:border-slate-600"
                            placeholder="e.g., 'Make the dialogue more tense in the second half.'"
                            value={revisionPrompt}
                            onChange={(e) => setRevisionPrompt(e.target.value)}
                        />
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setShowRevisionPanel(false)} className="px-4 py-2 text-sm bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 dark:bg-slate-600 dark:text-gray-200 dark:hover:bg-slate-500">
                                Cancel
                            </button>
                            <button onClick={handleRevisionSubmit} disabled={!revisionPrompt.trim() || isCurrentRevising} className="px-4 py-2 text-sm flex items-center gap-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-indigo-400">
                                {isCurrentRevising ? <><LoadingSpinner size="h-5 w-5" /><span>Revising...</span></> : <><PaperAirplaneIcon /><span>Submit Revision</span></>}
                            </button>
                        </div>
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

                    <div className="flex items-center">
                        <div className="relative group">
                            <button onClick={onWriteChapter} disabled={!isPlanReady || isAnyTaskActive} className="flex items-center justify-center w-11 h-11 bg-green-600 text-white font-semibold rounded-full hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed transition-colors">
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

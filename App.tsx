
import React, { useState, useCallback, useEffect } from 'react';
import { Plan, Chapter, AppState, AppSettings, AppStateSnapshot, ActiveTasks } from './types';
import { generatePlan, refinePlan, writeChapter, checkChapter, reviseChapter, syncPlanWithChapterContent } from './services/geminiService';
import PlannerPanel from './components/PlannerPanel';
import Workspace from './components/Workspace';
import SettingsModal from './components/SettingsModal';
import { CogIcon, SaveIcon, FolderOpenIcon } from './components/icons';

const App: React.FC = () => {
    const [initialIdea, setInitialIdea] = useState<string>('');
    const [plan, setPlan] = useState<Plan | null>(null);
    const [chapters, setChapters] = useState<Chapter[]>([]);
    const [appState, setAppState] = useState<AppState>('INITIAL');
    const [isPlanLoading, setIsPlanLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState<string>('');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [activeTasks, setActiveTasks] = useState<ActiveTasks>({ writingChapter: false, checkingChapter: {}, revisingChapter: {}, syncingPlan: {} });
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [settings, setSettings] = useState<AppSettings>({ 
        globalSystemPrompt: '', 
        continueFromLastChapter: false,
        fontSize: 1.125, // default rem for prose-lg
        paragraphSpacing: 1.6, // default em
    });

    useEffect(() => {
        // Simple theme management based on system preference
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }

        const savedSettings = localStorage.getItem('ai-novelist-settings');
        if (savedSettings) {
            const parsed = JSON.parse(savedSettings);
            // Ensure new settings have default values if loading from older state
            parsed.fontSize = parsed.fontSize ?? 1.125;
            parsed.paragraphSpacing = parsed.paragraphSpacing ?? 1.6;
            setSettings(parsed);
        }
    }, []);

    useEffect(() => {
        document.documentElement.style.setProperty('--markdown-font-size', `${settings.fontSize}rem`);
        document.documentElement.style.setProperty('--markdown-paragraph-spacing', `${settings.paragraphSpacing}em`);
      }, [settings.fontSize, settings.paragraphSpacing]);

    const handleSettingsSave = (newSettings: AppSettings) => {
        setSettings(newSettings);
        localStorage.setItem('ai-novelist-settings', JSON.stringify(newSettings));
        setIsSettingsOpen(false);
    };

    const handleGeneratePlan = useCallback(async () => {
        if (!initialIdea.trim()) {
            setErrorMessage('Please enter your story idea first.');
            return;
        }
        setErrorMessage(null);
        setLoadingMessage('Planner is generating your novel\'s blueprint...');
        setIsPlanLoading(true);
        try {
            const newPlan = await generatePlan(initialIdea, settings.globalSystemPrompt);
            setPlan(newPlan);
            setAppState('PLANNING');
        } catch (error) {
            console.error(error);
            setErrorMessage('Failed to generate a plan. Please check your API key and try again.');
            setAppState('ERROR');
        } finally {
            setIsPlanLoading(false);
            setLoadingMessage('');
        }
    }, [initialIdea, settings.globalSystemPrompt]);
    
    const handleRefinePlan = useCallback(async (refinementPrompt: string) => {
        if (!plan) {
            setErrorMessage('A plan must be generated before it can be refined.');
            return;
        }
        setErrorMessage(null);
        setLoadingMessage('Planner is refining the blueprint...');
        setIsPlanLoading(true);
        try {
            const refinedPlan = await refinePlan(plan, refinementPrompt, settings.globalSystemPrompt);
            setPlan(refinedPlan);
            setAppState('PLANNING');
        } catch (error) {
            console.error(error);
            setErrorMessage('Failed to refine the plan. Please try again.');
            setAppState('ERROR');
        } finally {
            setIsPlanLoading(false);
            setLoadingMessage('');
        }
    }, [plan, settings.globalSystemPrompt]);

    const handleWriteChapter = useCallback(async () => {
        if (!plan || activeTasks.writingChapter) {
            return;
        }
        setErrorMessage(null);
        setActiveTasks(prev => ({ ...prev, writingChapter: true }));
        setAppState('WRITING'); // Ensure view is correct
        try {
            const previousChaptersSummary = chapters.map(c => `Chapter ${c.id}: ${c.content.substring(0, 200)}...`).join('\n');
            
            let lastChapterContentSnippet: string | null = null;
            if (settings.continueFromLastChapter && chapters.length > 0) {
                const lastChapterContent = chapters[chapters.length - 1].content;
                // Approx 50 tokens ~= 250 chars
                lastChapterContentSnippet = lastChapterContent.slice(-250);
            }

            const newChapterContent = await writeChapter(plan, chapters.length + 1, previousChaptersSummary, lastChapterContentSnippet, settings.globalSystemPrompt);
            const newChapter: Chapter = {
                id: chapters.length + 1,
                title: `Chapter ${chapters.length + 1}`,
                content: newChapterContent,
            };
            setChapters(prevChapters => [...prevChapters, newChapter]);
        } catch (error) {
            console.error(error);
            setErrorMessage('Failed to write the chapter. Please try again.');
            setAppState('ERROR');
        } finally {
            setActiveTasks(prev => ({ ...prev, writingChapter: false }));
        }
    }, [plan, chapters, settings, activeTasks.writingChapter]);

    const handleCheckChapter = useCallback(async (chapterIndex: number) => {
        if (!plan || !chapters[chapterIndex]) {
            setErrorMessage('Cannot check a non-existent chapter.');
            return;
        }
        setErrorMessage(null);
        setActiveTasks(prev => ({ 
            ...prev, 
            checkingChapter: { ...prev.checkingChapter, [chapterIndex]: true }
        }));
        try {
            const chapter = chapters[chapterIndex];
            const feedback = await checkChapter(plan, chapter.content, settings.globalSystemPrompt);
            setChapters(prevChapters => {
                const updatedChapters = [...prevChapters];
                updatedChapters[chapterIndex].feedback = feedback;
                return updatedChapters;
            });
        } catch (error) {
            console.error(error);
            setErrorMessage('Failed to get feedback for the chapter. Please try again.');
            setAppState('ERROR');
        } finally {
            setActiveTasks(prev => {
                const newChecking = { ...prev.checkingChapter };
                delete newChecking[chapterIndex];
                return { ...prev, checkingChapter: newChecking };
            });
        }
    }, [plan, chapters, settings.globalSystemPrompt]);

    const handleReviseChapter = useCallback(async (chapterIndex: number, revisionPrompt: string) => {
        if (!plan || !chapters[chapterIndex] || !revisionPrompt.trim()) {
            setErrorMessage('Cannot revise without a plan, chapter, or revision prompt.');
            return;
        }
        setErrorMessage(null);
        setActiveTasks(prev => ({
            ...prev,
            revisingChapter: { ...prev.revisingChapter, [chapterIndex]: true }
        }));
        try {
            const revisedContent = await reviseChapter(plan, chapters, chapterIndex, revisionPrompt, settings.globalSystemPrompt);
            setChapters(prevChapters =>
                prevChapters.map((ch, idx) => {
                    if (idx === chapterIndex) {
                        // Create a new chapter object with updated content and remove old feedback
                        const { feedback, ...rest } = ch;
                        return { ...rest, content: revisedContent };
                    }
                    return ch;
                })
            );

        } catch (error) {
            console.error(error);
            setErrorMessage('Failed to revise the chapter. Please try again.');
            setAppState('ERROR');
        } finally {
            setActiveTasks(prev => {
                const newRevising = { ...prev.revisingChapter };
                delete newRevising[chapterIndex];
                return { ...prev, revisingChapter: newRevising };
            });
        }
    }, [plan, chapters, settings.globalSystemPrompt]);

    const handleSyncPlanWithChapter = useCallback(async (chapterIndex: number) => {
        if (!plan || !chapters[chapterIndex]) {
            setErrorMessage('Cannot sync plan for a non-existent chapter.');
            return;
        }
        setErrorMessage(null);
        setActiveTasks(prev => ({ 
            ...prev, 
            syncingPlan: { ...prev.syncingPlan, [chapterIndex]: true }
        }));
        try {
            const chapter = chapters[chapterIndex];
            const updatedPlan = await syncPlanWithChapterContent(plan, chapter, settings.globalSystemPrompt);
            setPlan(updatedPlan);
        } catch (error) {
            console.error(error);
            setErrorMessage('Failed to sync the plan with the chapter. Please try again.');
            setAppState('ERROR');
        } finally {
            setActiveTasks(prev => {
                const newSyncing = { ...prev.syncingPlan };
                delete newSyncing[chapterIndex];
                return { ...prev, syncingPlan: newSyncing };
            });
        }
    }, [plan, chapters, settings.globalSystemPrompt]);


    const updateChapterContent = useCallback((index: number, content: string) => {
        setChapters(prevChapters =>
            prevChapters.map((chapter, i) =>
                i === index ? { ...chapter, content } : chapter
            )
        );
    }, []);

    const handleSaveState = () => {
        const state: AppStateSnapshot = {
            initialIdea,
            plan,
            chapters,
            settings,
            appState: isPlanLoading ? 'INITIAL' : appState, // Don't save in loading state
        };
        const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'ai-novelist-session.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleLoadState = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const text = e.target?.result;
                    if (typeof text === 'string') {
                        const loadedState: AppStateSnapshot = JSON.parse(text);
                        
                        // Backwards compatibility: Add UUIDs if they are missing from an older save file format
                        if (loadedState.plan) {
                            if (loadedState.plan.characterSettings && Array.isArray(loadedState.plan.characterSettings)) {
                                loadedState.plan.characterSettings.forEach((c: any) => {
                                    if (!c.id) c.id = self.crypto.randomUUID();
                                });
                            }
                            if (loadedState.plan.plotOutline && Array.isArray(loadedState.plan.plotOutline)) {
                                loadedState.plan.plotOutline.forEach((p: any) => {
                                    if (!p.id) p.id = self.crypto.randomUUID();
                                });
                            }
                        }

                        // Backwards compatibility for new settings
                        loadedState.settings.continueFromLastChapter = loadedState.settings.continueFromLastChapter ?? false;
                        loadedState.settings.fontSize = loadedState.settings.fontSize ?? 1.125;
                        loadedState.settings.paragraphSpacing = loadedState.settings.paragraphSpacing ?? 1.6;

                        setInitialIdea(loadedState.initialIdea);
                        setPlan(loadedState.plan);
                        setChapters(loadedState.chapters);
                        setSettings(loadedState.settings);
                        setAppState(loadedState.appState);
                        setActiveTasks({ writingChapter: false, checkingChapter: {}, revisingChapter: {}, syncingPlan: {} }); // Reset active tasks
                        // Also save loaded settings to localStorage
                        localStorage.setItem('ai-novelist-settings', JSON.stringify(loadedState.settings));
                    }
                } catch (err) {
                    setErrorMessage('Failed to load or parse the session file.');
                    console.error(err);
                }
            };
            reader.readAsText(file);
        }
    };
    
    const triggerLoadFile = () => {
        document.getElementById('loadFile')?.click();
    };

    const isAnyChapterBeingChecked = Object.keys(activeTasks.checkingChapter).length > 0;
    const isAnyChapterBeingRevised = Object.keys(activeTasks.revisingChapter).length > 0;
    const isAnyChapterBeingSynced = Object.keys(activeTasks.syncingPlan).length > 0;
    const isAnyTaskActive = activeTasks.writingChapter || isAnyChapterBeingChecked || isAnyChapterBeingRevised || isAnyChapterBeingSynced;

    return (
        <div className="flex h-screen font-sans bg-gray-100 dark:bg-slate-900 text-gray-900 dark:text-gray-100">
            <PlannerPanel 
                plan={plan} 
                onPlanChange={setPlan} 
                onRefinePlan={handleRefinePlan}
                disabled={isPlanLoading || isAnyTaskActive}
            />
            <main className="flex-1 flex flex-col p-4 md:p-6 lg:p-8 overflow-y-auto">
                <header className="flex justify-between items-start mb-6">
                    <div>
                        <h1 className="text-4xl font-bold text-gray-800 dark:text-white">AI Novelist Agent</h1>
                        <p className="text-lg text-gray-500 dark:text-gray-400 mt-1">From a single idea to a complete manuscript, powered by AI agents.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={handleSaveState} className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" aria-label="Save Session"><SaveIcon /></button>
                        <button onClick={triggerLoadFile} className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" aria-label="Load Session"><FolderOpenIcon /></button>
                        <input type="file" id="loadFile" accept=".json" onChange={handleLoadState} className="hidden" />
                        <button onClick={() => setIsSettingsOpen(true)} className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" aria-label="Open Settings"><CogIcon /></button>
                    </div>
                </header>
                
                {errorMessage && (
                    <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4" role="alert">
                        <p className="font-bold">Error</p>
                        <p>{errorMessage}</p>
                    </div>
                )}

                <Workspace
                    appState={appState}
                    isPlanLoading={isPlanLoading}
                    loadingMessage={loadingMessage}
                    initialIdea={initialIdea}
                    onInitialIdeaChange={setInitialIdea}
                    onGeneratePlan={handleGeneratePlan}
                    chapters={chapters}
                    onChapterContentChange={updateChapterContent}
                    onWriteChapter={handleWriteChapter}
                    onCheckChapter={handleCheckChapter}
                    onReviseChapter={handleReviseChapter}
                    onSyncPlanWithChapter={handleSyncPlanWithChapter}
                    isPlanReady={!!plan}
                    activeTasks={activeTasks}
                />
            </main>
            <SettingsModal 
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                settings={settings}
                onSave={handleSettingsSave}
            />
        </div>
    );
};

export default App;
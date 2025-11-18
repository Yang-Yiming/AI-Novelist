
import React, { useState } from 'react';
import { Plan, CharacterProfile, PlotPoint, WorldSettings } from '../types';
import { PencilIcon, SparklesIcon, PlusIcon, TrashIcon, PhotoIcon } from './icons';
import { generateCharacterImage } from '../services/geminiService';
import LoadingSpinner from './LoadingSpinner';

interface PlannerPanelProps {
    plan: Plan | null;
    onPlanChange: (plan: Plan) => void;
    onRefinePlan: (prompt: string) => void;
    disabled: boolean;
}

const PlannerPanel: React.FC<PlannerPanelProps> = ({ plan, onPlanChange, onRefinePlan, disabled }) => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [refinePrompt, setRefinePrompt] = useState('');
    const [activeTab, setActiveTab] = useState<'world' | 'characters' | 'plot' | 'tone'>('world');

    const handleRefineClick = () => {
        if (refinePrompt.trim()) {
            onRefinePlan(refinePrompt);
            setRefinePrompt('');
        }
    };

    const handleWorldChange = (field: keyof WorldSettings, value: string) => {
        if (plan) onPlanChange({ ...plan, worldSettings: { ...plan.worldSettings, [field]: value } });
    };

    const handleCharacterChange = (id: string, field: keyof Omit<CharacterProfile, 'id'>, value: string) => {
        if (plan) onPlanChange({ ...plan, characterSettings: plan.characterSettings.map(c => c.id === id ? { ...c, [field]: value } : c) });
    };

    const handleAddCharacter = () => {
        if (plan) {
            const newCharacter: CharacterProfile = { id: self.crypto.randomUUID(), name: 'New Character', description: '', motivation: '' };
            onPlanChange({ ...plan, characterSettings: [...plan.characterSettings, newCharacter] });
        }
    };

    const handleDeleteCharacter = (id: string) => {
        if (plan) onPlanChange({ ...plan, characterSettings: plan.characterSettings.filter(c => c.id !== id) });
    };

    const handlePlotChange = (id: string, field: keyof Omit<PlotPoint, 'id'>, value: string) => {
        if (plan) onPlanChange({ ...plan, plotOutline: plan.plotOutline.map(p => p.id === id ? { ...p, [field]: value } : p) });
    };

    const handleAddPlotPoint = () => {
        if (plan) {
            const newPlotPoint: PlotPoint = { id: self.crypto.randomUUID(), title: 'New Plot Point', description: '' };
            onPlanChange({ ...plan, plotOutline: [...plan.plotOutline, newPlotPoint] });
        }
    };

    const handleDeletePlotPoint = (id: string) => {
        if (plan) onPlanChange({ ...plan, plotOutline: plan.plotOutline.filter(p => p.id !== id) });
    };

    const handleToneChange = (value: string) => {
        if (plan) onPlanChange({ ...plan, tone: value });
    };

    if (isCollapsed) {
        return (
            <div className="bg-white dark:bg-gray-900 p-2 shadow-lg">
                <button onClick={() => setIsCollapsed(false)} className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" aria-label="Expand Panel">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
            </div>
        );
    }

    return (
        <aside className="w-full max-w-sm lg:max-w-md xl:max-w-lg flex flex-col bg-white dark:bg-gray-900/50 border-r border-gray-200 dark:border-gray-700 shadow-xl">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-900/80 backdrop-blur-sm z-10">
                <h2 className="text-xl font-bold flex items-center gap-2"><PencilIcon /> Novel Blueprint</h2>
                <button onClick={() => setIsCollapsed(true)} className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" aria-label="Collapse Panel">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
            </div>

            {!plan ? (
                <div className="flex-grow flex items-center justify-center p-4">
                    <p className="text-gray-500 dark:text-gray-400 text-center">Generate a plan in the main workspace to see your novel's blueprint here.</p>
                </div>
            ) : (
                <div className="flex-grow p-4 flex flex-col overflow-y-hidden">
                    <div className="border-b border-gray-200 dark:border-gray-700">
                        <nav className="-mb-px flex space-x-4" aria-label="Tabs">
                            <TabButton name="World" activeTab={activeTab} setActiveTab={() => setActiveTab('world')} />
                            <TabButton name="Characters" activeTab={activeTab} setActiveTab={() => setActiveTab('characters')} />
                            <TabButton name="Plot" activeTab={activeTab} setActiveTab={() => setActiveTab('plot')} />
                            <TabButton name="Tone" activeTab={activeTab} setActiveTab={() => setActiveTab('tone')} />
                        </nav>
                    </div>

                    <div className="flex-grow mt-4 overflow-y-auto pr-2">
                        {activeTab === 'world' && <WorldSettingsEditor settings={plan.worldSettings} onChange={handleWorldChange} disabled={disabled} />}
                        {activeTab === 'characters' && <CharactersEditor characters={plan.characterSettings} tone={plan.tone} onChange={handleCharacterChange} onAdd={handleAddCharacter} onDelete={handleDeleteCharacter} disabled={disabled} />}
                        {activeTab === 'plot' && <PlotOutlineEditor plotPoints={plan.plotOutline} onChange={handlePlotChange} onAdd={handleAddPlotPoint} onDelete={handleDeletePlotPoint} disabled={disabled} />}
                        {activeTab === 'tone' && <EditableSection title="Tone" value={plan.tone} onChange={handleToneChange} disabled={disabled} />}
                    </div>

                    <div className="space-y-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <label htmlFor="refine-prompt" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Refine Plan with AI</label>
                        <textarea id="refine-prompt" rows={2} className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600" placeholder="e.g., 'Make the main character more cynical'" value={refinePrompt} onChange={(e) => setRefinePrompt(e.target.value)} disabled={disabled} />
                        <button onClick={handleRefineClick} disabled={disabled || !refinePrompt.trim()} className="w-full flex justify-center items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed transition-colors">
                            <SparklesIcon /> Refine
                        </button>
                    </div>
                </div>
            )}
        </aside>
    );
};

const TabButton: React.FC<{name: string, activeTab: string, setActiveTab: () => void}> = ({name, activeTab, setActiveTab}) => (
    <button onClick={setActiveTab} className={`${activeTab === name.toLowerCase() ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}>{name}</button>
)

const EditableSection: React.FC<{title: string, value: string, onChange: (value: string) => void, disabled: boolean, rows?: number}> = ({title, value, onChange, disabled, rows=8}) => (
    <div className="h-full flex flex-col">
        <label htmlFor={title} className="text-lg font-semibold mb-2">{title}</label>
        <textarea id={title} className="flex-grow w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 resize-none" value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} aria-label={`Edit ${title}`} rows={rows} />
    </div>
);

const AccordionItem: React.FC<{title: string, onTitleChange: (value:string) => void, onDelete: () => void, children: React.ReactNode, disabled: boolean }> = ({ title, onTitleChange, onDelete, children, disabled }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="border border-gray-200 dark:border-gray-700 rounded-md mb-2">
            <h2>
                <button type="button" onClick={() => setIsOpen(!isOpen)} disabled={disabled} className="flex items-center justify-between w-full p-3 font-medium text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800" aria-expanded={isOpen}>
                    <input 
                        type="text" 
                        value={title} 
                        onChange={e => onTitleChange(e.target.value)} 
                        onClick={e => e.stopPropagation()}
                        disabled={disabled} 
                        className="bg-transparent font-semibold focus:ring-1 ring-indigo-500 rounded-sm w-full mr-2"
                    />
                    <div className='flex items-center'>
                         <div role="button" onClick={(e) => {e.stopPropagation(); onDelete();}} className={`p-1 text-gray-400 hover:text-red-500 disabled:text-gray-600 ${disabled ? 'pointer-events-none' : 'cursor-pointer'}`}><TrashIcon /></div>
                        <svg className={`w-6 h-6 shrink-0 transition-transform ${isOpen ? '' : '-rotate-90'}`} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                    </div>
                </button>
            </h2>
            {isOpen && <div className="p-3 border-t border-gray-200 dark:border-gray-700">{children}</div>}
        </div>
    );
};

const WorldSettingsEditor: React.FC<{settings: WorldSettings, onChange: (field: keyof WorldSettings, value: string) => void, disabled: boolean}> = ({settings, onChange, disabled}) => (
    <div className="space-y-4">
        <EditableSection title="Summary" value={settings.summary} onChange={v => onChange('summary', v)} disabled={disabled} rows={4} />
        <EditableSection title="Locations" value={settings.locations} onChange={v => onChange('locations', v)} disabled={disabled} />
        <EditableSection title="History & Lore" value={settings.history} onChange={v => onChange('history', v)} disabled={disabled} />
        <EditableSection title="Magic Systems" value={settings.magicSystems} onChange={v => onChange('magicSystems', v)} disabled={disabled} />
    </div>
);

const CharactersEditor: React.FC<{characters: CharacterProfile[], tone: string, onChange: (id: string, field: keyof Omit<CharacterProfile, 'id'>, value: string) => void, onAdd: () => void, onDelete: (id: string) => void, disabled: boolean}> = ({ characters, tone, onChange, onAdd, onDelete, disabled }) => {
    const [generatingImages, setGeneratingImages] = useState<Record<string, boolean>>({});

    const handleGenerateImage = async (char: CharacterProfile) => {
        if (!char.description) return;
        setGeneratingImages(prev => ({ ...prev, [char.id]: true }));
        try {
            const imageUrl = await generateCharacterImage(char, tone);
            onChange(char.id, 'imageUrl', imageUrl);
        } catch (error) {
            console.error("Failed to generate image:", error);
            alert("Failed to generate image. Please try again.");
        } finally {
            setGeneratingImages(prev => ({ ...prev, [char.id]: false }));
        }
    };

    return (
        <div>
            {characters.map(char => (
                <AccordionItem key={char.id} title={char.name} onTitleChange={v => onChange(char.id, 'name', v)} onDelete={() => onDelete(char.id)} disabled={disabled}>
                    <div className="space-y-4">
                        {char.imageUrl && (
                            <div className="relative group rounded-lg overflow-hidden shadow-md border border-gray-200 dark:border-gray-700">
                                <img src={char.imageUrl} alt={`Portrait of ${char.name}`} className="w-full h-auto object-cover" />
                                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 p-2 opacity-0 group-hover:opacity-100 transition-opacity flex justify-end">
                                     <button onClick={() => onChange(char.id, 'imageUrl', '')} className="text-white text-xs hover:text-red-300 flex items-center gap-1">
                                        <TrashIcon /> Remove Image
                                     </button>
                                </div>
                            </div>
                        )}
                        <div className="flex justify-between items-center">
                             <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400">Portrait</h3>
                             <button 
                                onClick={() => handleGenerateImage(char)} 
                                disabled={disabled || generatingImages[char.id] || !char.description}
                                className="text-xs flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 dark:bg-indigo-900 dark:text-indigo-300 dark:hover:bg-indigo-800 disabled:opacity-50"
                             >
                                {generatingImages[char.id] ? <LoadingSpinner size="h-3 w-3" /> : <PhotoIcon />}
                                {char.imageUrl ? 'Regenerate' : 'Generate Portrait'}
                             </button>
                        </div>
                        <EditableSection title="Description" value={char.description} onChange={v => onChange(char.id, 'description', v)} disabled={disabled} rows={5} />
                        <EditableSection title="Motivation" value={char.motivation} onChange={v => onChange(char.id, 'motivation', v)} disabled={disabled} rows={3} />
                    </div>
                </AccordionItem>
            ))}
            <button onClick={onAdd} disabled={disabled} className="w-full flex justify-center items-center gap-2 mt-2 px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors">
                <PlusIcon /> Add Character
            </button>
        </div>
    );
};

const PlotOutlineEditor: React.FC<{plotPoints: PlotPoint[], onChange: (id: string, field: keyof Omit<PlotPoint, 'id'>, value: string) => void, onAdd: () => void, onDelete: (id: string) => void, disabled: boolean}> = ({ plotPoints, onChange, onAdd, onDelete, disabled }) => (
     <div>
        {plotPoints.map(point => (
            <AccordionItem key={point.id} title={point.title} onTitleChange={v => onChange(point.id, 'title', v)} onDelete={() => onDelete(point.id)} disabled={disabled}>
                 <EditableSection title="Description" value={point.description} onChange={v => onChange(point.id, 'description', v)} disabled={disabled} rows={6} />
            </AccordionItem>
        ))}
        <button onClick={onAdd} disabled={disabled} className="w-full flex justify-center items-center gap-2 mt-2 px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors">
            <PlusIcon /> Add Plot Point
        </button>
    </div>
);


export default PlannerPanel;

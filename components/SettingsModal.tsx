
import React, { useState, useEffect } from 'react';
import { AppSettings } from '../types';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    settings: AppSettings;
    onSave: (settings: AppSettings) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onSave }) => {
    const [currentSettings, setCurrentSettings] = useState<AppSettings>(settings);

    useEffect(() => {
        setCurrentSettings(settings);
    }, [settings, isOpen]);

    if (!isOpen) return null;

    const handleSave = () => {
        onSave(currentSettings);
    };

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" 
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-title"
        >
            <div 
                className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg p-6 space-y-4" 
                onClick={(e) => e.stopPropagation()}
            >
                <h2 id="settings-title" className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h2>
                
                <div>
                    <label htmlFor="global-prompt" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Global System Prompt
                    </label>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                        This prompt is prepended to every request to the AI agents, setting a global context or instruction.
                    </p>
                    <textarea
                        id="global-prompt"
                        rows={4}
                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600"
                        placeholder="e.g., 'All responses should be suitable for a young adult audience.'"
                        value={currentSettings.globalSystemPrompt}
                        onChange={(e) => setCurrentSettings({ ...currentSettings, globalSystemPrompt: e.target.value })}
                    />
                </div>

                <div className="flex items-center justify-between py-2 border-t border-b border-gray-200 dark:border-gray-700">
                    <div>
                        <label htmlFor="continue-context" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Continue Context from Previous Chapter
                        </label>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            When writing, the agent will see the end of the last chapter to ensure a smooth transition.
                        </p>
                    </div>
                    <button
                        type="button"
                        className={`${currentSettings.continueFromLastChapter ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-600'} relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800`}
                        role="switch"
                        aria-checked={currentSettings.continueFromLastChapter}
                        onClick={() => setCurrentSettings({ ...currentSettings, continueFromLastChapter: !currentSettings.continueFromLastChapter })}
                    >
                        <span
                            aria-hidden="true"
                            className={`${currentSettings.continueFromLastChapter ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                        />
                    </button>
                </div>

                <div className="bg-gray-100 dark:bg-gray-900/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                    <h3 className="font-semibold text-gray-800 dark:text-gray-200">API Configuration</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        This application is configured to use the API key provided by its environment. Custom API keys cannot be set here.
                    </p>
                </div>

                <div className="flex justify-end gap-4">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                    >
                        Save Settings
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;

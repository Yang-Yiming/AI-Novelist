
import React, { useState } from 'react';
import { DownloadIcon, ClipboardDocumentIcon, XMarkIcon, PhotoIcon } from './icons';

interface IllustrationModalProps {
    isOpen: boolean;
    onClose: () => void;
    imageUrl: string;
    prompt: string;
}

const IllustrationModal: React.FC<IllustrationModalProps> = ({ isOpen, onClose, imageUrl, prompt }) => {
    const [copied, setCopied] = useState(false);

    if (!isOpen) return null;

    const handleDownload = () => {
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = `illustration_${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleCopyMarkdown = () => {
        const markdown = `![Illustration: ${prompt.substring(0, 20)}...](${imageUrl})`;
        navigator.clipboard.writeText(markdown);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-[60] flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-3xl w-full overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <PhotoIcon /> Generated Illustration
                    </h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                        <XMarkIcon />
                    </button>
                </div>
                
                <div className="flex-grow overflow-auto bg-gray-100 dark:bg-black flex items-center justify-center p-4">
                    <img src={imageUrl} alt="Generated Scene" className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-md" />
                </div>

                <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 line-clamp-2 italic">"{prompt}"</p>
                    <div className="flex flex-wrap gap-3 justify-end">
                        <button 
                            onClick={handleCopyMarkdown} 
                            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
                        >
                            {copied ? <span className="text-green-600 font-bold">Copied!</span> : <><ClipboardDocumentIcon /> Copy Markdown</>}
                        </button>
                        <button 
                            onClick={handleDownload} 
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                            <DownloadIcon /> Download Image
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default IllustrationModal;

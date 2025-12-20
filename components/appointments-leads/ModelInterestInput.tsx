import React, { useState, useRef, useEffect, useMemo, useContext } from 'react';
import { XMarkIcon, PlusIcon } from '@heroicons/react/24/outline';
import { DataContext } from '../../App';

interface ModelInterestInputProps {
    models: string[];
    onChange: (models: string[]) => void;
}

// Common car models for suggestions
const COMMON_MODELS = [
    'Camaro', 'Mustang', 'Corvette', 'Challenger', 'Charger',
    'Accord', 'Camry', 'Civic', 'Corolla', 'Altima', 'Maxima',
    'F-150', 'Silverado', 'Ram 1500', 'Sierra', 'Tacoma', 'Tundra',
    'Explorer', 'Tahoe', 'Suburban', 'Yukon', 'Expedition',
    'Equinox', 'Traverse', 'Highlander', 'Pilot', 'Pathfinder',
    'Wrangler', 'Cherokee', 'Grand Cherokee',
    'Chrysler 300', '3 Series', '5 Series', 'A4', 'A6',
    'Model 3', 'Model Y', 'Model S', 'Model X',
    'Malibu', 'Impala', 'Fusion', 'Sonata', 'Elantra', 'Optima',
    'Escape', 'CR-V', 'RAV4', 'Rogue', 'Tucson', 'Santa Fe',
];

export const ModelInterestInput: React.FC<ModelInterestInputProps> = ({
    models,
    onChange,
}) => {
    const dataContext = useContext(DataContext);
    const inventory = dataContext?.inventory || [];

    const [inputValue, setInputValue] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Close suggestions when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Get unique models from inventory
    const inventoryModels = useMemo(() => {
        const modelsSet = new Set<string>();
        inventory.forEach(vehicle => {
            if (vehicle.make && vehicle.model) {
                modelsSet.add(`${vehicle.make} ${vehicle.model}`);
                modelsSet.add(vehicle.model);
            }
        });
        return Array.from(modelsSet);
    }, [inventory]);

    // Combine inventory models with common models
    const allSuggestions = useMemo(() => {
        const allModels = new Set([...inventoryModels, ...COMMON_MODELS]);
        return Array.from(allModels).sort();
    }, [inventoryModels]);

    // Filter suggestions based on input
    const filteredSuggestions = useMemo(() => {
        if (!inputValue.trim()) return allSuggestions.slice(0, 10);
        const query = inputValue.toLowerCase();
        return allSuggestions
            .filter(model =>
                model.toLowerCase().includes(query) &&
                !models.some(m => m.toLowerCase() === model.toLowerCase())
            )
            .slice(0, 10);
    }, [inputValue, allSuggestions, models]);

    const addModel = (model: string) => {
        const trimmed = model.trim();
        if (trimmed && !models.some(m => m.toLowerCase() === trimmed.toLowerCase())) {
            onChange([...models, trimmed]);
        }
        setInputValue('');
        inputRef.current?.focus();
    };

    const removeModel = (modelToRemove: string) => {
        onChange(models.filter(m => m !== modelToRemove));
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && inputValue.trim()) {
            e.preventDefault();
            addModel(inputValue);
        } else if (e.key === 'Backspace' && !inputValue && models.length > 0) {
            removeModel(models[models.length - 1]);
        }
    };

    return (
        <div ref={containerRef} className="relative">
            {/* Tags and Input Container */}
            <div
                className="liquid-input flex flex-wrap gap-2 min-h-[44px] h-auto cursor-text"
                style={{ padding: '8px 12px' }}
                onClick={() => inputRef.current?.focus()}
            >
                {/* Model Tags */}
                {models.map((model) => (
                    <span key={model} className="model-tag">
                        {model}
                        <button
                            type="button"
                            className="remove-btn"
                            onClick={(e) => {
                                e.stopPropagation();
                                removeModel(model);
                            }}
                        >
                            <XMarkIcon className="w-3 h-3 text-white/70" />
                        </button>
                    </span>
                ))}

                {/* Input */}
                <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onFocus={() => setShowSuggestions(true)}
                    onKeyDown={handleKeyDown}
                    placeholder={models.length === 0 ? "Type a model name and press Enter..." : ""}
                    className="flex-1 min-w-[120px] bg-transparent border-none outline-none text-white placeholder:text-white/40"
                />
            </div>

            {/* Suggestions Dropdown */}
            {showSuggestions && filteredSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 z-50 liquid-card p-2 max-h-48 overflow-y-auto animate-slide-up">
                    {filteredSuggestions.map((suggestion) => (
                        <button
                            key={suggestion}
                            type="button"
                            className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-white hover:bg-white/10 rounded-lg transition"
                            onClick={() => {
                                addModel(suggestion);
                                setShowSuggestions(false);
                            }}
                        >
                            <PlusIcon className="w-4 h-4 text-white/40" />
                            {suggestion}
                        </button>
                    ))}
                </div>
            )}

            {/* Helper Text */}
            <p className="text-xs text-white/40 mt-2">
                Add model names like "Chrysler 300", "Camaro", or "Equinox" for vehicles not currently in inventory
            </p>
        </div>
    );
};

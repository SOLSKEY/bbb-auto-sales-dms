import React, { useEffect, useMemo, useRef, useState } from 'react';

export interface AppSelectOption {
    value: string;
    label: string;
    disabled?: boolean;
}

interface AppSelectProps {
    value: string;
    onChange: (value: string) => void;
    options: AppSelectOption[];
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    menuClassName?: string;
}

const AppSelect: React.FC<AppSelectProps> = ({
    value,
    onChange,
    options,
    placeholder = 'Select',
    disabled = false,
    className = '',
    menuClassName = '',
}) => {
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const buttonRef = useRef<HTMLButtonElement | null>(null);

    const selectedOption = useMemo(
        () => options.find(option => option.value === value) ?? null,
        [options, value],
    );

    useEffect(() => {
        if (disabled) {
            setOpen(false);
        }
    }, [disabled]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                containerRef.current &&
                !containerRef.current.contains(event.target as Node)
            ) {
                setOpen(false);
            }
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    const handleOptionClick = (option: AppSelectOption) => {
        if (option.disabled) return;
        onChange(option.value);
        setOpen(false);
        buttonRef.current?.focus();
    };

    const handleToggle = () => {
        if (disabled) return;
        setOpen(prev => !prev);
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
        if (disabled) return;
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setOpen(prev => !prev);
        }
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            const enabledOptions = options.filter(opt => !opt.disabled);
            if (!enabledOptions.length) return;
            const currentIndex = enabledOptions.findIndex(opt => opt.value === value);
            if (event.key === 'ArrowDown') {
                const nextOption =
                    enabledOptions[(currentIndex + 1) % enabledOptions.length];
                onChange(nextOption.value);
            } else {
                const prevOption =
                    enabledOptions[
                        (currentIndex - 1 + enabledOptions.length) % enabledOptions.length
                    ];
                onChange(prevOption.value);
            }
        }
    };

    return (
        <div className={`app-select-container ${className}`} ref={containerRef}>
            <button
                type="button"
                className={`app-select-trigger ${disabled ? 'app-select-trigger--disabled' : ''}`}
                onClick={handleToggle}
                onKeyDown={handleKeyDown}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-disabled={disabled}
                ref={buttonRef}
            >
                <span className={`app-select-label ${selectedOption ? '' : 'app-select-label--placeholder'}`}>
                    {selectedOption?.label ?? placeholder}
                </span>
                <span className="app-select-icon" aria-hidden="true">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="6 9 12 15 18 9" />
                    </svg>
                </span>
            </button>
            {open && (
                <div
                    className={`app-select-menu ${menuClassName}`}
                    role="listbox"
                    tabIndex={-1}
                >
                    {options.map(option => {
                        const isSelected = option.value === value;
                        return (
                            <button
                                type="button"
                                key={option.value}
                                role="option"
                                aria-selected={isSelected}
                                disabled={option.disabled}
                                className={`app-select-option ${
                                    isSelected ? 'app-select-option--selected' : ''
                                } ${option.disabled ? 'app-select-option--disabled' : ''}`}
                                onClick={() => handleOptionClick(option)}
                            >
                                {option.label}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default AppSelect;


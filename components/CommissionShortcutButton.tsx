import React, { useState } from 'react';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import AppSelect from './AppSelect';

const EXPORT_SERVER_URL = import.meta.env.VITE_EXPORT_SERVER_URL || 'http://localhost:3001';

/**
 * CommissionShortcutButton Component
 * 
 * Triggers automated Puppeteer workflow for Commission Report:
 * 1. Logs into the app using credentials from .env
 * 2. Navigates to Reports page (Commission Report)
 * 3. Selects the specified week (if provided)
 * 4. Sets DPR to 2.0 and zoom to 50% (like DevTools)
 * 5. Captures screenshot of target element (#commission-report-content)
 * 6. Converts screenshot to PDF with auto-sized dimensions
 * 7. Downloads the PDF as "Commission_Report.pdf"
 */
interface CommissionShortcutButtonProps {
    weekBuckets?: Array<{ key: string; label: string }>;
    selectedWeekKey?: string | null;
    onWeekChange?: (weekKey: string | null) => void;
}

const CommissionShortcutButton: React.FC<CommissionShortcutButtonProps> = ({
    weekBuckets = [],
    selectedWeekKey = null,
    onWeekChange,
}) => {
    const [isLoading, setIsLoading] = useState(false);
    const [isPressed, setIsPressed] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [localSelectedWeekKey, setLocalSelectedWeekKey] = useState<string | null>(selectedWeekKey);

    // Sync with external selectedWeekKey if provided
    React.useEffect(() => {
        if (selectedWeekKey !== undefined) {
            setLocalSelectedWeekKey(selectedWeekKey);
        }
    }, [selectedWeekKey]);

    const handleShortcut = async () => {
        setIsLoading(true);
        try {
            console.log('⚡ Starting Commission shortcut automation...');
            
            const response = await fetch(`${EXPORT_SERVER_URL}/api/shortcut-screenshot`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    reportType: 'commission',
                    weekKey: localSelectedWeekKey || undefined,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Server responded with ${response.status}`);
            }

            console.log('✅ PDF received from server');

            // Get the PDF blob
            const blob = await response.blob();

            // Create download link
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            // Include week info in filename if a week was selected
            const weekSuffix = localSelectedWeekKey 
                ? `_${localSelectedWeekKey.replace(/-/g, '')}` 
                : '';
            link.download = `Commission_Report${weekSuffix}.pdf`;
            link.href = url;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // Cleanup
            window.URL.revokeObjectURL(url);

            console.log('✅ Commission shortcut complete - PDF downloaded');

        } catch (error) {
            console.error('❌ Commission shortcut failed:', error);
            
            let errorMessage = 'Unknown error occurred';
            if (error instanceof Error) {
                errorMessage = error.message;
            }
            
            // Check if it's a connection error
            if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
                alert(
                    '❌ Cannot connect to export server.\n\n' +
                    'The export server may be temporarily unavailable. Please try again later.'
                );
            } else if (errorMessage.includes('Development server is not running') || errorMessage.includes('server is not running')) {
                alert(
                    '❌ Application server is not accessible.\n\n' +
                    'Please ensure the application is properly deployed and accessible.'
                );
            } else {
                alert(`❌ Commission shortcut failed:\n\n${errorMessage}`);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleMouseDown = () => {
        setIsPressed(true);
    };

    const handleMouseUp = () => {
        setTimeout(() => setIsPressed(false), 150);
    };

    const handleWeekChange = (value: string) => {
        const weekKey = value || null;
        setLocalSelectedWeekKey(weekKey);
        if (onWeekChange) {
            onWeekChange(weekKey);
        }
    };

    return (
        <div className="flex items-center gap-2">
            {weekBuckets.length > 0 && (
                <div className="flex items-center gap-2">
                    <label className="text-xs uppercase tracking-wide text-muted whitespace-nowrap">
                        Week:
                    </label>
                    <div className="w-56">
                        <AppSelect
                            value={localSelectedWeekKey ?? ''}
                            onChange={handleWeekChange}
                            options={weekBuckets.map(bucket => ({
                                value: bucket.key,
                                label: bucket.label,
                            }))}
                            disabled={isLoading}
                        />
                    </div>
                </div>
            )}
            <button
                onClick={handleShortcut}
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => {
                    setIsHovered(false);
                    setIsPressed(false);
                }}
                disabled={isLoading}
                className={`glass-card-accent px-6 py-3.5 text-sm font-semibold text-white rounded-full print:hidden transition-all duration-300 flex items-center gap-2 relative overflow-hidden ${
                    isPressed ? 'scale-95' : 'scale-100'
                } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                style={{
                    boxShadow: isHovered 
                        ? '0 0 20px rgba(34, 211, 238, 0.8), 0 0 40px rgba(6, 182, 212, 0.6), inset 0 0 30px rgba(34, 211, 238, 0.4)'
                        : undefined,
                    backgroundColor: isHovered 
                        ? 'rgba(34, 211, 238, 0.15)'
                        : undefined,
                }}
                title="Automated export: Login → Commission Report → Select Week → Screenshot (DPR 2.0, 50% zoom) → PDF"
            >
                {/* Interior glow overlay */}
                {isHovered && (
                    <div 
                        className="absolute inset-0 rounded-full"
                        style={{
                            background: 'radial-gradient(circle at center, rgba(34, 211, 238, 0.3) 0%, transparent 70%)',
                            pointerEvents: 'none',
                        }}
                    />
                )}
                <ArrowDownTrayIcon className="h-5 w-5 relative z-10" />
                <span className="relative z-10">{isLoading ? 'Exporting...' : 'Export'}</span>
            </button>
        </div>
    );
};

export default CommissionShortcutButton;


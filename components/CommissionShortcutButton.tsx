import React, { useState } from 'react';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';

/**
 * CommissionShortcutButton Component
 * 
 * Triggers automated Puppeteer workflow for Commission Report:
 * 1. Logs into the app using credentials from .env
 * 2. Navigates to Reports page (Commission Report)
 * 3. Sets DPR to 2.0 and zoom to 50% (like DevTools)
 * 4. Captures screenshot of target element (#commission-report-content)
 * 5. Converts screenshot to PDF with auto-sized dimensions
 * 6. Downloads the PDF as "Commission_Report.pdf"
 */
const CommissionShortcutButton: React.FC = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [isPressed, setIsPressed] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    const handleShortcut = async () => {
        setIsLoading(true);
        try {
            console.log('⚡ Starting Commission shortcut automation...');
            
            const response = await fetch('http://localhost:3001/api/shortcut-screenshot', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ reportType: 'commission' }),
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
            link.download = 'Commission_Report.pdf';
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
                    'Make sure the export server is running:\n' +
                    '  npm run export-server\n\n' +
                    'The export server should be running on http://localhost:3001'
                );
            } else if (errorMessage.includes('Development server is not running')) {
                alert(
                    '❌ Development server is not running.\n\n' +
                    'Please start the dev server first:\n' +
                    '  npm run dev\n\n' +
                    'The shortcut automation needs the dev server to be running on http://localhost:3000'
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

    return (
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
            title="Automated export: Login → Commission Report → Screenshot (DPR 2.0, 50% zoom) → PDF"
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
    );
};

export default CommissionShortcutButton;


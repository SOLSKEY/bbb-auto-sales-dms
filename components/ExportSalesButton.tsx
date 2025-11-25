import React, { useState } from 'react';
import { toPng } from 'html-to-image';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { GlassButton } from '@/components/ui/glass-button';

interface ExportSalesButtonProps {
    containerId: string;
    filename?: string;
    className?: string;
    label?: string;
}

const ExportSalesButton: React.FC<ExportSalesButtonProps> = ({
    containerId,
    filename = `Sales_Report_${new Date().toISOString().split('T')[0]}.png`,
    className,
    label = 'Export Report',
}) => {
    const [isExporting, setIsExporting] = useState(false);

    const handleExport = async () => {
        const element = document.getElementById(containerId);
        if (!element) {
            console.error(`Element with id "${containerId}" not found`);
            return;
        }

        setIsExporting(true);

        try {
            // Force the browser width to 2000px for the capture to ensure correct responsive layout
            // and set pixelRatio to 2 for high quality
            const dataUrl = await toPng(element, {
                width: 2000,
                style: {
                    width: '2000px',
                    height: 'auto',
                    // Ensure the background is preserved if it's transparent or specific
                    backgroundColor: '#0f172a', // Assuming a dark theme background, adjust if needed
                },
                pixelRatio: 2,
                cacheBust: true,
            });

            const link = document.createElement('a');
            link.download = filename;
            link.href = dataUrl;
            link.click();
        } catch (err) {
            console.error('Failed to export sales report:', err);
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <GlassButton
            onClick={handleExport}
            disabled={isExporting}
            className={`flex items-center gap-2 ${className || ''}`}
        >
            <ArrowDownTrayIcon className="h-4 w-4" />
            {isExporting ? 'Exporting...' : label}
        </GlassButton>
    );
};

export default ExportSalesButton;

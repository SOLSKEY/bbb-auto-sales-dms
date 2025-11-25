import React from 'react';
import { PrinterIcon } from '@heroicons/react/24/outline';
import { GlassButton } from '@/components/ui/glass-button';
import { downloadHtmlElementAsPdf } from '../utils/export';

interface PrintButtonProps {
    className?: string;
    label?: string;
    variant?: 'default' | 'icon';
    containerId?: string; // ID of the element to export as PDF
    containerRef?: React.RefObject<HTMLElement | null>; // Ref to the element to export
    filename?: string; // Optional filename for PDF export
    title?: string; // Optional title for PDF export - set to undefined to omit
}

const PrintButton: React.FC<PrintButtonProps> = ({
    className = '',
    label = 'Export as PDF',
    variant = 'default',
    containerId,
    containerRef,
    filename,
    title,
    ...props
}) => {
    const handleExport = async () => {
        console.log('PrintButton clicked, containerId:', containerId, 'containerRef:', containerRef);
        
        // Try to find the container to export - prefer ref over ID
        let container: HTMLElement | null = null;
        
        if (containerRef?.current) {
            container = containerRef.current;
            console.log('Found container by ref:', container);
        } else if (containerId) {
            container = document.getElementById(containerId);
            console.log('Found container by ID:', container);
        }
        
        // If no container found by ID/ref, try to find common container elements
        if (!container) {
            // Look for common container IDs used in the app
            container = document.getElementById('reports-export-container') ||
                       document.getElementById('collections-analytics-export') ||
                       document.querySelector('main') ||
                       document.body;
            console.log('Using fallback container:', container);
        }
        
        if (container) {
            try {
                console.log('Starting PDF export...');
                await downloadHtmlElementAsPdf(container, {
                    filename: filename || `export-${new Date().toISOString().split('T')[0]}.pdf`,
                    title: title, // Pass undefined to omit title
                });
                return;
            } catch (error) {
                console.error('Failed to export PDF:', error);
                alert(`Failed to export PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
                return;
            }
        }
        
        console.warn('No container found, using browser print');
        // Fallback to browser print if no container found
        window.print();
    };

    return (
        <GlassButton
            onClick={handleExport}
            className={`print:hidden ${className}`}
            contentClassName="flex items-center gap-2"
            size={variant === 'icon' ? 'icon' : 'default'}
            title="Export as PDF / Print"
            {...props}
        >
            <PrinterIcon className="h-5 w-5" />
            {variant === 'default' && <span>{label}</span>}
        </GlassButton>
    );
};

export default PrintButton;

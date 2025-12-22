import React from 'react';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { GlassButton } from '@/components/ui/glass-button';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';

interface ExportReportButtonProps {
    className?: string;
    label?: string;
    containerId: string; // ID of the element to export as PNG
    format?: 'pdf' | 'png'; // Export format
}

/**
 * ExportReportButton Component
 *
 * Creates a perfect, flat, bitmap-to-PDF or PNG copy with ZERO text reflow.
 *
 * Critical Design:
 * - Captures element as PNG raster image (NOT vector, NOT SVG)
 * - Treats the capture as a static photograph
 * - Places the image onto PDF without ANY text interpretation
 * - Result: Pixel-perfect copy, no overlaps, no broken layout
 *
 * Process:
 * 1. Capture as flat PNG bitmap using html-to-image.toPng()
 * 2. Get exact image dimensions (width x height in pixels)
 * 3. Create custom-sized PDF page (image size + 0.1" margins)
 * 4. Place image at 1:1 ratio - pure bitmap paste, no reformatting
 */
const ExportReportButton: React.FC<ExportReportButtonProps> = ({
    className = '',
    label = 'Export Report',
    containerId,
    filename,
    format = 'pdf',
}) => {
    const handleExport = async () => {
        const container = document.getElementById(containerId);

        if (!container) {
            alert(`Export container not found. Make sure the element with ID "${containerId}" exists.`);
            return;
        }

        try {
            console.log(`Starting flat bitmap PNG capture for ${format.toUpperCase()} export...`);
            console.log('Target container:', containerId);

            // Store original styles to restore later
            const originalWidth = container.style.width;
            const originalMaxWidth = container.style.maxWidth;
            const originalMinWidth = container.style.minWidth;
            const originalOverflow = container.style.overflow;
            const originalOverflowX = container.style.overflowX;
            const originalOverflowY = container.style.overflowY;

            // Store parent overflow styles to allow full content rendering
            const parentElements: Array<{ el: HTMLElement; overflow: string; overflowY: string; overflowX: string }> = [];
            let currentParent = container.parentElement;
            while (currentParent && currentParent !== document.body) {
                const computed = window.getComputedStyle(currentParent);
                if (computed.overflow !== 'visible' || computed.overflowY !== 'visible') {
                    parentElements.push({
                        el: currentParent,
                        overflow: currentParent.style.overflow,
                        overflowY: currentParent.style.overflowY,
                        overflowX: currentParent.style.overflowX,
                    });
                    // Allow full content rendering
                    currentParent.style.overflow = 'visible';
                    currentParent.style.overflowY = 'visible';
                    currentParent.style.overflowX = 'visible';
                }
                currentParent = currentParent.parentElement;
            }

            // Ensure no content is clipped
            container.style.overflow = 'visible';
            container.style.overflowX = 'visible';
            container.style.overflowY = 'visible';

            // Hide scrollbars temporarily
            const style = document.createElement('style');
            style.id = 'export-hide-scrollbars';
            style.textContent = `
                *::-webkit-scrollbar {
                    display: none !important;
                }
                * {
                    -ms-overflow-style: none !important;
                    scrollbar-width: none !important;
                }
            `;
            document.head.appendChild(style);

            // Scroll to top to capture from beginning
            container.scrollTop = 0;
            let scrollParent: HTMLElement | null = container;
            while (scrollParent && scrollParent !== document.body) {
                scrollParent.scrollTop = 0;
                scrollParent.scrollLeft = 0;
                scrollParent = scrollParent.parentElement;
            }

            // Force reflow to apply styles
            void container.offsetHeight;

            // Scroll element into view
            container.scrollIntoView({ behavior: 'instant', block: 'start' });

            // Wait for CSS to fully render (including animations, backdrop-filter, etc.)
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Verify element is visible
            const rect = container.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) {
                throw new Error('Element is not visible or has zero dimensions');
            }

            // Get background color from document
            const body = document.body;
            const bodyBg = window.getComputedStyle(body).backgroundColor;
            const backgroundColor = (bodyBg && bodyBg !== 'rgba(0, 0, 0, 0)' && bodyBg !== 'transparent')
                ? bodyBg
                : '#0a0a0a'; // Default dark background

            // ========================================
            // STEP 1: Capture as Flat Bitmap Image (PNG)
            // ========================================
            // CRITICAL: We are creating a PNG (raster/bitmap image), NOT SVG or vector format
            // This flattens ALL text and elements into a single static photograph
            // The PDF will contain ONLY this image - NO text interpretation or reflow
            console.log('Step 1: Capturing as flat PNG bitmap (raster image)...');

            // Use DPR 3 for PNG export (higher quality), DPR 2 for PDF (balance size/quality)
            const pixelRatio = format === 'png' ? 3 : 2;
            console.log(`Width: 2000px, PixelRatio: ${pixelRatio} (produces ${2000 * pixelRatio}px wide image)`);

            const imgData = await toPng(container, {
                quality: 1.0, // Maximum quality (lossless PNG)
                pixelRatio: pixelRatio,
                width: 2000, // Force layout width
                windowWidth: 2000, // Simulate desktop viewport
                style: {
                    maxWidth: 'none',
                    width: '2000px',
                    overflow: 'visible',
                    height: 'auto' // Ensure full height is captured
                },
                backgroundColor: backgroundColor,
                cacheBust: true, // Force fresh capture
                skipFonts: true, // Skip external fonts to avoid CORS errors
                includeQueryParams: true,
            } as any);

            console.log('✓ PNG bitmap captured (static image - text is now pixels)');

            // Clean up temporary styles
            const styleTag = document.getElementById('export-hide-scrollbars');
            if (styleTag) {
                styleTag.remove();
            }

            // Restore original styles
            container.style.width = originalWidth;
            container.style.maxWidth = originalMaxWidth;
            container.style.minWidth = originalMinWidth;
            container.style.overflow = originalOverflow;
            container.style.overflowX = originalOverflowX;
            container.style.overflowY = originalOverflowY;

            // Restore parent overflow styles
            parentElements.forEach(({ el, overflow, overflowY, overflowX }) => {
                el.style.overflow = overflow;
                el.style.overflowY = overflowY;
                el.style.overflowX = overflowX;
            });

            // If PNG format, download directly and return
            if (format === 'png') {
                const downloadFilename = filename || `Sales_Report_${new Date().toISOString().split('T')[0]}.png`;
                console.log('Downloading PNG:', downloadFilename);

                const link = document.createElement('a');
                link.href = imgData;
                link.download = downloadFilename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                console.log('✓ PNG exported successfully!');
                return;
            }

            // ========================================
            // STEP 2: Get Exact Image Dimensions
            // ========================================
            // Load the PNG to find its exact width and height in pixels
            console.log('Step 2: Loading image to get exact dimensions...');

            const img = new Image();
            img.src = imgData;
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
            });

            // Get the EXACT dimensions of the PNG image
            // With pixelRatio: 2 and width: 2000, this should be 4000px wide
            const imgWidthPx = img.width;
            const imgHeightPx = img.height;

            console.log('✓ Image dimensions:', { width: imgWidthPx, height: imgHeightPx, unit: 'pixels' });

            // ========================================
            // STEP 3: Convert Pixels to PDF Points
            // ========================================
            // PDF uses "points" as units (1 inch = 72 points)
            // Standard conversion: 1 pixel = 0.75 points (at 96 DPI)
            const PX_TO_PT = 0.75;
            const imgWidthPt = imgWidthPx * PX_TO_PT;
            const imgHeightPt = imgHeightPx * PX_TO_PT;

            console.log('✓ Image dimensions in PDF points:', { width: imgWidthPt, height: imgHeightPt });

            // ========================================
            // STEP 4: Set Margins (0.1 inch = 7.2 points)
            // ========================================
            const MARGIN_INCHES = 0.1;
            const MARGIN_PT = MARGIN_INCHES * 72; // 0.1 inch = 7.2 points

            console.log('✓ Margin:', MARGIN_PT, 'points (0.1 inch on all sides)');

            // ========================================
            // STEP 5: Calculate Auto-Sized PDF Page Dimensions
            // ========================================
            // Total PDF Width = Image Width + (Margin × 2)
            // Total PDF Height = Image Height + (Margin × 2)
            const pageWidthPt = imgWidthPt + (MARGIN_PT * 2);
            const pageHeightPt = imgHeightPt + (MARGIN_PT * 2);

            console.log('✓ PDF page size (auto-calculated):', {
                width: pageWidthPt,
                height: pageHeightPt,
                unit: 'points',
                note: 'Custom size - NOT using A4 or Letter'
            });

            // ========================================
            // STEP 6: Create Custom-Sized PDF Document
            // ========================================
            // CRITICAL: Use exact calculated dimensions, NOT standard paper sizes
            // This ensures the PDF wraps the image perfectly
            console.log('Step 6: Creating PDF with custom dimensions...');

            const pdf = new jsPDF({
                orientation: pageWidthPt > pageHeightPt ? 'landscape' : 'portrait',
                unit: 'pt', // Use points as unit
                format: [pageWidthPt, pageHeightPt], // CUSTOM page size (exact fit)
                compress: true,
            });

            console.log('✓ PDF created with exact custom page size');

            // ========================================
            // STEP 7: Place Image as Bitmap (1:1 Ratio)
            // ========================================
            // CRITICAL: Place the PNG as a static bitmap image
            // - Position: (7.2, 7.2) - offset by margin
            // - Size: EXACT original image dimensions in points
            // - Result: 1:1 placement - NO stretching, NO text interpretation
            console.log('Step 7: Placing PNG bitmap onto PDF (1:1 ratio - no reflow)...');

            pdf.addImage(
                imgData, // PNG data URL (bitmap image)
                'PNG', // Image format
                MARGIN_PT, // x: 7.2 points from left edge
                MARGIN_PT, // y: 7.2 points from top edge
                imgWidthPt, // EXACT width in points (matches image)
                imgHeightPt, // EXACT height in points (matches image)
                undefined, // alias (optional)
                'FAST' // compression type
            );

            console.log('✓ Image placed at exact 1:1 ratio');
            console.log('  Position: (7.2, 7.2) points');
            console.log('  Size:', imgWidthPt, '×', imgHeightPt, 'points');
            console.log('  Result: Pure bitmap paste - NO text reflow or reformatting');

            // ========================================
            // STEP 8: Download PDF
            // ========================================
            const downloadFilename = filename || 'Sales_Report_Dashboard.pdf';

            console.log('Step 8: Saving PDF as:', downloadFilename);
            pdf.save(downloadFilename);

            console.log('✓ PDF exported successfully!');
            console.log('✓ Perfect flat bitmap copy - zero text reflow or overlaps');

        } catch (error) {
            console.error(`Failed to export ${format.toUpperCase()}:`, error);
            alert(`Failed to export ${format.toUpperCase()}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    return (
        <GlassButton
            onClick={handleExport}
            className={`print:hidden ${className}`}
            contentClassName="flex items-center gap-2"
            title={`Export as ${format === 'png' ? 'High-Res PNG (DPR 3.0)' : 'Auto-Sized PDF (DPR 2.0)'}`}
        >
            <ArrowDownTrayIcon className="h-5 w-5" />
            {label && <span>{label}</span>}
        </GlassButton>
    );
};

export default ExportReportButton;

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { toPng } from 'html-to-image';

const escapeCsvValue = (value: unknown): string => {
    if (value === null || value === undefined) return '';
    const stringValue = String(value);
    if (stringValue.includes('"') || stringValue.includes(',') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
};

export const downloadCsv = (filename: string, rows: Array<Record<string, unknown>>) => {
    if (!rows.length) {
        console.warn('downloadCsv called with no rows.');
        return;
    }

    const headers = Object.keys(rows[0]);
    const csvLines = [
        headers.join(','),
        ...rows.map(row => headers.map(header => escapeCsvValue(row[header])).join(',')),
    ];

    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
};

interface PdfExportOptions {
    title: string;
    filename: string;
}

export const downloadTablePdf = async (
    rows: Array<Record<string, unknown>>,
    options: PdfExportOptions,
) => {
    if (!rows.length) {
        console.warn('downloadTablePdf called with no rows.');
        return;
    }

    const headers = Object.keys(rows[0]);
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'letter' });
    const margin = 48;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text(options.title, margin, 50);

    const rowMatrix = rows.map(row => headers.map(header => String(row[header] ?? '')));
    const rowMeta = rows.map(row => {
        const salesperson = String(row[headers[0]] ?? '');
        return {
            isTotal: /total/i.test(salesperson),
            isSummary: /summary/i.test(salesperson),
        };
    });

    autoTable(doc, {
        head: [headers],
        body: rowMatrix,
        startY: 72,
        styles: {
            fillColor: [26, 29, 33],
            textColor: [255, 255, 255],
            fontSize: 10,
            cellPadding: 8,
            halign: 'left',
        },
        headStyles: {
            fillColor: [44, 47, 51],
            textColor: [255, 255, 255],
            fontSize: 11,
            fontStyle: 'bold',
        },
        alternateRowStyles: {
            fillColor: [42, 45, 50],
        },
        margin: { left: margin, right: margin },
        tableLineColor: [68, 72, 78],
        tableLineWidth: 0.5,
        didParseCell: data => {
            if (data.section === 'body') {
                const meta = rowMeta[data.row.index];
                if (meta?.isTotal || meta?.isSummary) {
                    data.cell.styles.fillColor = [255, 69, 0];
                    data.cell.styles.textColor = [255, 255, 255];
                    data.cell.styles.fontStyle = 'bold';
                }
            }
        },
    });

    doc.save(options.filename);
};

interface HtmlPdfExportOptions {
    title?: string;
    filename: string;
}

interface HtmlPngExportOptions {
    filename: string;
}

/**
 * Take a screenshot of the page/element and save as PDF
 * Captures exactly what's visible on screen, like a screenshot
 */
export const downloadHtmlElementAsPdf = async (
    element: HTMLElement,
    options: HtmlPdfExportOptions,
) => {
    if (!element) {
        console.warn('downloadHtmlElementAsPdf called with no element.');
        return;
    }

    console.log('Starting PDF export for element:', element);

    // DON'T add pdf-export-mode class - we want to capture exactly as it appears
    // Store original scroll position
    const originalScrollX = window.scrollX;
    const originalScrollY = window.scrollY;
    
    // Letter size paper dimensions (8.5" x 11" = 215.9mm x 279.4mm)
    // Letter size aspect ratio: 8.5/11 = 0.7727 (portrait)
    const LETTER_WIDTH_MM = 215.9;
    const LETTER_HEIGHT_MM = 279.4;
    const LETTER_ASPECT_RATIO = LETTER_WIDTH_MM / LETTER_HEIGHT_MM; // 0.7727
    
    // Hide sidebar and header during export (use visibility instead of display to avoid layout shift)
    const sidebar = document.querySelector('nav.floating-sidebar-outline');
    const header = document.querySelector('header.glass-card-outline');
    const sidebarOriginalVisibility = sidebar ? window.getComputedStyle(sidebar as HTMLElement).visibility : null;
    const sidebarOriginalOpacity = sidebar ? window.getComputedStyle(sidebar as HTMLElement).opacity : null;
    const headerOriginalVisibility = header ? window.getComputedStyle(header as HTMLElement).visibility : null;
    const headerOriginalOpacity = header ? window.getComputedStyle(header as HTMLElement).opacity : null;
    
    try {
        // Hide sidebar and header invisibly (use visibility: hidden and opacity: 0 to prevent layout shift)
        if (sidebar) {
            (sidebar as HTMLElement).style.visibility = 'hidden';
            (sidebar as HTMLElement).style.opacity = '0';
            (sidebar as HTMLElement).style.pointerEvents = 'none';
            console.log('Hiding sidebar for PDF export (invisible)');
        }
        if (header) {
            (header as HTMLElement).style.visibility = 'hidden';
            (header as HTMLElement).style.opacity = '0';
            (header as HTMLElement).style.pointerEvents = 'none';
            console.log('Hiding header for PDF export (invisible)');
        }
        
        // Wait a moment for layout to settle after hiding sidebar/header
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Store original element styles to restore later
        const originalElementOverflow = element.style.overflow;
        const originalElementOverflowY = element.style.overflowY;
        const originalElementOverflowX = element.style.overflowX;
        const originalElementHeight = element.style.height;
        const originalElementWidth = element.style.width;
        const originalElementMaxWidth = element.style.maxWidth;
        const originalElementMinWidth = element.style.minWidth;
        
        // Get the natural content dimensions
        const naturalRect = element.getBoundingClientRect();
        const naturalWidth = naturalRect.width;
        const naturalHeight = element.scrollHeight || naturalRect.height;
        const naturalAspectRatio = naturalWidth / naturalHeight;
        
        // Calculate optimal width for letter-size paper
        // We want to capture at a width that matches letter-size aspect ratio
        // This minimizes white space in the final PDF
        const viewportWidth = window.innerWidth - (sidebar ? 256 : 0); // Subtract sidebar width (64 * 4 = 256px)
        const optimalWidth = Math.min(viewportWidth - 100, naturalWidth); // Leave some margin
        
        // Calculate the height we'll get with this width (maintaining content's natural aspect)
        // But we want to capture full height, so we'll use scrollHeight
        const fullHeight = element.scrollHeight || naturalHeight;
        
        // Adjust element width to optimal size for letter-size capture
        // Set width temporarily to match letter-size aspect ratio better
        const targetWidth = optimalWidth;
        element.style.width = `${targetWidth}px`;
        element.style.maxWidth = `${targetWidth}px`;
        element.style.minWidth = 'auto';
        
        // Force a reflow to apply width changes
        void element.offsetHeight;
        
        // Store overflow styles for all parent elements that might clip content
        const parentElements: Array<{ el: HTMLElement; overflow: string; overflowY: string; overflowX: string; height: string }> = [];
        let currentParent = element.parentElement;
        while (currentParent && currentParent !== document.body) {
            const computed = window.getComputedStyle(currentParent);
            if (computed.overflow !== 'visible' || computed.overflowY !== 'visible' || computed.height !== 'auto') {
                parentElements.push({
                    el: currentParent,
                    overflow: currentParent.style.overflow,
                    overflowY: currentParent.style.overflowY,
                    overflowX: currentParent.style.overflowX,
                    height: currentParent.style.height,
                });
                // Temporarily set to allow full content rendering
                currentParent.style.overflow = 'visible';
                currentParent.style.overflowY = 'visible';
                currentParent.style.overflowX = 'visible';
            }
            currentParent = currentParent.parentElement;
        }
        
        // Ensure element itself can render full content without clipping
        // Set overflow to visible temporarily to capture full content
        element.style.overflow = 'visible';
        element.style.overflowY = 'visible';
        element.style.overflowX = 'visible';
        
        // Hide scrollbars by adding a style tag temporarily
        const style = document.createElement('style');
        style.id = 'pdf-export-hide-scrollbars';
        style.textContent = `
            *::-webkit-scrollbar {
                display: none !important;
                width: 0 !important;
                height: 0 !important;
            }
            * {
                -ms-overflow-style: none !important;
                scrollbar-width: none !important;
            }
            [id="commission-report-export-container"],
            [id="commission-report-content"],
            [id="sales-analytics-export-container"] {
                overflow: visible !important;
                overflow-y: visible !important;
                overflow-x: visible !important;
            }
        `;
        document.head.appendChild(style);
        
        // Scroll element and all scrollable parents to top to capture from beginning
        element.scrollTop = 0;
        let scrollParent: HTMLElement | null = element;
        while (scrollParent && scrollParent !== document.body) {
            scrollParent.scrollTop = 0;
            scrollParent.scrollLeft = 0;
            scrollParent = scrollParent.parentElement;
        }
        
        // Force a reflow to ensure styles are applied
        void element.offsetHeight;
        
        // Find the parent element with animated-bg class to include background blobs
        let captureElement = element;
        let animatedBgParent = element.closest('.animated-bg');
        
        if (animatedBgParent) {
            console.log('Found animated-bg parent, capturing with background blobs');
            // Capture the animated-bg container to include the background orbs
            captureElement = animatedBgParent as HTMLElement;
        } else {
            // Try to find any parent that might have the background
            let parent = element.parentElement;
            while (parent && parent !== document.body) {
                if (parent.classList.contains('animated-bg')) {
                    captureElement = parent;
                    animatedBgParent = parent;
                    console.log('Found animated-bg in parent tree');
                    break;
                }
                parent = parent.parentElement;
            }
        }
        
        // Ensure capture element also doesn't clip content
        const originalCaptureOverflow = captureElement.style.overflow;
        const originalCaptureOverflowY = captureElement.style.overflowY;
        captureElement.style.overflow = 'visible';
        captureElement.style.overflowY = 'visible';
    
        // Scroll element into view without changing appearance
        captureElement.scrollIntoView({ behavior: 'instant', block: 'start' });
        
        // Get the final dimensions after width adjustment
        const finalRect = element.getBoundingClientRect();
        const finalWidth = finalRect.width;
        const finalHeight = element.scrollHeight || finalRect.height;
        
        console.log('Element dimensions:', {
            natural: { width: naturalWidth, height: naturalHeight },
            final: { width: finalWidth, height: finalHeight },
            optimalWidth: targetWidth,
            letterAspectRatio: LETTER_ASPECT_RATIO,
        });
        
        // Wait longer for all CSS to fully render, including backdrop-filter effects and background orbs
        // Give animations time to render their current frame and content to fully load
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Make sure element is fully visible and rendered
        const rect = captureElement.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
            throw new Error('Element is not visible or has zero dimensions');
        }

        console.log('Capturing screenshot with background blobs...', {
            element: captureElement.className,
            width: rect.width,
            height: rect.height,
            visible: rect.width > 0 && rect.height > 0,
            hasAnimatedBg: !!animatedBgParent,
        });

        // Get the computed background color from body or root element
        const body = document.body;
        const html = document.documentElement;
        const bodyBg = window.getComputedStyle(body).backgroundColor;
        const htmlBg = window.getComputedStyle(html).backgroundColor;
        
        // Try to get the actual dark background color
        // Default to dark theme background (#0a0a0a or #050505)
        let backgroundColor = '#0a0a0a'; // Default dark background
        
        if (bodyBg && bodyBg !== 'rgba(0, 0, 0, 0)' && bodyBg !== 'transparent') {
            backgroundColor = bodyBg;
        } else if (htmlBg && htmlBg !== 'rgba(0, 0, 0, 0)' && htmlBg !== 'transparent') {
            backgroundColor = htmlBg;
        } else {
            // Try to get from element's parent or check if it has a dark background class
            const parent = element.parentElement;
            if (parent) {
                const parentBg = window.getComputedStyle(parent).backgroundColor;
                if (parentBg && parentBg !== 'rgba(0, 0, 0, 0)' && parentBg !== 'transparent') {
                    backgroundColor = parentBg;
                }
            }
        }

        console.log('Background color:', backgroundColor, 'from body:', bodyBg, 'from html:', htmlBg);

        // Use html-to-image which better supports CSS effects like backdrop-filter
        // This library uses SVG foreignObject which preserves more CSS features
        // Capture the element (or its animated-bg parent) to include background blobs
        // The library should capture the full scrollable height automatically
        // Set DPR to 3.0 (exactly like Chrome DevTools Device Toolbar with DPR 3.0)
        // This captures at 3x resolution for ultra-sharp screenshots
        const DEVICE_PIXEL_RATIO = 3.0; // Match Chrome DevTools DPR 3.0 setting
        
        console.log('Capturing screenshot with DPR 3.0 (like Chrome DevTools)...');
        const imgData = await toPng(captureElement, {
            quality: 1.0, // Maximum quality (0-1, 1.0 = lossless)
            pixelRatio: DEVICE_PIXEL_RATIO, // DPR 3.0 = 3x resolution (like Chrome DevTools)
            backgroundColor: backgroundColor, // Explicitly set dark background
            cacheBust: true, // Force fresh capture (bypass cache)
            skipFonts: false, // Include all fonts for accurate rendering
            fontEmbedCSS: '', // Don't modify font CSS (preserve original fonts)
            includeQueryParams: true, // Include query params for resources
            style: {
                // Ensure high-quality rendering
                transform: 'scale(1)',
                transformOrigin: 'top left',
            },
            filter: (node) => {
                // Hide elements that shouldn't be in PDF
                if (node instanceof HTMLElement) {
                    return !node.classList.contains('pdf-hide') && 
                           !node.classList.contains('print:hidden');
                }
                return true;
            },
            // Don't override any styles - preserve original appearance
            // html-to-image should capture backdrop-filter effects better than html2canvas
        });
        
        console.log('High-resolution PNG captured at DPR 3.0');
        
        // Remove temporary style tag
        const styleTag = document.getElementById('pdf-export-hide-scrollbars');
        if (styleTag) {
            styleTag.remove();
        }
        
        // Restore original element styles
        element.style.overflow = originalElementOverflow;
        element.style.overflowY = originalElementOverflowY;
        element.style.overflowX = originalElementOverflowX;
        element.style.height = originalElementHeight;
        element.style.width = originalElementWidth;
        element.style.maxWidth = originalElementMaxWidth;
        element.style.minWidth = originalElementMinWidth;
        
        captureElement.style.overflow = originalCaptureOverflow;
        captureElement.style.overflowY = originalCaptureOverflowY;
        
        // Restore parent overflow styles
        parentElements.forEach(({ el, overflow, overflowY, overflowX, height }) => {
            el.style.overflow = overflow;
            el.style.overflowY = overflowY;
            el.style.overflowX = overflowX;
            el.style.height = height;
        });

        console.log('Screenshot captured, creating image element...');

        // Create image element to get dimensions
        const img = new Image();
        img.src = imgData;
        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
        });

        const imgWidth = img.width;
        const imgHeight = img.height;

        console.log('High-resolution PNG dimensions:', imgWidth, 'x', imgHeight, 'at DPR 3.0');
        console.log('Converting PNG to PDF...');

        // Restore original scroll position
        window.scrollTo(originalScrollX, originalScrollY);

        console.log('Creating PDF with image:', imgWidth, 'x', imgHeight);

        // Calculate aspect ratio
        const aspectRatio = imgWidth / imgHeight;
        
        // Use Letter size page (8.5" x 11" = 215.9mm x 279.4mm)
        const pdfWidth = LETTER_WIDTH_MM;
        const pdfHeight = LETTER_HEIGHT_MM;
        
        // Determine orientation based on content
        // If content is wider than tall, use landscape; otherwise portrait
        const isLandscape = aspectRatio > 1;
        
        const pdf = new jsPDF({
            orientation: isLandscape ? 'landscape' : 'portrait',
            unit: 'mm',
            format: [LETTER_WIDTH_MM, LETTER_HEIGHT_MM], // Letter size in mm
            compress: false, // No compression
        });

        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();

        // Scale image to fill entire PDF page (no margins, no title)
        // Calculate scale factors to fill the page while maintaining aspect ratio
        const widthRatio = pageWidth / imgWidth;
        const heightRatio = pageHeight / imgHeight;
        
        // Use the smaller ratio to fit the entire image on the page without cropping
        // This ensures all content fits while maximizing page usage
        const scale = Math.min(widthRatio, heightRatio);
        
        const scaledWidth = imgWidth * scale;
        const scaledHeight = imgHeight * scale;
        
        // Center the content on the page
        // With optimized dimensions, there should be minimal white space
        const xOffset = (pageWidth - scaledWidth) / 2;
        const yOffset = (pageHeight - scaledHeight) / 2;

        console.log('PDF scaling:', {
            imageDimensions: { width: imgWidth, height: imgHeight },
            pageDimensions: { width: pageWidth, height: pageHeight },
            scale,
            scaledDimensions: { width: scaledWidth, height: scaledHeight },
            offsets: { x: xOffset, y: yOffset },
        });

        // Add image scaled to fit the page - fills as much of the page as possible
        pdf.addImage(imgData, 'PNG', xOffset, yOffset, scaledWidth, scaledHeight, undefined, 'FAST');

        console.log('Saving PDF:', options.filename);
        pdf.save(options.filename);
    } catch (error) {
        console.error('Error generating PDF:', error);
        alert(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
        throw error;
    } finally {
        // Restore sidebar and header visibility
        if (sidebar && sidebarOriginalVisibility !== null) {
            (sidebar as HTMLElement).style.visibility = sidebarOriginalVisibility;
            (sidebar as HTMLElement).style.opacity = sidebarOriginalOpacity || '1';
            (sidebar as HTMLElement).style.pointerEvents = 'auto';
            console.log('Restoring sidebar visibility');
        }
        if (header && headerOriginalVisibility !== null) {
            (header as HTMLElement).style.visibility = headerOriginalVisibility;
            (header as HTMLElement).style.opacity = headerOriginalOpacity || '1';
            (header as HTMLElement).style.pointerEvents = 'auto';
            console.log('Restoring header visibility');
        }
        
        // Restore scroll position
        window.scrollTo(originalScrollX, originalScrollY);
    }
};

/**
 * Capture an element as a high-resolution PNG screenshot (like Chrome DevTools "Capture Node Screenshot" with DPR 3.0)
 * This automates the manual process of:
 * 1. Opening DevTools Device Toolbar
 * 2. Setting percentage to 50%
 * 3. Setting DPR to 3.0
 * 4. Right-clicking the element and selecting "Capture Node Screenshot"
 */
export const downloadHtmlElementAsPng = async (
    element: HTMLElement,
    options: HtmlPngExportOptions,
) => {
    if (!element) {
        console.warn('downloadHtmlElementAsPng called with no element.');
        return;
    }

    console.log('Starting PNG export (like Chrome DevTools Capture Node Screenshot)...');

    // Store original scroll position
    const originalScrollX = window.scrollX;
    const originalScrollY = window.scrollY;
    
    // Hide sidebar and header during export (use visibility instead of display to avoid layout shift)
    const sidebar = document.querySelector('nav.floating-sidebar-outline');
    const header = document.querySelector('header.glass-card-outline');
    const sidebarOriginalVisibility = sidebar ? window.getComputedStyle(sidebar as HTMLElement).visibility : null;
    const sidebarOriginalOpacity = sidebar ? window.getComputedStyle(sidebar as HTMLElement).opacity : null;
    const headerOriginalVisibility = header ? window.getComputedStyle(header as HTMLElement).visibility : null;
    const headerOriginalOpacity = header ? window.getComputedStyle(header as HTMLElement).opacity : null;
    
    try {
        // Hide sidebar and header invisibly (use visibility: hidden and opacity: 0 to prevent layout shift)
        if (sidebar) {
            (sidebar as HTMLElement).style.visibility = 'hidden';
            (sidebar as HTMLElement).style.opacity = '0';
            (sidebar as HTMLElement).style.pointerEvents = 'none';
            console.log('Hiding sidebar for PNG export (invisible)');
        }
        if (header) {
            (header as HTMLElement).style.visibility = 'hidden';
            (header as HTMLElement).style.opacity = '0';
            (header as HTMLElement).style.pointerEvents = 'none';
            console.log('Hiding header for PNG export (invisible)');
        }
        
        // Wait a moment for layout to settle after hiding sidebar/header
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Store original element styles to restore later
        const originalElementOverflow = element.style.overflow;
        const originalElementOverflowY = element.style.overflowY;
        const originalElementOverflowX = element.style.overflowX;
        
        // Store overflow styles for all parent elements that might clip content
        const parentElements: Array<{ el: HTMLElement; overflow: string; overflowY: string; overflowX: string; height: string }> = [];
        let currentParent = element.parentElement;
        while (currentParent && currentParent !== document.body) {
            const computed = window.getComputedStyle(currentParent);
            if (computed.overflow !== 'visible' || computed.overflowY !== 'visible' || computed.height !== 'auto') {
                parentElements.push({
                    el: currentParent,
                    overflow: currentParent.style.overflow,
                    overflowY: currentParent.style.overflowY,
                    overflowX: currentParent.style.overflowX,
                    height: currentParent.style.height,
                });
                // Temporarily set to allow full content rendering
                currentParent.style.overflow = 'visible';
                currentParent.style.overflowY = 'visible';
                currentParent.style.overflowX = 'visible';
            }
            currentParent = currentParent.parentElement;
        }
        
        // Ensure element itself can render full content without clipping
        element.style.overflow = 'visible';
        element.style.overflowY = 'visible';
        element.style.overflowX = 'visible';
        
        // Hide scrollbars by adding a style tag temporarily
        const style = document.createElement('style');
        style.id = 'png-export-hide-scrollbars';
        style.textContent = `
            *::-webkit-scrollbar {
                display: none !important;
                width: 0 !important;
                height: 0 !important;
            }
            * {
                -ms-overflow-style: none !important;
                scrollbar-width: none !important;
            }
        `;
        document.head.appendChild(style);
        
        // Scroll element and all scrollable parents to top to capture from beginning
        element.scrollTop = 0;
        let scrollParent: HTMLElement | null = element;
        while (scrollParent && scrollParent !== document.body) {
            scrollParent.scrollTop = 0;
            scrollParent.scrollLeft = 0;
            scrollParent = scrollParent.parentElement;
        }
        
        // Force a reflow to ensure styles are applied
        void element.offsetHeight;
        
        // Find the parent element with animated-bg class to include background blobs
        let captureElement = element;
        let animatedBgParent = element.closest('.animated-bg');
        
        if (animatedBgParent) {
            console.log('Found animated-bg parent, capturing with background blobs');
            captureElement = animatedBgParent as HTMLElement;
        } else {
            // Try to find any parent that might have the background
            let parent = element.parentElement;
            while (parent && parent !== document.body) {
                if (parent.classList.contains('animated-bg')) {
                    captureElement = parent;
                    animatedBgParent = parent;
                    console.log('Found animated-bg in parent tree');
                    break;
                }
                parent = parent.parentElement;
            }
        }
        
        // Ensure capture element also doesn't clip content
        const originalCaptureOverflow = captureElement.style.overflow;
        const originalCaptureOverflowY = captureElement.style.overflowY;
        captureElement.style.overflow = 'visible';
        captureElement.style.overflowY = 'visible';
    
        // Scroll element into view without changing appearance
        captureElement.scrollIntoView({ behavior: 'instant', block: 'start' });
        
        // Wait for all CSS to fully render, including backdrop-filter effects and background orbs
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Make sure element is fully visible and rendered
        const rect = captureElement.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
            throw new Error('Element is not visible or has zero dimensions');
        }

        console.log('Capturing PNG screenshot with DPR 3.0 (like Chrome DevTools)...');

        // Temporarily show pdf-hide elements for PNG export (they're only hidden for PDF)
        // Chrome DevTools "Capture Node Screenshot" captures everything visible in the DOM
        const pdfHideElements = captureElement.querySelectorAll('.pdf-hide');
        const originalDisplayValues: Array<{ element: HTMLElement; display: string }> = [];
        
        pdfHideElements.forEach((el) => {
            if (el instanceof HTMLElement) {
                const computed = window.getComputedStyle(el);
                if (computed.display === 'none') {
                    // Only override if it's actually hidden
                    originalDisplayValues.push({ element: el, display: el.style.display });
                    el.style.display = ''; // Reset to default/visible
                }
            }
        });

        // Get the computed background color from body or root element
        const body = document.body;
        const html = document.documentElement;
        const bodyBg = window.getComputedStyle(body).backgroundColor;
        const htmlBg = window.getComputedStyle(html).backgroundColor;
        
        // Default to dark theme background
        let backgroundColor = '#0a0a0a';
        
        if (bodyBg && bodyBg !== 'rgba(0, 0, 0, 0)' && bodyBg !== 'transparent') {
            backgroundColor = bodyBg;
        } else if (htmlBg && htmlBg !== 'rgba(0, 0, 0, 0)' && htmlBg !== 'transparent') {
            backgroundColor = htmlBg;
        }

        console.log('Background color:', backgroundColor);

        // Use html-to-image with DPR 3.0 (exactly like Chrome DevTools Device Toolbar with DPR 3.0)
        const DEVICE_PIXEL_RATIO = 3.0; // Match Chrome DevTools DPR 3.0 setting
        
        // For PNG export, we want to capture EVERYTHING that's visible (like Chrome DevTools "Capture Node Screenshot")
        // Chrome DevTools captures all visible elements in the DOM, so we do the same
        // Don't filter - capture everything visible in the container
        const imgData = await toPng(captureElement, {
            quality: 1.0, // Maximum quality (lossless)
            pixelRatio: DEVICE_PIXEL_RATIO, // DPR 3.0 = 3x resolution (like Chrome DevTools)
            backgroundColor: backgroundColor, // Explicitly set dark background
            cacheBust: true, // Force fresh capture
            skipFonts: false, // Include all fonts
            fontEmbedCSS: '', // Don't modify font CSS
            includeQueryParams: true, // Include query params for resources
            // No filter - capture everything visible in the container (like Chrome DevTools does)
        });

        // Restore original display values for pdf-hide elements
        originalDisplayValues.forEach(({ element, display }) => {
            element.style.display = display;
        });
        
        console.log('High-resolution PNG captured at DPR 3.0');
        
        // Remove temporary style tag
        const styleTag = document.getElementById('png-export-hide-scrollbars');
        if (styleTag) {
            styleTag.remove();
        }
        
        // Restore original element styles
        element.style.overflow = originalElementOverflow;
        element.style.overflowY = originalElementOverflowY;
        element.style.overflowX = originalElementOverflowX;
        
        captureElement.style.overflow = originalCaptureOverflow;
        captureElement.style.overflowY = originalCaptureOverflowY;
        
        // Restore parent overflow styles
        parentElements.forEach(({ el, overflow, overflowY, overflowX, height }) => {
            el.style.overflow = overflow;
            el.style.overflowY = overflowY;
            el.style.overflowX = overflowX;
            el.style.height = height;
        });

        // Create image element to get dimensions
        const img = new Image();
        img.src = imgData;
        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
        });

        const imgWidth = img.width;
        const imgHeight = img.height;

        console.log('High-resolution PNG dimensions:', imgWidth, 'x', imgHeight, 'at DPR 3.0');
        console.log('Downloading PNG:', options.filename);

        // Download the PNG file
        const link = document.createElement('a');
        link.href = imgData;
        link.download = options.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Restore original scroll position
        window.scrollTo(originalScrollX, originalScrollY);

        console.log('PNG downloaded successfully');
    } catch (error) {
        console.error('Error generating PNG:', error);
        alert(`Failed to generate PNG: ${error instanceof Error ? error.message : 'Unknown error'}`);
        throw error;
    } finally {
        // Restore sidebar and header visibility
        if (sidebar && sidebarOriginalVisibility !== null) {
            (sidebar as HTMLElement).style.visibility = sidebarOriginalVisibility;
            (sidebar as HTMLElement).style.opacity = sidebarOriginalOpacity || '1';
            (sidebar as HTMLElement).style.pointerEvents = 'auto';
            console.log('Restoring sidebar visibility');
        }
        if (header && headerOriginalVisibility !== null) {
            (header as HTMLElement).style.visibility = headerOriginalVisibility;
            (header as HTMLElement).style.opacity = headerOriginalOpacity || '1';
            (header as HTMLElement).style.pointerEvents = 'auto';
            console.log('Restoring header visibility');
        }
        
        // Restore scroll position
        window.scrollTo(originalScrollX, originalScrollY);
    }
};

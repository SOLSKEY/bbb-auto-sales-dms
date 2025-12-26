import { useState, useEffect } from 'react';

/**
 * Custom hook to track chart animation phase during initial page load
 * Prevents mouse events from interfering with chart animations by disabling
 * pointer events during the animation period.
 * 
 * @param animationDuration - Duration of chart animations in milliseconds (default: 2500ms)
 * @returns boolean indicating if charts are still in initial animation phase
 */
export const useChartAnimation = (animationDuration: number = 2500): boolean => {
    const [isInitializing, setIsInitializing] = useState(true);
    
    useEffect(() => {
        // Check if we're in export mode - if so, disable pointer events immediately
        const isExporting = typeof window !== 'undefined' && 
            new URLSearchParams(window.location.search).get('export') === 'true';
        
        if (isExporting) {
            // In export mode, keep pointer events disabled longer to ensure Puppeteer captures correctly
            const timer = setTimeout(() => setIsInitializing(false), 3000);
            return () => clearTimeout(timer);
        } else {
            // In normal mode, disable pointer events during animation period
            const timer = setTimeout(() => setIsInitializing(false), animationDuration);
            return () => clearTimeout(timer);
        }
    }, [animationDuration]);
    
    return isInitializing;
};


import React, { useState } from 'react';
import jsPDF from 'jspdf';

declare global {
  interface Window {
    FireShotAPI?: {
      isAvailable: () => boolean;
      base64EncodePage: (
        entirePage: boolean,
        capturedDivElementId?: string,
        callback?: (base64Data: string) => void
      ) => void;
    };
  }
}

export const ExportSalesAnalyticsButton: React.FC = () => {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    console.group('🔍 SMART CROP EXPORT LOG');
    setIsExporting(true);

    const originalScrollX = window.scrollX;
    const originalScrollY = window.scrollY;

    try {
      // 1. Check FireShot
      if (typeof window.FireShotAPI === 'undefined' || !window.FireShotAPI.isAvailable()) {
        alert('FireShot extension is not installed.');
        setIsExporting(false);
        console.groupEnd();
        return;
      }

      // 2. Find the Container
      const container = document.getElementById('sales-analytics-export-container');
      if (!container) {
        alert('Container not found.');
        setIsExporting(false);
        console.groupEnd();
        return;
      }

      // 3. SMART CROP CALCULATION
      // Instead of measuring the container (which includes the unwanted padding/Yellow Box),
      // we loop through the children to find the TRUE content edges.
      
      console.log('📏 Calculating content bounds (ignoring parent padding)...');
      
      // Reset scroll for accurate measuring
      window.scrollTo(0, 0);
      await new Promise(r => setTimeout(r, 150));

      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      const children = Array.from(container.children);
      
      if (children.length === 0) {
        // Fallback if no children exist
        const rect = container.getBoundingClientRect();
        minX = rect.left;
        minY = rect.top;
        maxX = rect.right;
        maxY = rect.bottom;
      } else {
        // Measure only the actual children elements
        children.forEach(child => {
          const rect = child.getBoundingClientRect();
          // Skip elements that are hidden (0 height/width)
          if (rect.width === 0 && rect.height === 0) return;
          
          if (rect.left < minX) minX = rect.left;
          if (rect.top < minY) minY = rect.top;
          if (rect.right > maxX) maxX = rect.right;
          if (rect.bottom > maxY) maxY = rect.bottom;
        });
      }

      // The exact dimensions of the content ONLY
      const cropX = minX;
      const cropY = minY;
      const cropWidth = maxX - minX;
      const cropHeight = maxY - minY;

      // Capture document width for scaling
      const docWidth = document.documentElement.scrollWidth;

      console.log('🎯 Tight Crop Bounds:', { cropX, cropY, cropWidth, cropHeight });

      // 4. FireShot Capture (Full Page)
      window.FireShotAPI.base64EncodePage(
        true, 
        undefined, 
        async (base64Data: string) => {
          try {
            window.scrollTo(originalScrollX, originalScrollY);
            
            const fullImg = new Image();
            await new Promise<void>((resolve) => {
              fullImg.onload = () => resolve();
              fullImg.src = base64Data;
            });

            // 5. High-Res Scaling Logic
            const pixelDensityRatio = fullImg.width / docWidth;
            console.log(`✨ High-DPI Ratio: ${pixelDensityRatio}x`);

            // 6. Draw to Canvas
            const canvas = document.createElement('canvas');
            
            // Set canvas to the HIGH RES size of the content
            canvas.width = cropWidth * pixelDensityRatio;
            canvas.height = cropHeight * pixelDensityRatio;

            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('Canvas context failed');

            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';

            ctx.drawImage(
              fullImg,
              cropX * pixelDensityRatio,      // Source X
              cropY * pixelDensityRatio,      // Source Y
              cropWidth * pixelDensityRatio,  // Source Width
              cropHeight * pixelDensityRatio, // Source Height
              0, 0,                           // Dest X, Y
              canvas.width,                   // Dest Width
              canvas.height                   // Dest Height
            );

            const croppedDataUrl = canvas.toDataURL('image/png', 1.0);

            // 7. Generate PDF
            const pdfDPI = 96; 
            const margin = 0.1; 
            
            const paperWidth = (cropWidth / pdfDPI) + (margin * 2);
            const paperHeight = (cropHeight / pdfDPI) + (margin * 2);

            const pdf = new jsPDF({
              orientation: paperWidth > paperHeight ? 'landscape' : 'portrait',
              unit: 'in',
              format: [paperWidth, paperHeight]
            });

            pdf.addImage(
              croppedDataUrl, 
              'PNG', 
              margin, 
              margin, 
              cropWidth / pdfDPI, 
              cropHeight / pdfDPI
            );

            pdf.save(`Sales_Report_TightCrop_${new Date().toISOString().split('T')[0]}.pdf`);
            console.log('✅ Export Success');

          } catch (err) {
            console.error('Processing Error:', err);
            alert('Failed to process image');
          } finally {
            setIsExporting(false);
            console.groupEnd();
          }
        }
      );

    } catch (error) {
      console.error('Export Error:', error);
      window.scrollTo(originalScrollX, originalScrollY);
      setIsExporting(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={isExporting}
      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
    >
      {isExporting ? 'Processing...' : 'Export Report'}
    </button>
  );
};
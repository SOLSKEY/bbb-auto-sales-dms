import React, { useState } from 'react';

const EXPORT_SERVER_URL = import.meta.env.VITE_EXPORT_SERVER_URL || 'http://localhost:3001';

export const ExportPuppeteerButton: React.FC = () => {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    console.log('🚀 Starting Puppeteer export...');
    setIsExporting(true);

    try {
      // Call the export server endpoint
      const response = await fetch(`${EXPORT_SERVER_URL}/api/export-sales-report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        // Try to get error details from server
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { message: `Server responded with ${response.status}` };
        }
        
        const error = new Error(errorData.message || `Server responded with ${response.status}`) as any;
        error.response = response;
        error.errorData = errorData;
        throw error;
      }

      console.log('✅ Screenshot received from server');

      // Get the image blob
      const blob = await response.blob();

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      const date = new Date().toISOString().split('T')[0];
      link.download = `Sales_Report_Puppeteer_${date}.png`;
      link.href = url;
      link.click();

      // Cleanup
      window.URL.revokeObjectURL(url);

      console.log('✅ Export complete');

    } catch (error) {
      console.error('❌ Export failed:', error);
      
      // Parse error response if available
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
      } else if (errorMessage.includes('Development server is not running')) {
        alert(
          '❌ Development server is not running.\n\n' +
          'Please start the dev server first:\n' +
          '  npm run dev\n\n' +
          'The export server needs the dev server to be running on http://localhost:3000'
        );
      } else {
        // Try to get error details from server response
        const errorData = (error as any)?.errorData;
        if (errorData) {
          alert(
            '❌ Export failed:\n\n' +
            (errorData.message || errorMessage) + '\n\n' +
            (errorData.hint || '')
          );
        } else {
          alert(`❌ Export failed:\n\n${errorMessage}`);
        }
      }
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={isExporting}
      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      title="Uses Puppeteer to capture exact screenshot like DevTools"
    >
      {isExporting ? 'Exporting via Puppeteer...' : 'Export (Puppeteer)'}
    </button>
  );
};

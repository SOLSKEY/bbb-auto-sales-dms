import React, { useEffect, useState } from 'react';
import DailyClosingReport from '../components/DailyClosingReport';
import { DailyClosingReportState } from '../types';

const PrintDailyClosing: React.FC = () => {
    const [reportData, setReportData] = useState<DailyClosingReportState | null>(null);

    useEffect(() => {
        // Check for data injected by Puppeteer
        const injectedData = (window as any).REPORT_DATA;
        if (injectedData) {
            setReportData(injectedData);
        } else {
            // Fallback for testing: try to parse from URL query param
            const params = new URLSearchParams(window.location.search);
            const dataParam = params.get('data');
            if (dataParam) {
                try {
                    setReportData(JSON.parse(decodeURIComponent(dataParam)));
                } catch (e) {
                    console.error('Failed to parse report data from URL', e);
                }
            }
        }
    }, []);

    if (!reportData) {
        return <div className="p-10 text-white">Loading report data...</div>;
    }

    return (
        <div className="min-h-screen bg-[#020617] p-8">
            <style>{`
                /* Force dark mode styles for print */
                :root {
                    color-scheme: dark;
                }
                body {
                    background-color: #050505 !important;
                    color: white !important;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                    min-height: 100vh;
                    overflow: hidden; /* Prevent scrollbars in PDF */
                }
                /* Replicate the orb background */
                .print-bg-orb {
                    position: absolute;
                    border-radius: 50%;
                    filter: blur(80px); /* Increased blur for smoother look */
                    z-index: -1;
                    opacity: 0.6;
                }
            `}</style>

            {/* Background Orbs - Static positioning to match the "look" without animation issues */}
            <div className="print-bg-orb" style={{ top: '10%', left: '10%', width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(6, 182, 212, 0.4) 0%, transparent 70%)' }} />
            <div className="print-bg-orb" style={{ bottom: '10%', right: '10%', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(59, 130, 246, 0.4) 0%, transparent 70%)' }} />
            <div className="print-bg-orb" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(139, 92, 246, 0.3) 0%, transparent 70%)' }} />

            {/* Force a fixed width to ensure the desktop grid layout (lg: breakpoint) is triggered */}
            <div style={{ width: '1280px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
                <DailyClosingReport initialData={reportData} isReadOnly />
            </div>
        </div >
    );
};

export default PrintDailyClosing;

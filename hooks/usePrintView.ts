import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

export const usePrintView = () => {
    const [searchParams] = useSearchParams();
    const [isPrintView, setIsPrintView] = useState(false);

    useEffect(() => {
        const printParam = searchParams.get('printView');
        setIsPrintView(printParam === 'true');
    }, [searchParams]);

    useEffect(() => {
        const handleBeforePrint = async () => {
            document.body.classList.add('force-screen');
            if (document.fonts) {
                await document.fonts.ready;
            }
        };

        const handleAfterPrint = () => {
            document.body.classList.remove('force-screen');
        };

        window.addEventListener('beforeprint', handleBeforePrint);
        window.addEventListener('afterprint', handleAfterPrint);

        return () => {
            window.removeEventListener('beforeprint', handleBeforePrint);
            window.removeEventListener('afterprint', handleAfterPrint);
        };
    }, []);

    return { isPrintView };
};

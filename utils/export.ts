import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';

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

export const downloadHtmlElementAsPdf = async (
    element: HTMLElement,
    options: HtmlPdfExportOptions,
) => {
    if (!element) {
        console.warn('downloadHtmlElementAsPdf called with no element.');
        return;
    }

    // Add a class to the element to indicate it's being exported
    element.classList.add('pdf-export-mode');

    try {
        // Capture the element as a canvas
        const canvas = await html2canvas(element, {
            scale: 2, // Higher quality
            backgroundColor: null,
            logging: false,
            useCORS: true,
        });

        const imgData = canvas.toDataURL('image/png');
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;

        // Calculate PDF dimensions - use landscape if content is wider
        const isLandscape = imgWidth > imgHeight;
        const pdf = new jsPDF({
            orientation: isLandscape ? 'landscape' : 'portrait',
            unit: 'px',
            format: isLandscape ? [imgHeight * 0.75, imgWidth * 0.75] : [imgWidth * 0.75, imgHeight * 0.75],
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        // Add title if provided
        if (options.title) {
            pdf.setFillColor(26, 29, 33);
            pdf.rect(0, 0, pdfWidth, 40, 'F');
            pdf.setTextColor(255, 255, 255);
            pdf.setFontSize(16);
            pdf.setFont('helvetica', 'bold');
            pdf.text(options.title, 20, 25);

            // Add image below title
            pdf.addImage(imgData, 'PNG', 0, 40, pdfWidth, (imgHeight / imgWidth) * pdfWidth);
        } else {
            // Add image to fill the page
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        }

        pdf.save(options.filename);
    } finally {
        // Remove the export mode class
        element.classList.remove('pdf-export-mode');
    }
};

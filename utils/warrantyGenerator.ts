import jsPDF from 'jspdf';

export interface WarrantyData {
    firstName: string;
    lastName: string;
    year: string;
    make: string;
    model: string;
    vin: string;
    mileage: string;
    warrantyMonths: number;
    warrantyMiles: number;
    saleDate: Date;
}

/**
 * Formats a date as MM/DD/YYYY
 */
export const formatDate = (date: Date): string => {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
};

/**
 * Format miles with commas (12000 -> "12,000")
 */
export const formatMiles = (miles: number): string => {
    return miles.toLocaleString('en-US');
};

/**
 * Generates the warranty contract HTML template with exact formatting
 */
export const generateWarrantyHTML = (data: WarrantyData): string => {
    const formattedMiles = formatMiles(data.warrantyMiles);
    const formattedDate = formatDate(data.saleDate);
    const fullName = `${data.firstName} ${data.lastName}`;
    const vehicleInfo = `${data.year} ${data.make} ${data.model}`;

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page {
      size: letter;
      margin: 0;
    }
    
    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 9pt;
      line-height: 1.1;
      color: #000;
      margin: 0.25in;
      padding: 0;
      width: calc(100% - 0.5in);
      box-sizing: border-box;
    }
    
    @media print {
      @page {
        margin: 0 !important;
        size: letter;
      }
      body {
        margin: 0 !important;
        padding: 0.5in !important;
        width: 100% !important;
        max-width: 100% !important;
        box-sizing: border-box !important;
      }
      /* Ensure all containers fit to width */
      * {
        max-width: 100% !important;
        box-sizing: border-box !important;
      }
      /* Force tables to fit */
      table, .header-table {
        width: 100% !important;
        max-width: 100% !important;
        table-layout: fixed !important;
      }
      /* Remove any fixed pixel widths */
      div, p, span {
        max-width: 100% !important;
      }
      /* Prevent overflow */
      .section, .section-content, .signature-row, .service-box {
        max-width: 100% !important;
        overflow: hidden !important;
      }
    }
    
    * {
      box-sizing: border-box;
    }
    
    /* Header table */
    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 5px;
      font-size: 7pt;
      table-layout: fixed;
    }
    .header-table th {
      border: 1px solid #000;
      padding: 3px 4px;
      font-weight: bold;
      text-align: center;
      background-color: #f0f0f0;
      font-size: 7pt;
      word-wrap: break-word;
    }
    .header-table th:nth-child(1) {
      width: 34%;
    }
    .header-table th:nth-child(2) {
      width: 21%;
    }
    .header-table th:nth-child(3) {
      width: 20%;
    }
    .header-table th:nth-child(4) {
      width: 10%;
    }
    .header-table th:nth-child(5) {
      width: 15%;
    }
    .header-table td {
      border: 1px solid #000;
      padding: 4px 4px;
      text-align: center;
      font-size: 7pt;
      height: 18px;
      word-wrap: break-word;
      overflow: hidden;
    }
    .header-table td:nth-child(1) {
      width: 34%;
    }
    .header-table td:nth-child(2) {
      width: 21%;
    }
    .header-table td:nth-child(3) {
      width: 20%;
    }
    .header-table td:nth-child(4) {
      width: 10%;
    }
    .header-table td:nth-child(5) {
      width: 15%;
    }
    
    /* Title */
    .main-title {
      text-align: center;
      font-size: 14pt;
      font-weight: bold;
      margin: 6px 0 3px 0;
    }
    .sub-title {
      text-align: center;
      font-size: 11pt;
      font-weight: bold;
      margin-bottom: 5px;
    }
    
    /* Sections */
    .section {
      margin-bottom: 1px;
    }
    .section-header {
      font-weight: bold;
      text-decoration: underline;
      font-size: 9pt;
      margin-bottom: 1px;
      margin-top: 2px;
    }
    .section-content {
      text-align: justify;
      font-size: 9pt;
      margin-bottom: 0;
      line-height: 1.1;
      word-wrap: break-word;
    }
    .initials {
      text-align: right;
      font-size: 9pt;
      margin-bottom: 3px;
      margin-top: 2px;
    }
    
    /* Special text formatting */
    .bold-underline {
      font-weight: bold;
      text-decoration: underline;
    }
    .underline {
      text-decoration: underline;
    }
    
    /* Conditions section */
    .conditions-header {
      font-weight: bold;
      font-size: 9pt;
      margin-bottom: 1px;
      margin-top: 2px;
    }
    
    /* Signatures */
    .signature-row {
      display: flex;
      justify-content: space-between;
      margin: 6px 0 10px 0;
      font-size: 9pt;
    }
    .signature-line {
      width: 45%;
    }
    
    /* Service facility box */
    .service-box {
      border: 1.5px solid #000;
      padding: 5px 10px;
      text-align: center;
      margin-top: 10px;
    }
    .service-box-title {
      font-weight: bold;
      text-decoration: underline;
      font-size: 9pt;
      margin-bottom: 2px;
    }
    .service-box-subtitle {
      font-style: italic;
      font-size: 8pt;
      margin-bottom: 3px;
    }
    .service-box-name {
      font-weight: bold;
      font-size: 9pt;
      margin-bottom: 1px;
    }
    .service-box p {
      margin: 1px 0;
      font-size: 8pt;
    }
    .service-box-phone {
      font-weight: bold;
      font-size: 9pt;
    }
  </style>
</head>
<body>
    <table class="header-table">
        <thead>
            <tr>
                <th>Name</th>
                <th>Year/Make/Model</th>
                <th>VIN</th>
                <th>Mileage</th>
                <th>Date</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>${fullName}</td>
                <td>${vehicleInfo}</td>
                <td>${data.vin}</td>
                <td>${data.mileage}</td>
                <td>${formattedDate}</td>
            </tr>
        </tbody>
    </table>

    <div class="main-title">BBB AUTO SALES OF SMYRNA</div>
    <div class="sub-title">SERVICE CONTRACT</div>

    <div class="section">
        <div class="section-header">LENGTH OF COVERAGE</div>
        <div class="section-content">
            This used vehicle SERVICE CONTRACT begins on the day this agreement is accepted by BBB AUTO SALES and lasts for a period of <span class="bold-underline">${data.warrantyMonths} months or ${formattedMiles} miles, whichever comes first.</span> An inoperative, inaccurate, or altered odometer will void this contract.
        </div>
        <div class="initials">Initials ________</div>
    </div>

    <div class="section">
        <div class="section-header">WHAT BBB AUTO SALES WILL DO</div>
        <div class="section-content">
            Under this used vehicle SERVICE CONTRACT, BBB AUTO SALES will repair or replace a COVERED COMPONENT that is found to have failed as a result of a MECHANICAL BREAKDOWN. BBB AUTO SALES will cover the cost of repairing or replacing a COVERED COMPONENT, WITHIN THE FIRST NINETY (90) DAYS OF THIS AGREEMENT. When making repairs, BBB AUTO SALES shall use components of the same type and quality as those removed, which may include aftermarket, reconditioned, or used components. YOU must maintain YOUR VEHICLE in accordance with manufacturer's recommendations and retain invoices of any work performed. We reserve the right to request any and/or all maintenance records pertaining to YOUR VEHICLE prior to performing repairs.
        </div>
        <div class="initials">Initials ________</div>
    </div>

    <div class="section">
        <div class="section-header">SERVICE AND CLAIMS PROCEDURE</div>
        <div class="section-content">
            In the event of a MECHANICAL BREAKDOWN when repair services covered by this agreement are required AND ALLOWED, YOU must telephone BBB AUTO SALES. WE will direct YOU to deliver YOUR VEHICLE at YOUR expense to our repair facility. YOU must notify US immediately upon discovery of any MECHANICAL BREAKDOWN, and in all events, prior to the expiration of the term of the SERVICE CONTRACT. ALL CLAIMS FOR COVERED COMPONENTS, AS STATED WITHIN THIS AGREEMENT BELOW, WILL BE COVERED BY BBB AUTO SALES AT NO DEDUCTIBLE CHARGE TO YOU, WITHIN THE FIRST NINETY (90) DAYS OF THIS SERVICE CONTRACT AGREEMENT. BEYOND THE FIRST NINETY (90) DAYS OF THIS SERVICE CONTRACT AGREEMENT, ALL CLAIMS OR ENSUING CLAIMS WILL REQUIRE A $98.00 DEDUCTIBLE PER CLAIM FOR SERVICE REPAIRS. THIS DEDUCTIBLE MUST BE PAID AT DROP-OFF OF YOUR VEHICLE AT OUR REPAIR FACILITY. TOW CHARGES TO OUR REPAIR FACILITY ARE NOT COVERED BY THIS SERVICE CONTRACT AGREEMENT. All repairs MUST be performed by BBB AUTO SALES to be covered by this SERVICE CONTRACT. YOU will not be reimbursed for any costs associated with unauthorized repairs performed by parties other than BBB AUTO SALES or parties contracted by BBB AUTO SALES. If YOU submit YOUR VEHICLE for repairs and it is determined that no covered component has incurred a MECHANICAL BREAKDOWN, or the necessary repairs are solely related to components not covered under this SERVICE CONTRACT, then YOU will be charged a reasonable service, repair, and/or diagnostic fee.
        </div>
        <div class="initials">Initials ________</div>
    </div>

    <div class="section">
        <div class="section-header">COVERAGE</div>
        <div class="section-content">
            We agree to repair or replace a COVERED COMPONENT of YOUR VEHICLE as a result of a MECHANICAL BREAKDOWN arising out of the normal use of YOUR VEHICLE. The components listed in the following systems comprise the COVERED COMPONENTS. No other components, other than those listed below, are covered by this agreement.
        </div>
        <div class="initials">Initials ________</div>
    </div>

    <div class="section">
        <div class="section-header">DEFINITIONS AND KEY TERMS</div>
        <div class="section-content">
            YOU should understand the following terms, which are used throughout this SERVICE CONTRACT. "YOU" and "YOUR" mean the purchaser of this SERVICE CONTRACT. "WE," "US," "OUR," mean BBB AUTO SALES. MECHANICAL BREAKDOWN means the inability of a <span class="underline">properly maintained</span> part covered under this SERVICE CONTRACT to perform the function for which it was designed, due to defects in material or workmanship. MECHANICAL BREAKDOWN does not mean the gradual reduction in operating performance due to wear and tear. "VEHICLE" means YOUR VEHICLE described at the beginning of this contract. "COVERED COMPONENT" means a component of YOUR VEHICLE covered by this SERVICE CONTRACT.
        </div>
        <div class="initials">Initials ________</div>
    </div>

    <div class="section">
        <div class="section-header">COVERED COMPONENTS</div>
        <div class="section-content">
            <span class="underline">Engine and transmission.</span>
        </div>
        <div class="section-content">
            I have been notified that this vehicle previously mentioned above I'm purchasing has been involved in an accident, I also understand that this vehicle does have a rebuilt title. After signing this document, I agree that I am fully aware of these facts.
        </div>
        <div class="initials">Initials ________</div>
    </div>

    <div class="section">
        <div class="conditions-header">**CONDITIONS OF SERVICE CONTRACT</div>
        <div class="section-content">
            <span class="bold-underline">WARRANTY DOES NOT COVER TOW CHARGES</span>
        </div>
        <div class="section-content">
            All of the above conditions and terms apply, given the account holder is current on their payments and account.
        </div>
        <div class="section-content">
            <span class="underline">Service contract does not apply to accounts that are not in good standing.</span>
        </div>
    </div>

    <div class="signature-row">
        <div class="signature-line">Buyer: _______________________________</div>
        <div class="signature-line">Seller: _______________________________</div>
    </div>

    <div class="service-box">
        <div class="service-box-title">AUTHORIZED SERVICE FACILITY</div>
        <div class="service-box-subtitle">All warranty repairs must be performed at the following authorized facility:</div>
        <div class="service-box-name">JCA Body Shop</div>
        <p>318 Natchez Ct, Nashville, TN 37211</p>
        <p class="service-box-phone">Phone: (615) 375-0424</p>
        <p>Hours: Monday – Friday, 9:00 AM – 4:00 PM</p>
    </div>
</body>
</html>`;
}

/**
 * Generates and downloads a warranty contract PDF
 */
export async function generateWarrantyPDF(data: WarrantyData): Promise<void> {
    try {
        // Create a temporary HTML element
        const htmlContent = generateWarrantyHTML(data);
        const printWindow = window.open('', '_blank');
        
        if (!printWindow) {
            throw new Error('Unable to open print window. Please allow popups for this site.');
        }

        printWindow.document.write(htmlContent);
        printWindow.document.close();

        // Wait for content to load
        await new Promise(resolve => setTimeout(resolve, 500));

        // Add print styles to remove headers/footers and ensure single page
        const style = printWindow.document.createElement('style');
        style.textContent = `
            @media print {
                @page {
                    margin: 0 !important;
                    size: letter;
                }
                body {
                    margin: 0 !important;
                    padding: 0.5in !important;
                    width: 100% !important;
                    max-width: 100% !important;
                    box-sizing: border-box !important;
                }
                /* Ensure all containers fit to width */
                * {
                    max-width: 100% !important;
                    box-sizing: border-box !important;
                }
                /* Force tables to fit */
                table, .header-table {
                    width: 100% !important;
                    max-width: 100% !important;
                    table-layout: fixed !important;
                }
                /* Remove any fixed pixel widths */
                div, p, span {
                    max-width: 100% !important;
                }
                /* Prevent overflow */
                .section, .section-content, .signature-row, .service-box {
                    max-width: 100% !important;
                    overflow: hidden !important;
                }
                /* Prevent page breaks */
                .section, .signature-row, .service-box {
                    page-break-inside: avoid;
                }
            }
        `;
        printWindow.document.head.appendChild(style);

        // Wait a bit more for styles to apply
        await new Promise(resolve => setTimeout(resolve, 200));

        // Use browser's print dialog
        // IMPORTANT: In the print dialog, uncheck "Headers and footers" to remove date/time/page numbers
        printWindow.print();
        
    } catch (error) {
        console.error('Error generating warranty PDF:', error);
        throw error;
    }
}

/**
 * Generates PDF using jsPDF and html2canvas (alternative method)
 * This creates a downloadable PDF file
 */
export async function generateWarrantyPDFDownload(data: WarrantyData): Promise<void> {
    try {
        const htmlContent = generateWarrantyHTML(data);
        
        // Create a temporary container
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlContent;
        tempDiv.style.position = 'absolute';
        tempDiv.style.left = '-9999px';
        tempDiv.style.width = '8.5in';
        document.body.appendChild(tempDiv);

        // Import html2canvas dynamically
        const html2canvas = (await import('html2canvas')).default;
        
        // Capture the content as canvas
        const canvas = await html2canvas(tempDiv, {
            scale: 2,
            useCORS: true,
            logging: false,
            width: 816, // 8.5 inches at 96 DPI
            height: 1056, // 11 inches at 96 DPI
        });

        // Remove temporary element
        document.body.removeChild(tempDiv);

        // Create PDF
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'in',
            format: 'letter',
        });

        const imgData = canvas.toDataURL('image/png');
        const imgWidth = 8.5;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        pdf.addImage(imgData, 'PNG', 0.5, 0.5, imgWidth, imgHeight);

        // Generate filename
        const filename = `warranty-contract-${data.lastName}-${data.vin.slice(-4)}.pdf`;
        
        // Save the PDF
        pdf.save(filename);
    } catch (error) {
        console.error('Error generating warranty PDF:', error);
        throw error;
    }
}

/**
 * Prints the warranty contract directly
 */
export async function printWarranty(data: WarrantyData): Promise<void> {
    try {
        const htmlContent = generateWarrantyHTML(data);
        const printWindow = window.open('', '_blank');
        
        if (!printWindow) {
            throw new Error('Unable to open print window. Please allow popups for this site.');
        }

        printWindow.document.write(htmlContent);
        printWindow.document.close();

        // Wait for content to load
        await new Promise(resolve => setTimeout(resolve, 500));

        // Trigger print dialog
        printWindow.print();
    } catch (error) {
        console.error('Error printing warranty:', error);
        throw error;
    }
}


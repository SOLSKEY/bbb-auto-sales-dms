import express from 'express';
import cors from 'cors';
import puppeteer from 'puppeteer';

const app = express();
app.use(cors());

app.use(express.json({ limit: '50mb' }));

const DEFAULT_TARGET_PATH = '/?page=Collections&pdf=collections';

app.get('/api/export/collections', async (req, res) => {
    const target = req.query.target ? String(req.query.target) : null;
    const baseUrl = req.query.base ? String(req.query.base) : `http://localhost:${process.env.VITE_PORT || 5173}`;
    const urlToRender = target ?? `${baseUrl}${DEFAULT_TARGET_PATH}`;

    let browser;

    try {
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });

        const page = await browser.newPage();
        await page.goto(urlToRender, { waitUntil: 'networkidle0', timeout: 60_000 });
        await page.waitForSelector('#collections-analytics-export', { timeout: 15_000 });
        await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 500)));

        const pdfBuffer = await page.pdf({
            format: 'letter',
            printBackground: true,
            displayHeaderFooter: false,
            margin: { top: 20, right: 20, bottom: 20, left: 20 },
        });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="collections-report.pdf"');
        res.send(pdfBuffer);
    } catch (error) {
        console.error('[pdfServer] Failed to render collections report', error);
        res.status(500).json({ message: 'Failed to generate PDF.' });
    } finally {
        if (browser) {
            await browser.close();
        }
    }
});

app.post('/api/export/daily-closing', async (req, res) => {
    const { data, date } = req.body;
    const baseUrl = `http://localhost:${process.env.VITE_PORT || 3000}`;
    const urlToRender = `${baseUrl}/print/daily-closing`;

    console.log(`[pdfServer] Generating Daily Closing Report for ${date}...`);

    let browser;
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });

        const page = await browser.newPage();

        // Set viewport to a standard desktop resolution
        await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 2 });

        // Emulate screen media type to ensure we get the exact "web" look, not "print" styles
        await page.emulateMediaType('screen');

        // Inject the data BEFORE navigation to ensure it's available when React mounts
        await page.evaluateOnNewDocument((reportData) => {
            window.REPORT_DATA = reportData;
        }, data);

        // Navigate to the print page
        // Use domcontentloaded to be faster and less brittle than networkidle0
        await page.goto(urlToRender, { waitUntil: 'domcontentloaded', timeout: 30000 });

        // Wait for the component to render with the data
        // We can wait for a specific element that appears when data is loaded
        // Since the component renders "Loading..." if no data, we wait for the main container
        await page.waitForSelector('.glass-card', { timeout: 10000 });

        // Add a small delay to ensure animations/rendering settle
        await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 500)));

        const pdfBuffer = await page.pdf({
            format: 'A4',
            landscape: true, // Daily closing report is wide
            printBackground: true,
            displayHeaderFooter: false,
            scale: 0.8, // Scale down to fit the 1280px content onto A4
            margin: { top: 20, right: 20, bottom: 20, left: 20 },
        });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="daily-closing-report-${date}.pdf"`);
        res.send(pdfBuffer);
        console.log(`[pdfServer] Successfully generated PDF for ${date}`);

    } catch (error) {
        console.error('[pdfServer] Failed to render daily closing report', error);
        res.status(500).json({ message: 'Failed to generate PDF.', error: String(error) });
    } finally {
        if (browser) {
            await browser.close();
        }
    }
});

app.post('/api/export-sales-screenshot', async (req, res) => {
    const { salesData } = req.body;
    const baseUrl = `http://localhost:${process.env.VITE_PORT || 3000}`;
    const urlToRender = `${baseUrl}/sales`;

    console.log(`[pdfServer] Generating Sales Screenshot...`);
    if (salesData) {
        console.log(`[pdfServer] Received salesData with ${salesData.length} records`);
    } else {
        console.log(`[pdfServer] No salesData received!`);
    }

    let browser;
    try {
        browser = await puppeteer.launch({
            headless: "new",
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            defaultViewport: null
        });

        const page = await browser.newPage();

        // Capture console logs
        page.on('console', msg => console.log('[BROWSER]', msg.text()));
        page.on('pageerror', err => console.log('[BROWSER ERROR]', err.toString()));

        // Inject data if provided
        if (salesData) {
            await page.evaluateOnNewDocument((data) => {
                window.SALES_EXPORT_DATA = data;
                window.IS_EXPORT_MODE = true;
                console.log('[BROWSER] Injected sales data');
            }, salesData);
        }

        // Navigate to the page
        await page.goto(urlToRender, { waitUntil: 'networkidle0', timeout: 60000 });

        // Set viewport and DPR exactly as requested
        await page.setViewport({
            width: 2000,
            height: 2000,
            deviceScaleFactor: 3,
        });

        // Wait for the element
        const selector = '#sales-analytics-export-container';
        await page.waitForSelector(selector, { timeout: 15000 });

        // Small delay to ensure styles settle
        await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 1000)));

        const element = await page.$(selector);

        if (!element) {
            throw new Error(`Element ${selector} not found`);
        }

        const imageBuffer = await element.screenshot({
            type: 'png',
            omitBackground: true
        });

        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Content-Disposition', `attachment; filename="sales-analytics-${new Date().toISOString().split('T')[0]}.png"`);
        res.send(imageBuffer);
        console.log(`[pdfServer] Successfully generated Sales Screenshot`);

    } catch (error) {
        console.error('[pdfServer] Failed to render sales screenshot', error);

        try {
            if (browser) {
                const pages = await browser.pages();
                const page = pages[0];
                if (page) {
                    await page.screenshot({ path: 'debug-puppeteer-error.png' });
                    const html = await page.content();
                    const fs = await import('fs');
                    fs.writeFileSync('debug-puppeteer-error.html', html);
                    console.log('[pdfServer] Captured debug screenshot and HTML');
                }
            }
        } catch (screenshotError) {
            console.error('[pdfServer] Failed to capture debug info', screenshotError);
        }

        res.status(500).json({ message: 'Failed to generate screenshot.', error: String(error) });
    } finally {
        if (browser) {
            await browser.close();
        }
    }
});

const PORT = Number(process.env.PDF_SERVER_PORT || 5001);
app.listen(PORT, () => {
    console.log(`Collections PDF server listening on http://localhost:${PORT}`);
});

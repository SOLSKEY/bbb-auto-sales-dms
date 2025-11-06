import express from 'express';
import cors from 'cors';
import puppeteer from 'puppeteer';

const app = express();
app.use(cors());

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

const PORT = Number(process.env.PDF_SERVER_PORT || 5001);
app.listen(PORT, () => {
    console.log(`Collections PDF server listening on http://localhost:${PORT}`);
});

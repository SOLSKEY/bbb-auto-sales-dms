import express from 'express';
import cors from 'cors';
import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import http from 'http';
import dotenv from 'dotenv';
import { jsPDF } from 'jspdf';

// Load environment variables from .env file
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3001;

// Get dev server URL from environment or use default
const DEV_SERVER_PORT = process.env.VITE_PORT || process.env.PORT || 3000;
const DEV_SERVER_URL = process.env.DEV_SERVER_URL || `http://localhost:${DEV_SERVER_PORT}`;
const SALES_PAGE_URL = `${DEV_SERVER_URL}/sales`;
const LOGIN_PAGE_URL = `${DEV_SERVER_URL}/login`;

app.use(cors());
app.use(express.json());

// Helper function to check if dev server is running
function checkDevServer(url) {
  return new Promise((resolve) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname || '/',
      method: 'HEAD',
      timeout: 3000
    };

    const req = http.request(options, (res) => {
      resolve(res.statusCode >= 200 && res.statusCode < 400);
    });

    req.on('error', () => {
      resolve(false);
    });

    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });

    req.setTimeout(3000);
    req.end();
  });
}

// Helper function to convert screenshot buffer to PDF
function convertImageToPDF(imageBuffer, dimensions) {
  // Step A: Use provided dimensions
  const imageWidthPx = dimensions.width;
  const imageHeightPx = dimensions.height;
  console.log(`📐 Image dimensions: ${imageWidthPx}x${imageHeightPx} pixels`);
  
  // Ensure imageBuffer is a Buffer
  const buffer = Buffer.isBuffer(imageBuffer) ? imageBuffer : Buffer.from(imageBuffer);
  
  // Convert buffer to base64
  const base64ImageData = buffer.toString('base64');
  
  // Reuse the shared conversion logic
  return convertBase64ToPDF(base64ImageData, dimensions);
}

// Helper function to convert base64 string directly to PDF (avoids binary corruption)
function convertBase64ToPDF(base64ImageData, dimensions) {
  // Step A: Use provided dimensions
  const imageWidthPx = dimensions.width;
  const imageHeightPx = dimensions.height;
  console.log(`📐 Image dimensions: ${imageWidthPx}x${imageHeightPx} pixels`);
  
  // Use base64 string directly (no Buffer conversion)
  const imageDataUri = `data:image/png;base64,${base64ImageData}`;
  
  // Step B: Calculate PDF dimensions in inches
  // 96 DPI is standard screen DPI
  const imageWidthInches = imageWidthPx / 96;
  const imageHeightInches = imageHeightPx / 96;
  const marginInches = 0.1;
  const totalMarginInches = marginInches * 2; // 0.2 inches total (top + bottom, left + right)
  
  const pdfWidthInches = imageWidthInches + totalMarginInches;
  const pdfHeightInches = imageHeightInches + totalMarginInches;
  
  console.log(`📄 PDF dimensions: ${pdfWidthInches.toFixed(2)}" x ${pdfHeightInches.toFixed(2)}"`);
  
  // Convert inches to points (1 inch = 72 points, which is what jsPDF uses)
  const pdfWidthPoints = pdfWidthInches * 72;
  const pdfHeightPoints = pdfHeightInches * 72;
  const marginPoints = marginInches * 72; // 0.1 inch = 7.2 points
  
  // Detect orientation: if width > height, it's landscape
  const isLandscape = pdfWidthPoints > pdfHeightPoints;
  console.log(`🔄 Orientation: ${isLandscape ? 'Landscape' : 'Portrait'}`);
  console.log(`📏 PDF page size: ${pdfWidthPoints.toFixed(1)}pt x ${pdfHeightPoints.toFixed(1)}pt`);
  
  // Step C: Initialize jsPDF with custom dimensions
  // For landscape pages, ensure width (larger value) is correctly set
  // jsPDF custom format uses [width, height] array
  let pdf;
  
  if (isLandscape) {
    // For landscape: explicitly set orientation and dimensions
    // Create with landscape orientation first, then set custom size
    pdf = new jsPDF({
      unit: 'pt',
      orientation: 'landscape',
      format: [pdfWidthPoints, pdfHeightPoints],
      compress: true
    });
  } else {
    // For portrait: standard creation
    pdf = new jsPDF({
      unit: 'pt',
      format: [pdfWidthPoints, pdfHeightPoints],
      compress: true
    });
  }
  
  // Verify page dimensions
  const finalWidth = pdf.internal.pageSize.getWidth();
  const finalHeight = pdf.internal.pageSize.getHeight();
  console.log(`📄 Final PDF page size: ${finalWidth.toFixed(1)}pt x ${finalHeight.toFixed(1)}pt`);
  
  // Double-check: if landscape but PDF is portrait, log warning
  if (isLandscape && finalHeight > finalWidth) {
    console.warn('⚠️ Warning: Landscape image but PDF created in portrait orientation');
  }
  
  // Calculate image size in points (convert from pixels)
  // 1 pixel at 96 DPI = 72/96 points = 0.75 points
  const imageWidthPoints = imageWidthPx * (72 / 96);
  const imageHeightPoints = imageHeightPx * (72 / 96);
  
  // Step D: Add image at (0.1, 0.1) inches from top-left (converted to points)
  // Always place at margin points from top-left, regardless of orientation
  pdf.addImage(imageDataUri, 'PNG', marginPoints, marginPoints, imageWidthPoints, imageHeightPoints);
  
  // Return PDF as buffer
  const pdfArrayBuffer = pdf.output('arraybuffer');
  return Buffer.from(pdfArrayBuffer);
}

app.post('/api/export-sales-report', async (req, res) => {
  console.log('📸 Export request received...');

  let browser;

  try {
    // Check if dev server is running before attempting export
    console.log(`🔍 Checking if dev server is running at ${DEV_SERVER_URL}...`);
    const isServerRunning = await checkDevServer(DEV_SERVER_URL);
    
    if (!isServerRunning) {
      throw new Error(
        `Development server is not running at ${DEV_SERVER_URL}.\n\n` +
        `Please start the dev server first:\n` +
        `  npm run dev\n\n` +
        `Or if using a different port, set DEV_SERVER_URL environment variable:\n` +
        `  DEV_SERVER_URL=http://localhost:YOUR_PORT npm run export-server`
      );
    }
    console.log('✅ Dev server is running');

    // 1. Launch Puppeteer with GPU acceleration and high-quality color profiles
    console.log('🚀 Launching browser...');
    browser = await puppeteer.launch({
      // Use the new headless mode (closer to real Chrome)
      headless: 'new',
      // Force GPU and Color Accuracy
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--enable-gpu', // Enable GPU acceleration
        '--use-gl=desktop', // Use desktop graphics instead of SwiftShader
        '--force-color-profile=srgb', // Prevent color washing/mismatch
        '--disable-font-subpixel-positioning', // Sharpen text for screenshots
        '--hide-scrollbars' // Clean capture
      ],
      // High-DPI Viewport (Matches manual workflow)
      defaultViewport: {
        width: 2000,
        height: 2000,
        deviceScaleFactor: 2
      }
    });
    console.log('✅ Browser launched with GPU acceleration');

    const page = await browser.newPage();
    console.log('✅ New page created');

    // 2. Set viewport to match your manual DevTools settings
    await page.setViewport({
      width: 2000,
      height: 2000,
      deviceScaleFactor: 2 // DPR = 2.0
    });
    console.log('✅ Viewport set to 2000x2000, DPR=2');

    console.log(`🌐 Navigating to ${SALES_PAGE_URL}...`);

    // 3. Navigate to your local dashboard
    await page.goto(SALES_PAGE_URL, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    console.log('✅ Page loaded successfully');

    console.log('⏳ Waiting for content to load...');

    // 4. Wait for the container to be fully loaded
    const selector = '#sales-analytics-export-container';
    await page.waitForSelector(selector, { timeout: 10000 });
    console.log('✅ Container found');

    // Give charts time to render
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('✅ Waited for charts to render');

    console.log('📷 Taking screenshot...');

    // 5. Find and screenshot the specific element
    const element = await page.$(selector);

    if (!element) {
      throw new Error('Container element not found');
    }
    console.log('✅ Element selected');

    const screenshot = await element.screenshot({
      type: 'png',
      omitBackground: false
    });

    console.log('✅ Screenshot captured successfully');

    // 6. Send the image back to the client
    const date = new Date().toISOString().split('T')[0];
    const filename = `Sales_Report_Puppeteer_${date}.png`;

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(screenshot);

  } catch (error) {
    console.error('❌ Export failed:', error);
    console.error('Stack trace:', error.stack);
    
    // Provide helpful error message for connection errors
    const errorMessage = error.message || 'Unknown error';
    const isConnectionError = errorMessage.includes('ERR_CONNECTION_REFUSED') || 
                              errorMessage.includes('Development server is not running');
    
    res.status(500).json({
      error: 'Failed to generate report',
      message: errorMessage,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      hint: isConnectionError ? 
        `Make sure the dev server is running at ${DEV_SERVER_URL}. Start it with: npm run dev` :
        undefined
    });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
});

// Helper to run shortcut workflow automation
async function runShortcutAutomation({ email, password, reportType = 'sales' }) {
  if (!email || !password) {
    throw new Error('Shortcut automation credentials are missing. Set SHORTCUT_EMAIL and SHORTCUT_PASSWORD env vars.');
  }

  // Configure based on report type
  const reportConfig = {
    sales: {
      targetUrl: SALES_PAGE_URL,
      selector: '#root > div > div > main > div > div > div.space-y-6.p-12',
      filename: 'Sales_Report.pdf'
    },
    collections: {
      targetUrl: `${DEV_SERVER_URL}/collections`,
      selector: '#collections-analytics-export',
      filename: 'Collections_Report.pdf'
    },
    commission: {
      targetUrl: `${DEV_SERVER_URL}/reports`,
      selector: '#commission-report-content',
      filename: 'Commission_Report.pdf'
    }
  };

  const config = reportConfig[reportType];
  if (!config) {
    throw new Error(`Invalid report type: ${reportType}. Must be 'sales' or 'collections'.`);
  }

  const browser = await puppeteer.launch({
    // Use the new headless mode (closer to real Chrome)
    headless: 'new',
    // Force GPU and Color Accuracy
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--enable-gpu', // Enable GPU acceleration
      '--use-gl=desktop', // Use desktop graphics instead of SwiftShader
      '--force-color-profile=srgb', // Prevent color washing/mismatch
      '--disable-font-subpixel-positioning', // Sharpen text for screenshots
      '--hide-scrollbars' // Clean capture
    ],
    // High-DPI Viewport (Matches manual workflow)
    defaultViewport: {
      width: 2000,
      height: 2000,
      deviceScaleFactor: 2
    }
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({
      width: 2000,
      height: 2000,
      deviceScaleFactor: 2 // DPR = 2.0
    });

    console.log('🔐 Navigating to login page...');
    await page.goto(LOGIN_PAGE_URL, { waitUntil: 'networkidle0', timeout: 60000 });
    await page.waitForSelector('input[type="email"]', { timeout: 15000 });

    // Fill credentials
    await page.type('input[type="email"]', email, { delay: 35 });
    await page.type('input[type="password"]', password, { delay: 35 });

    // Submit login form
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 60000 }).catch(() => {}),
      page.click('button[type="submit"]'),
    ]);

    console.log(`✅ Login submitted, navigating to ${reportType} page...`);
    await page.goto(config.targetUrl, { waitUntil: 'networkidle0', timeout: 60000 });

    // Wait for the page to fully load
    await new Promise(resolve => setTimeout(resolve, 2000));

    // For Commission report, ensure the Commission tab is selected
    if (reportType === 'commission') {
      console.log('🔄 Ensuring Commission report tab is selected...');
      // Click on the Commission report tab button by finding the button with data-report-type="Commission"
      try {
        await page.waitForSelector('[data-report-type="Commission"]', { timeout: 5000 });
        await page.click('[data-report-type="Commission"]');
        console.log('✅ Commission tab clicked');
        // Wait for the tab to switch and content to load
        await new Promise(resolve => setTimeout(resolve, 1500));
      } catch (error) {
        console.log('⚠️ Could not find Commission tab button, continuing anyway...');
      }
    }

    // Use the configured selector
    const targetSelector = config.selector;
    console.log('🔍 Looking for target element:', targetSelector);
    
    await page.waitForSelector(targetSelector, { visible: true, timeout: 20000 });
    console.log('✅ Target element found');

    // Mimic DevTools device toolbar: Set DPR to 2.0 and zoom to 50%
    console.log('⚙️ Setting DPR to 2.0 and zoom to 50%...');
    const client = await page.target().createCDPSession();
    await client.send('Emulation.setDeviceMetricsOverride', {
      mobile: false,
      width: 2000,
      height: 2000,
      deviceScaleFactor: 2.0, // DPR = 2.0
      screenOrientation: { type: 'landscapePrimary', angle: 0 },
    });
    await client.send('Emulation.setPageScaleFactor', { pageScaleFactor: 0.5 }); // 50% zoom
    console.log('✅ DevTools settings applied (DPR 2.0, 50% zoom)');

    // Ensure the element is in view
    await page.evaluate((selector) => {
      const el = document.querySelector(selector);
      if (el) {
        el.scrollIntoView({ behavior: 'instant', block: 'start' });
      }
    }, targetSelector);

    // Wait for layout to settle after zoom/DPR changes
    await new Promise(resolve => setTimeout(resolve, 1500));

    const elementHandle = await page.$(targetSelector);
    if (!elementHandle) {
      throw new Error('Target element not found for screenshot. Selector: ' + targetSelector);
    }
    console.log('✅ Element ready for screenshot');

    // Get element dimensions before screenshot
    const elementDimensions = await page.evaluate((selector) => {
      const el = document.querySelector(selector);
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      return {
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      };
    }, targetSelector);

    if (!elementDimensions) {
      throw new Error('Could not get element dimensions');
    }

    console.log(`📐 Element dimensions: ${elementDimensions.width}x${elementDimensions.height} pixels`);

    // Use Base64 encoding directly (fixes PDF corruption issues)
    console.log('📸 Taking screenshot with Base64 encoding...');
    const screenshotBase64 = await elementHandle.screenshot({ 
      type: 'png',
      encoding: 'base64'  // Returns Base64 string directly, avoiding binary corruption
    });
    
    console.log('✅ Screenshot captured as Base64 string');
    
    return { screenshotBase64, dimensions: elementDimensions, filename: config.filename };
  } finally {
    await browser.close();
  }
}


app.post('/api/shortcut-screenshot', async (req, res) => {
  console.log('⚡ Shortcut automation requested...');

  try {
    const { reportType = 'sales' } = req.body; // Default to 'sales' for backwards compatibility
    
    const credentials = {
      email: process.env.SHORTCUT_EMAIL || process.env.APP_USERNAME,
      password: process.env.SHORTCUT_PASSWORD || process.env.APP_PASSWORD,
      reportType,
    };

    // Ensure dev server is running
    const isServerRunning = await checkDevServer(DEV_SERVER_URL);
    if (!isServerRunning) {
      throw new Error(`Development server is not running at ${DEV_SERVER_URL}. Start it with "npm run dev".`);
    }

    // Step 1: Capture screenshot as Base64 string and get dimensions
    const { screenshotBase64, dimensions, filename } = await runShortcutAutomation(credentials);
    console.log('✅ Screenshot captured as Base64, converting to PDF...');

    // Step 2: Convert Base64 string directly to PDF (avoids binary corruption)
    const pdfBuffer = convertBase64ToPDF(screenshotBase64, dimensions);
    console.log('✅ PDF generated successfully');

    // Step 3: Send PDF response
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('❌ Shortcut automation failed:', error);
    res.status(500).json({
      error: 'Shortcut automation failed',
      message: error.message ?? 'Unknown error',
    });
  }
});


app.listen(PORT, () => {
  console.log(`🚀 Export server running on http://localhost:${PORT}`);
  console.log(`📡 Endpoints:`);
  console.log(`   - POST http://localhost:${PORT}/api/export-sales-report`);
  console.log(`   - POST http://localhost:${PORT}/api/shortcut-screenshot`);
  console.log(`🔗 Expecting dev server at: ${DEV_SERVER_URL}`);
  console.log(`📄 Target page: ${SALES_PAGE_URL}`);
  console.log(`\n💡 To start the dev server: npm run dev`);
});

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
const PORT = process.env.PORT || 3001;

// Get app URL from environment - supports both production and development
// Priority: APP_URL > DEV_SERVER_URL > default localhost
const APP_URL = process.env.APP_URL || process.env.DEV_SERVER_URL || (process.env.NODE_ENV === 'production' ? null : `http://localhost:${process.env.VITE_PORT || process.env.PORT || 3000}`);

if (!APP_URL) {
  console.error('❌ APP_URL environment variable is required in production');
  console.error('   Set APP_URL to your production app URL (e.g., https://your-app.vercel.app)');
  process.exit(1);
}

const SALES_PAGE_URL = `${APP_URL}/sales`;
const LOGIN_PAGE_URL = `${APP_URL}/login`;

app.use(cors());
app.use(express.json());

// Helper function to check if app server is accessible
function checkDevServer(url) {
  return new Promise((resolve) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname || '/',
      method: 'HEAD',
      timeout: 10000 // Increased timeout for production
    };

    const req = http.request(options, (res) => {
      resolve(res.statusCode >= 200 && res.statusCode < 500); // Accept any 2xx, 3xx, or 4xx (but not 5xx)
    });

    req.on('error', (err) => {
      console.log(`⚠️ Health check error for ${url}:`, err.message);
      // In production, be more lenient - if it's a network error, still allow (might be temporary)
      resolve(true); // Allow export to proceed even if health check fails
    });

    req.on('timeout', () => {
      req.destroy();
      console.log(`⚠️ Health check timeout for ${url}`);
      // In production, be more lenient
      resolve(true); // Allow export to proceed
    });

    req.setTimeout(10000);
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
    // Check if app server is accessible before attempting export
    console.log(`🔍 Checking if app is accessible at ${APP_URL}...`);
    const isServerRunning = await checkDevServer(APP_URL);
    
    if (!isServerRunning) {
      throw new Error(
        `Application is not accessible at ${APP_URL}.\n\n` +
        `Please ensure the application is properly deployed and accessible.`
      );
    }
    console.log('✅ App is accessible');

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
    
    // Set timezone to match user's expected timezone (defaults to America/Chicago for US Central Time)
    // This ensures date calculations match what users see in their browser
    const timezone = process.env.TIMEZONE || 'America/Chicago';
    await page.emulateTimezone(timezone);
    console.log(`🕐 Timezone set to: ${timezone}`);

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
        `Make sure the app is accessible at ${APP_URL}. Please ensure the application is properly deployed.` :
        undefined
    });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
});

// Helper to run shortcut workflow automation
async function runShortcutAutomation({ email, password, reportType = 'sales', weekKey }) {
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
      targetUrl: `${APP_URL}/collections`,
      selector: '#collections-analytics-export',
      filename: 'Collections_Report.pdf'
    },
    commission: {
      targetUrl: `${APP_URL}/reports`,
      selector: '#commission-report-content',
      filename: 'Commission_Report.pdf'
    }
  };

  const config = reportConfig[reportType];
  if (!config) {
    throw new Error(`Invalid report type: ${reportType}. Must be 'sales', 'collections', or 'commission'.`);
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
    
    // Set timezone FIRST, before any other operations
    // This ensures date calculations match what users see in their browser
    const timezone = process.env.TIMEZONE || 'America/Chicago';
    await page.emulateTimezone(timezone);
    console.log(`🕐 Timezone set to: ${timezone}`);
    
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
    console.log('🔐 Submitting login form...');
    await page.click('button[type="submit"]');
    
    // Wait for navigation with better error handling
    try {
      await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 60000 });
      console.log('✅ Login successful, navigated to dashboard');
    } catch (navError) {
      console.log('⚠️ Navigation wait timed out, checking if login was successful...');
      // Check if we're on a different page (login might have succeeded but navigation detection failed)
      const currentUrl = page.url();
      if (currentUrl.includes('/login')) {
        throw new Error('Login may have failed - still on login page');
      }
      console.log(`✅ Currently at: ${currentUrl}`);
    }

    console.log(`✅ Login submitted, navigating to ${reportType} page...`);
    await page.goto(config.targetUrl, { waitUntil: 'networkidle0', timeout: 60000 });
    
    // Verify page loaded
    if (page.isClosed()) {
      throw new Error('Page closed unexpectedly after navigation');
    }

    // Verify timezone is still set and wait for page to fully load
    const currentTimezone = await page.evaluate(() => Intl.DateTimeFormat().resolvedOptions().timeZone);
    console.log(`🕐 Current page timezone: ${currentTimezone}`);
    
    // Wait for the page to fully load and for date calculations to complete
    await new Promise(resolve => setTimeout(resolve, 3000));

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

        // If weekKey is provided, select the week from the dropdown
        if (weekKey) {
          console.log(`📅 Selecting week: ${weekKey}...`);
          try {
            // Wait for the week selector to be available
            await page.waitForSelector('.app-select-trigger', { timeout: 5000 });
            
            // Find the week selector by looking for a label with "Week" text nearby
            const weekSelectorFound = await page.evaluate((targetWeekKey) => {
              // Find all AppSelect containers
              const selects = Array.from(document.querySelectorAll('.app-select-container'));
              
              for (const select of selects) {
                // Check if there's a "Week" label nearby
                const container = select.closest('div');
                if (container) {
                  const labels = Array.from(container.querySelectorAll('label'));
                  const isWeekSelector = labels.some(l => {
                    const text = (l.textContent || '').toLowerCase();
                    return text.includes('week') || text.includes('select week');
                  });
                  
                  if (isWeekSelector) {
                    // Found the week selector
                    const trigger = select.querySelector('.app-select-trigger');
                    if (trigger) {
                      return true; // Return that we found it
                    }
                  }
                }
              }
              return false;
            }, weekKey);
            
            if (weekSelectorFound) {
              // Click the week selector trigger to open dropdown
              // Find the week selector by looking for the one near a "Week" label
              await page.evaluate(() => {
                const selects = Array.from(document.querySelectorAll('.app-select-container'));
                for (const select of selects) {
                  const container = select.closest('div');
                  if (container) {
                    const labels = Array.from(container.querySelectorAll('label'));
                    const isWeekSelector = labels.some(l => {
                      const text = (l.textContent || '').toLowerCase();
                      return text.includes('week') || text.includes('select week');
                    });
                    if (isWeekSelector) {
                      const trigger = select.querySelector('.app-select-trigger');
                      if (trigger) {
                        trigger.click();
                        return;
                      }
                    }
                  }
                }
              });
              
              // Wait for dropdown menu to appear
              await new Promise(resolve => setTimeout(resolve, 500));
              
              // Find and click the matching option
              const optionClicked = await page.evaluate((targetWeekKey) => {
                const menu = document.querySelector('.app-select-menu');
                if (!menu) return false;
                
                const options = Array.from(menu.querySelectorAll('.app-select-option'));
                
                // Parse the target weekKey to extract date info
                // weekKey format is like "2024-01-05" (YYYY-MM-DD)
                const targetDate = new Date(targetWeekKey + 'T00:00:00');
                if (isNaN(targetDate.getTime())) return false;
                
                const targetYear = targetDate.getFullYear();
                const targetMonth = targetDate.getMonth() + 1; // 1-12
                const targetDay = targetDate.getDate();
                
                // Try to find option by matching date in label text
                // Label format is like "Fri, Jan 5 → Thu, Jan 11, 2024"
                for (const option of options) {
                  const text = (option.textContent || '').trim();
                  
                  // Check if this option's text contains the target date
                  // Look for year first (most reliable)
                  if (text.includes(targetYear.toString())) {
                    // Check for month (could be "Jan", "January", or number)
                    const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 
                                        'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
                    const monthName = monthNames[targetMonth - 1];
                    const monthNum = targetMonth.toString();
                    
                    if (text.toLowerCase().includes(monthName) || 
                        text.includes(`/${monthNum}/`) ||
                        text.includes(`-${monthNum}-`) ||
                        (targetMonth < 10 && text.includes(`/0${monthNum}/`))) {
                      // Check for day - use word boundary to avoid partial matches
                      const dayPattern = new RegExp(`\\b${targetDay}\\b`);
                      if (dayPattern.test(text)) {
                        option.click();
                        return true;
                      }
                    }
                  }
                }
                return false;
              }, weekKey);
              
              if (optionClicked) {
                // Wait for the report to update after selection
                await new Promise(resolve => setTimeout(resolve, 2000));
                console.log(`✅ Week ${weekKey} selected`);
              } else {
                console.log('⚠️ Could not find matching week option, continuing with current week...');
              }
            } else {
              console.log('⚠️ Week selector not found, continuing with current week...');
            }
          } catch (error) {
            console.log(`⚠️ Error selecting week ${weekKey}:`, error.message);
            console.log('Continuing with current week...');
          }
        }
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

    // Check if page is still open before taking screenshot
    if (page.isClosed()) {
      throw new Error('Page was closed before screenshot could be taken');
    }

    // Use Base64 encoding directly (fixes PDF corruption issues)
    console.log('📸 Taking screenshot with Base64 encoding...');
    
    try {
      const screenshotBase64 = await elementHandle.screenshot({ 
        type: 'png',
        encoding: 'base64'  // Returns Base64 string directly, avoiding binary corruption
      });
      
      console.log('✅ Screenshot captured as Base64 string');
      
      return { screenshotBase64, dimensions: elementDimensions, filename: config.filename };
    } catch (screenshotError) {
      console.error('❌ Screenshot failed:', screenshotError.message);
      // Check if page/browser closed
      if (screenshotError.message.includes('Target closed') || screenshotError.message.includes('Session closed')) {
        throw new Error('Browser or page was closed during screenshot. This may indicate the page took too long to load or encountered an error.');
      }
      throw screenshotError;
    }
  } catch (error) {
    console.error('❌ Error in runShortcutAutomation:', error.message);
    throw error;
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error('Error closing browser:', closeError.message);
      }
    }
  }
}


app.post('/api/shortcut-screenshot', async (req, res) => {
  console.log('⚡ Shortcut automation requested...');

  try {
    const { reportType = 'sales', weekKey } = req.body; // Default to 'sales' for backwards compatibility
    
    const credentials = {
      email: process.env.SHORTCUT_EMAIL || process.env.APP_USERNAME,
      password: process.env.SHORTCUT_PASSWORD || process.env.APP_PASSWORD,
      reportType,
      weekKey,
    };

    // Ensure app server is accessible
    const isServerRunning = await checkDevServer(APP_URL);
    if (!isServerRunning) {
      throw new Error(`Application is not accessible at ${APP_URL}. Please ensure the application is properly deployed.`);
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
  console.log(`🚀 Export server running on port ${PORT}`);
  console.log(`📡 Endpoints:`);
  console.log(`   - POST /api/export-sales-report`);
  console.log(`   - POST /api/shortcut-screenshot`);
  console.log(`🔗 App URL: ${APP_URL}`);
  console.log(`📄 Target page: ${SALES_PAGE_URL}`);
  if (process.env.NODE_ENV === 'production') {
    console.log(`\n✅ Running in production mode`);
  } else {
    console.log(`\n💡 Running in development mode`);
  }
});

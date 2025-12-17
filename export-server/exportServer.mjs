import express from 'express';
import cors from 'cors';
import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import http from 'http';
import https from 'https';
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

// Configure CORS to allow requests from your production domain
app.use(cors({
  origin: [
    'https://bbbhq.app',
    'http://localhost:3000',
    'http://localhost:5173',
    process.env.APP_URL
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Helper function to check if app server is accessible
function checkDevServer(url) {
  return new Promise((resolve) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const httpModule = isHttps ? https : http;
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname || '/',
      method: 'HEAD',
      timeout: 10000, // Increased to 10 seconds
      rejectUnauthorized: true // Verify SSL certificates
    };

    const req = httpModule.request(options, (res) => {
      console.log(`✅ App accessibility check: ${res.statusCode} ${res.statusMessage}`);
      resolve(res.statusCode >= 200 && res.statusCode < 400);
    });

    req.on('error', (error) => {
      console.error(`❌ App accessibility check failed: ${error.message}`);
      resolve(false);
    });

    req.on('timeout', () => {
      console.error(`❌ App accessibility check timed out after 10s`);
      req.destroy();
      resolve(false);
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

    // Wait for Recharts charts to fully render, including LabelList text elements
    console.log('📊 Waiting for Recharts to fully render...');
    try {
      await page.waitForFunction(() => {
        const containers = document.querySelectorAll('.recharts-responsive-container');
        if (containers.length === 0) return false;
        
        // Check that containers have actual width/height
        const hasDimensions = Array.from(containers).every(container => {
          const rect = container.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        });
        
        if (!hasDimensions) return false;
        
        // Check for actual chart content - Recharts renders paths, lines, and rects
        const svgElements = document.querySelectorAll('svg');
        if (svgElements.length === 0) return false;
        
        // Check for chart-specific elements with actual data
        const hasChartContent = Array.from(svgElements).some(svg => {
          const paths = svg.querySelectorAll('path[d]');
          const rects = svg.querySelectorAll('rect[width][height]');
          const areas = svg.querySelectorAll('path.recharts-area-curve');
          
          const hasValidPaths = Array.from(paths).some(path => {
            const d = path.getAttribute('d');
            return d && d.length > 10;
          });
          
          const hasValidRects = Array.from(rects).some(rect => {
            const width = parseFloat(rect.getAttribute('width') || '0');
            const height = parseFloat(rect.getAttribute('height') || '0');
            return width > 0 && height > 0;
          });
          
          return hasValidPaths || hasValidRects || areas.length > 0;
        });
        
        // Additionally, wait for LabelList text elements if they exist
        // This ensures numbers on step area charts are rendered
        const allSvgs = document.querySelectorAll('svg');
        let hasLabelListRendered = true; // Default to true if no LabelList expected
        for (const svg of allSvgs) {
          // Check if this chart has LabelList (text elements with content)
          const textElements = svg.querySelectorAll('text');
          const labelTexts = Array.from(textElements).filter(text => {
            const textContent = text.textContent || '';
            const hasContent = textContent.trim().length > 0;
            const hasPosition = text.hasAttribute('x') && text.hasAttribute('y');
            // Check if it's a number (LabelList typically shows numeric values)
            const isNumeric = /^\d+([.,]\d+)?$/.test(textContent.trim().replace(/[$,]/g, ''));
            return hasContent && hasPosition && isNumeric;
          });
          
          // If we found text elements that look like LabelList, ensure they're rendered
          if (labelTexts.length > 0) {
            // Check if at least some LabelList texts are visible and positioned
            const visibleLabelTexts = labelTexts.filter(text => {
              const style = window.getComputedStyle(text);
              const rect = text.getBoundingClientRect();
              return style.display !== 'none' && 
                     style.visibility !== 'hidden' && 
                     style.opacity !== '0' &&
                     rect.width > 0 && 
                     rect.height > 0;
            });
            
            // If we have LabelList elements but none are visible yet, wait
            if (visibleLabelTexts.length === 0) {
              hasLabelListRendered = false;
              break;
            }
          }
        }
        
        return hasChartContent && hasLabelListRendered;
      }, { timeout: 15000 });
      console.log('✅ Recharts charts detected with data');
    } catch (error) {
      console.log('⚠️ Chart detection timeout, continuing anyway...');
    }
    
    // Wait for any Recharts animations to complete (default animation duration is ~1000ms)
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Additional wait to ensure all charts are fully painted and stable, including LabelList
    await new Promise(resolve => setTimeout(resolve, 3000));
    console.log('✅ Chart rendering complete');

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
async function runShortcutAutomation({ email, password, reportType = 'sales', weekKey }) {
  if (!email || !password) {
    throw new Error('Shortcut automation credentials are missing. Set SHORTCUT_EMAIL and SHORTCUT_PASSWORD env vars.');
  }
  
  console.log(`🔧 Configuration:`);
  console.log(`   APP_URL: ${APP_URL}`);
  console.log(`   LOGIN_PAGE_URL: ${LOGIN_PAGE_URL}`);
  console.log(`   Report Type: ${reportType}`);

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
      '--disable-dev-shm-usage', // Overcome limited resource problems
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process', // Run in single process mode (helps with memory)
      '--disable-gpu', // Disable GPU for Railway environment
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
    
    // Set default navigation timeout to 180 seconds (longer than individual timeouts)
    // This must be set BEFORE any navigation calls
    page.setDefaultNavigationTimeout(180000);
    page.setDefaultTimeout(180000);
    
    // Set custom User Agent to identify as Puppeteer bot
    // This allows the React app to skip heavy WebGL animations on the login page
    const userAgent = await browser.userAgent();
    await page.setUserAgent(`${userAgent} Puppeteer`);
    console.log('🤖 Set User Agent to identify as Puppeteer bot');
    
    await page.setViewport({
      width: 2000,
      height: 2000,
      deviceScaleFactor: 2 // DPR = 2.0
    });

    // Monitor network requests for debugging
    const failedRequests = [];
    page.on('requestfailed', (request) => {
      failedRequests.push({
        url: request.url(),
        failure: request.failure()?.errorText || 'Unknown error'
      });
      console.error(`❌ Request failed: ${request.url()} - ${request.failure()?.errorText || 'Unknown error'}`);
    });
    
    page.on('response', (response) => {
      if (response.status() >= 400) {
        console.error(`⚠️ HTTP ${response.status()} for ${response.url()}`);
      }
    });

    console.log('🔐 Navigating to login page...');
    console.log(`📍 Login URL: ${LOGIN_PAGE_URL}`);
    console.log(`🌐 APP_URL: ${APP_URL}`);
    
    // Verify APP_URL is accessible before attempting navigation
    console.log(`🔍 Verifying APP_URL accessibility...`);
    const isAccessible = await checkDevServer(APP_URL);
    if (!isAccessible) {
      throw new Error(`APP_URL ${APP_URL} is not accessible. Please verify the URL is correct and the site is deployed.`);
    }
    console.log(`✅ APP_URL is accessible`);
    
    try {
      // First, navigate with domcontentloaded to get initial HTML quickly
      console.log(`⏳ Starting navigation (timeout: 180s)...`);
      console.log(`🌐 Target URL: ${LOGIN_PAGE_URL}`);
      
      // Try navigation with retry logic and multiple wait strategies
      let navigationSuccess = false;
      let lastError = null;
      const maxRetries = 3;
      const waitStrategies = ['domcontentloaded', 'load', 'networkidle0'];
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        for (const waitStrategy of waitStrategies) {
          try {
            console.log(`🔄 Navigation attempt ${attempt}/${maxRetries} with waitUntil: ${waitStrategy}...`);
            console.log(`⏱️  Timeout set to: 180000ms (3 minutes)`);
            
            await page.goto(LOGIN_PAGE_URL, { 
              waitUntil: waitStrategy, 
              timeout: 180000 
            });
            navigationSuccess = true;
            console.log(`✅ Initial page load complete using ${waitStrategy}`);
            break;
          } catch (error) {
            lastError = error;
            console.error(`❌ Navigation attempt ${attempt} with ${waitStrategy} failed: ${error.message}`);
            // If it's a timeout error, try next strategy
            if (error.message.includes('timeout')) {
              continue; // Try next wait strategy
            } else {
              break; // If it's not a timeout, break and retry
            }
          }
        }
        
        if (navigationSuccess) break;
        
        if (attempt < maxRetries) {
          console.log(`⏳ Retrying in 5 seconds...`);
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
      
      if (!navigationSuccess) {
        throw lastError || new Error('Navigation failed after all retries and wait strategies');
      }
      
      // Check if we got an error page
      const pageTitle = await page.title();
      const pageUrl = page.url();
      console.log(`📄 Page title: ${pageTitle}`);
      console.log(`🌐 Current URL: ${pageUrl}`);
      
      if (failedRequests.length > 0) {
        console.warn(`⚠️ ${failedRequests.length} network request(s) failed during navigation`);
      }
      
      // Then wait for React to initialize and the email input to appear
      console.log('⏳ Waiting for login form to appear...');
      await page.waitForFunction(
        () => {
          const emailInput = document.querySelector('input[type="email"]');
          return emailInput !== null && emailInput.offsetParent !== null;
        },
        { timeout: 120000 }
      );
      console.log('✅ Login form is ready');
    } catch (error) {
      console.error(`❌ Failed to load login page: ${error.message}`);
      console.error(`❌ Error stack: ${error.stack}`);
      
      // Get more debugging info
      try {
        const currentUrl = page.url();
        const pageTitle = await page.title().catch(() => 'Unable to get title');
        console.error(`📄 Current page URL: ${currentUrl}`);
        console.error(`📄 Current page title: ${pageTitle}`);
        
        if (failedRequests.length > 0) {
          console.error(`❌ Failed network requests:`);
          failedRequests.forEach((req, idx) => {
            console.error(`   ${idx + 1}. ${req.url} - ${req.failure}`);
          });
        }
        
        // Take a screenshot for debugging
        const screenshot = await page.screenshot({ encoding: 'base64' });
        console.log(`📸 Screenshot taken (base64 length: ${screenshot.length})`);
      } catch (debugError) {
        console.error(`❌ Could not gather debug info: ${debugError.message}`);
      }
      
      throw new Error(`Failed to navigate to login page: ${error.message}. URL: ${LOGIN_PAGE_URL}. Failed requests: ${failedRequests.length}`);
    }

    // Fill credentials
    await page.type('input[type="email"]', email, { delay: 35 });
    await page.type('input[type="password"]', password, { delay: 35 });

    // Submit login form
    console.log('🔐 Submitting login form...');
    await page.click('button[type="submit"]');
    
    // Wait for URL to change (login successful)
    await page.waitForFunction(
      (loginUrl) => window.location.href !== loginUrl,
      { timeout: 120000 },
      LOGIN_PAGE_URL
    );
    console.log('✅ Login successful, URL changed');
    
    // Wait a bit for the dashboard to start loading
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log(`✅ Navigating to ${reportType} page: ${config.targetUrl}`);
    // Navigate to target page and wait for network to be completely idle
    // This ensures all Supabase requests have completed before proceeding
    await page.goto(config.targetUrl, { 
      waitUntil: 'networkidle0', 
      timeout: 180000 
    });
    console.log('✅ Initial page navigation complete (network idle)');
    
    // Additional wait to ensure all data is loaded and rendered
    console.log('⏳ Waiting for network to be completely silent...');
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds of complete silence
    console.log('✅ Network is completely idle');
    
    // Wait for React to initialize and content to appear
    await page.waitForFunction(
      () => {
        const root = document.getElementById('root');
        return root !== null && root.children.length > 0;
      },
      { timeout: 60000 }
    );
    console.log('✅ React root initialized');

    // Wait for all images to load
    console.log('⏳ Waiting for all images to load...');
    await page.evaluate(async () => {
      const images = Array.from(document.images);
      await Promise.all(
        images.map((img) => {
          if (img.complete) return Promise.resolve();
          return new Promise((resolve, reject) => {
            img.addEventListener('load', resolve);
            img.addEventListener('error', resolve); // Resolve even on error to not block
            setTimeout(resolve, 5000); // Timeout after 5s per image
          });
        })
      );
    });
    console.log('✅ All images loaded');

    // Wait for any loading spinners/indicators to disappear
    console.log('⏳ Waiting for loading indicators to disappear...');
    try {
      await page.waitForFunction(
        () => {
          // Check for common loading indicators
          const loadingSelectors = [
            '[class*="loading"]',
            '[class*="spinner"]',
            '[class*="Loading"]',
            '[data-loading="true"]',
            '.animate-spin',
          ];
          
          for (const selector of loadingSelectors) {
            const elements = document.querySelectorAll(selector);
            for (const el of elements) {
              // Check if element is visible
              const style = window.getComputedStyle(el);
              if (style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0') {
                return false; // Still loading
              }
            }
          }
          return true; // No visible loading indicators
        },
        { timeout: 30000 }
      );
      console.log('✅ Loading indicators cleared');
    } catch (error) {
      console.log('⚠️ Timeout waiting for loading indicators, continuing anyway...');
    }

    // Wait for Supabase API requests to complete successfully
    console.log('⏳ Waiting for Supabase API requests to complete...');
    await new Promise((resolve) => {
      let idleTimer;
      let requestCount = 0;
      let supabaseRequestCount = 0;
      let supabaseSuccessCount = 0;
      const supabaseRequests = new Map(); // Track request -> response status
      const requiredSupabaseTables = ['Sales', 'Inventory', 'Payments', 'Delinquency'];
      const completedTables = new Set();
      
      const checkIdle = () => {
        clearTimeout(idleTimer);
        idleTimer = setTimeout(() => {
          // Check if we have successful responses for required tables
          const hasRequiredData = requiredSupabaseTables.some(table => 
            completedTables.has(table.toLowerCase())
          ) || supabaseSuccessCount > 0;
          
          // Only resolve if there are no pending requests AND we have at least some successful data
          if (requestCount === 0 && supabaseRequestCount === 0 && hasRequiredData) {
            page.off('request', onRequest);
            page.off('response', onResponse);
            page.off('requestfailed', onRequestFailed);
            clearTimeout(idleTimer);
            console.log(`✅ Supabase data loaded (${supabaseSuccessCount} successful request(s))`);
            resolve();
          } else if (requestCount === 0 && supabaseRequestCount === 0) {
            // No pending requests but no data yet - wait a bit more
            requestCount = 0;
            checkIdle(); // Check again
          } else {
            requestCount = 0;
            checkIdle(); // Check again
          }
        }, 2000); // Wait 2 seconds of no network activity
      };
      
      const onRequest = (request) => {
        const url = request.url();
        requestCount++;
        
        // Track Supabase requests specifically
        if (url.includes('supabase.co') && url.includes('/rest/v1/')) {
          supabaseRequestCount++;
          supabaseRequests.set(url, { status: 'pending', startTime: Date.now() });
          
          // Extract table name from URL
          const tableMatch = url.match(/\/rest\/v1\/([^?]+)/);
          if (tableMatch) {
            const tableName = tableMatch[1];
            console.log(`📡 Supabase request started: ${tableName}`);
          }
        }
        
        checkIdle();
      };
      
      const onResponse = (response) => {
        const url = response.url();
        requestCount = Math.max(0, requestCount - 1);
        
        // Track Supabase responses
        if (url.includes('supabase.co') && url.includes('/rest/v1/')) {
          supabaseRequestCount = Math.max(0, supabaseRequestCount - 1);
          const requestInfo = supabaseRequests.get(url);
          
          if (requestInfo) {
            const status = response.status();
            if (status >= 200 && status < 300) {
              // Successful response
              supabaseSuccessCount++;
              requestInfo.status = 'success';
              
              // Extract table name
              const tableMatch = url.match(/\/rest\/v1\/([^?]+)/);
              if (tableMatch) {
                const tableName = tableMatch[1];
                completedTables.add(tableName.toLowerCase());
                console.log(`✅ Supabase request succeeded: ${tableName} (${status})`);
              }
            } else {
              requestInfo.status = 'error';
              console.log(`⚠️ Supabase request error: ${url.substring(0, 60)}... (${status})`);
            }
            supabaseRequests.delete(url);
          }
        }
        
        checkIdle();
      };
      
      const onRequestFailed = (request) => {
        const url = request.url();
        requestCount = Math.max(0, requestCount - 1);
        
        // Handle failed Supabase requests
        if (url.includes('supabase.co') && url.includes('/rest/v1/')) {
          supabaseRequestCount = Math.max(0, supabaseRequestCount - 1);
          const requestInfo = supabaseRequests.get(url);
          
          if (requestInfo) {
            const failure = request.failure();
            const errorText = failure?.errorText || 'Unknown error';
            
            // Only log if it's not a cancellation (which is expected during navigation)
            if (errorText === 'net::ERR_ABORTED') {
              // Silently ignore cancellations - they're expected during page transitions
              requestInfo.status = 'cancelled';
            } else {
              requestInfo.status = 'failed';
              const tableMatch = url.match(/\/rest\/v1\/([^?]+)/);
              if (tableMatch) {
                console.log(`⚠️ Supabase request failed: ${tableMatch[1]} - ${errorText}`);
              }
            }
            supabaseRequests.delete(url);
          }
        }
        
        checkIdle();
      };
      
      page.on('request', onRequest);
      page.on('response', onResponse);
      page.on('requestfailed', onRequestFailed);
      
      // Start checking after a brief delay to let initial requests start
      setTimeout(() => {
        if (requestCount === 0 && supabaseRequestCount === 0 && supabaseSuccessCount > 0) {
          page.off('request', onRequest);
          page.off('response', onResponse);
          page.off('requestfailed', onRequestFailed);
          resolve();
        } else {
          checkIdle();
        }
      }, 2000); // Give requests 2 seconds to start
      
      // Fallback timeout - ensure we don't wait forever
      setTimeout(() => {
        page.off('request', onRequest);
        page.off('response', onResponse);
        page.off('requestfailed', onRequestFailed);
        clearTimeout(idleTimer);
        if (supabaseRequestCount > 0) {
          console.log(`⚠️ Timeout waiting for ${supabaseRequestCount} Supabase request(s), proceeding with ${supabaseSuccessCount} successful...`);
        } else if (supabaseSuccessCount === 0) {
          console.log(`⚠️ No successful Supabase requests detected, but proceeding anyway...`);
        }
        resolve();
      }, 45000); // Max 45 seconds wait for Supabase requests
    });
    console.log('✅ Network idle (Supabase requests handled)');

    // Wait for data to actually be loaded in the page
    console.log('⏳ Waiting for data to be loaded in the page...');
    try {
      // Wait for the page to have actual content (not just loading states)
      await page.waitForFunction(
        () => {
          // Check if there's actual data content visible
          // For sales page, look for sales data
          const salesContainer = document.querySelector('#sales-analytics-export-container');
          if (salesContainer) {
            // Check if there are actual stat cards or charts with data
            const statCards = salesContainer.querySelectorAll('[class*="StatCard"], [class*="stat"]');
            const charts = salesContainer.querySelectorAll('canvas, svg, [class*="chart"], [class*="Chart"]');
            // If we have stat cards or charts, assume data is loaded
            if (statCards.length > 0 || charts.length > 0) {
              return true;
            }
          }
          
          // For collections page
          const collectionsContainer = document.querySelector('#collections-analytics-export');
          if (collectionsContainer) {
            const hasContent = collectionsContainer.textContent && collectionsContainer.textContent.trim().length > 100;
            return hasContent;
          }
          
          // For commission report
          const commissionContainer = document.querySelector('#commission-report-content');
          if (commissionContainer) {
            const hasContent = commissionContainer.textContent && commissionContainer.textContent.trim().length > 100;
            return hasContent;
          }
          
          return false;
        },
        { timeout: 30000 }
      );
      console.log('✅ Data content verified');
    } catch (error) {
      console.log('⚠️ Could not verify data content, continuing anyway...');
    }
    
    // Additional wait for charts and dynamic content to render
    console.log('⏳ Waiting for charts and dynamic content to render...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Wait for any canvas elements (charts) to be rendered
    await page.evaluate(async () => {
      const canvases = Array.from(document.querySelectorAll('canvas'));
      if (canvases.length > 0) {
        // Wait a bit for canvas rendering
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    });
    console.log('✅ Charts rendered');

    // For Commission report, ensure the Commission tab is selected
    if (reportType === 'commission') {
      console.log('🔄 Ensuring Commission report tab is selected...');
      // Click on the Commission report tab button by finding the button with data-report-type="Commission"
      try {
        await page.waitForSelector('[data-report-type="Commission"]', { timeout: 5000 });
        await page.click('[data-report-type="Commission"]');
        console.log('✅ Commission tab clicked');
        // Wait for the tab to switch and content to load
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Wait for network to be idle after tab switch
        await new Promise(resolve => setTimeout(resolve, 2000));
        console.log('✅ Commission tab content loaded');

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
                console.log('⏳ Waiting for report to update after week selection...');
                await new Promise(resolve => setTimeout(resolve, 3000));
                
                // Wait for network to be idle after week selection
                await new Promise(resolve => setTimeout(resolve, 2000));
                console.log(`✅ Week ${weekKey} selected and report updated`);
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
    
    // Wait for target element to be visible and fully rendered
    await page.waitForSelector(targetSelector, { visible: true, timeout: 60000 });
    console.log('✅ Target element found');
    
    // Wait for element to have actual data content (not just loading states)
    console.log('⏳ Waiting for element to have actual data content...');
    await page.waitForFunction(
      (selector) => {
        const el = document.querySelector(selector);
        if (!el) return false;
        
        // Check if element has meaningful content
        const hasText = el.textContent && el.textContent.trim().length > 100;
        const hasChildren = el.children.length > 0;
        const hasImages = el.querySelectorAll('img').length > 0;
        
        // Check if images are loaded
        const images = Array.from(el.querySelectorAll('img'));
        const allImagesLoaded = images.every(img => img.complete && img.naturalHeight !== 0);
        
        // For sales page, check for charts/canvas elements
        if (selector.includes('sales-analytics')) {
          const charts = el.querySelectorAll('canvas');
          const hasCharts = charts.length > 0;
          // Check if charts have been rendered (canvas has content)
          const chartsRendered = Array.from(charts).some(canvas => {
            const ctx = canvas.getContext('2d');
            if (!ctx) return false;
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            // Check if canvas has non-transparent pixels (indicating it's been drawn)
            return imageData.data.some((val, idx) => idx % 4 !== 3 && val !== 0);
          });
          return (hasText || hasChildren || hasImages) && allImagesLoaded && (hasCharts ? chartsRendered : true);
        }
        
        return (hasText || hasChildren || hasImages) && allImagesLoaded;
      },
      { timeout: 60000 },
      targetSelector
    );
    console.log('✅ Target element has data content');
    
    // Final wait to ensure everything is stable
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('✅ Final stabilization wait complete');

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
    console.log('⏳ Waiting for layout to settle after DPR/zoom changes...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Verify element is still visible and has content after DPR changes
    await page.waitForFunction(
      (selector) => {
        const el = document.querySelector(selector);
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      },
      { timeout: 10000 },
      targetSelector
    );
    console.log('✅ Layout settled and element verified');

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
    const { reportType = 'sales', weekKey } = req.body; // Default to 'sales' for backwards compatibility
    
    const credentials = {
      email: process.env.SHORTCUT_EMAIL || process.env.APP_USERNAME,
      password: process.env.SHORTCUT_PASSWORD || process.env.APP_PASSWORD,
      reportType,
      weekKey,
    };

    // Log the APP_URL being used
    console.log(`🌐 Using APP_URL: ${APP_URL}`);
    console.log(`🔗 Login URL: ${LOGIN_PAGE_URL}`);
    
    // Ensure app server is accessible
    console.log(`🔍 Checking if app is accessible at ${APP_URL}...`);
    const isServerRunning = await checkDevServer(APP_URL);
    if (!isServerRunning) {
      const errorMsg = `Application is not accessible at ${APP_URL}. Please verify:
1. The site is deployed and running
2. APP_URL is set correctly in Railway environment variables
3. The site is not blocking requests from Railway servers
4. SSL certificates are valid`;
      console.error(`❌ ${errorMsg}`);
      throw new Error(errorMsg);
    }
    console.log(`✅ App is accessible at ${APP_URL}`);

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

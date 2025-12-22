# Puppeteer Export Setup

This implements a server-side screenshot export using Puppeteer, which replicates your manual DevTools workflow.

## How It Works

1. **Client Button** → Sends request to export server
2. **Export Server** → Launches headless Chrome with Puppeteer
3. **Puppeteer** → Navigates to your page, sets viewport to 2000x2000 with DPR=2
4. **Screenshot** → Captures `#sales-analytics-export-container` exactly as rendered
5. **Download** → Sends PNG back to browser for download

## Setup Instructions

### 1. Start the Export Server

Open a **new terminal window** and run:

```bash
npm run export-server
```

You should see:
```
🚀 Export server running on http://localhost:3001
📡 Endpoint: POST http://localhost:3001/api/export-sales-report
```

### 2. Keep Your Dev Server Running

In another terminal, make sure your app is running:

```bash
npm run dev
```

### 3. Test the Export

1. Go to your Sales page: `http://localhost:5173/sales`
2. Click the green **"Export (Puppeteer)"** button
3. Wait a few seconds while Puppeteer captures the screenshot
4. The PNG will download automatically

## Buttons on Sales Page

You now have **TWO export buttons**:

1. **Export (Puppeteer)** (Green) - Uses Puppeteer server-side capture
2. **Export Report** (Blue) - Uses FireShot client-side capture

## Files Created

- `server/exportServer.mjs` - Express server that runs Puppeteer
- `components/ExportPuppeteerButton.tsx` - React button component
- `package.json` - Added `export-server` script

## Troubleshooting

**Error: "Failed to export report"**
- Make sure the export server is running (`npm run export-server`)
- Check that port 3001 is not in use

**Error: "Navigation timeout"**
- Increase timeout in `exportServer.mjs` (currently 30 seconds)
- Make sure your dev server is running on port 5173

**Screenshot is blank/incomplete**
- Increase the wait timeout after navigation (currently 2 seconds)
- Check browser console for loading errors

## Advantages of Puppeteer Approach

✅ True browser screenshot (not DOM reconstruction)
✅ Captures exact visual state with all backgrounds/layers
✅ No CORS issues with external fonts
✅ Replicates your DevTools workflow exactly
✅ Can be scheduled/automated

## Notes

- The export server runs on port **3001**
- Your dev app must be running on port **5173** (Vite default)
- Screenshots are generated server-side and sent to browser
- This approach works for production deployment with proper authentication

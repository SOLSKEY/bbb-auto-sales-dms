# Local Export Server Setup

## Quick Start

To run the export server locally on your Mac Mini:

### Option 1: Using the startup script (Recommended)
```bash
cd export-server
./start-local.sh
```

### Option 2: Using npm with environment variables
```bash
cd export-server
DEV_SERVER_URL=http://localhost:3000 PORT=3001 NODE_ENV=development npm start
```

### Option 3: Using a .env file
Create a `.env` file in the `export-server` directory (see Environment Variables below), then:
```bash
cd export-server
npm start
```

## Environment Variables

Create a `.env` file in the `export-server` directory with:

```env
# Local development server URL (where your app is running)
DEV_SERVER_URL=http://localhost:3000

# Export server port (default: 3001)
PORT=3001

# Login credentials for automated export
SHORTCUT_EMAIL=your-email@example.com
SHORTCUT_PASSWORD=your-password

# Optional: Set to 'development' for local use
NODE_ENV=development
```

## Usage

Once the server is running, you can use the "Export Local" buttons on:
- Sales page
- Collections page  
- Commission Reports page

These buttons connect to `http://localhost:3001` instead of the Railway server.

## Notes

- Make sure your main app is running on `http://localhost:3000` (or update `DEV_SERVER_URL` accordingly)
- The export server will automatically log in and generate PDFs using Puppeteer
- The "Export Local" buttons are separate from the Railway export buttons, so you can use either one


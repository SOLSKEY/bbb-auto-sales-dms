// Root entry point for Railway export server deployment
// This file runs the export server from the export-server directory

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to the export server directory
const exportServerDir = join(__dirname, 'export-server');
const exportServerPath = join(exportServerDir, 'exportServer.mjs');

console.log('🚀 Starting Export Server...');
console.log('📁 Working directory:', exportServerDir);
console.log('📄 Server file:', exportServerPath);

// Change to export-server directory and run the server
process.chdir(exportServerDir);

// Spawn the export server process
const server = spawn('node', ['exportServer.mjs'], {
  stdio: 'inherit',
  cwd: exportServerDir,
  env: process.env,
  shell: false
});

server.on('error', (error) => {
  console.error('❌ Failed to start export server:', error);
  process.exit(1);
});

server.on('exit', (code, signal) => {
  if (signal) {
    console.log(`Export server exited with signal ${signal}`);
  } else {
    console.log(`Export server exited with code ${code}`);
  }
  process.exit(code || 0);
});

// Handle termination signals
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down...');
  server.kill('SIGTERM');
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down...');
  server.kill('SIGINT');
});


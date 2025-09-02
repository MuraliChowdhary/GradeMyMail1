#!/usr/bin/env node

/**
 * Startup script that ensures GMM and FMM models are running
 * This script will automatically start the Ollama models before starting the server
 */

import { spawn } from 'child_process';
import { promisify } from 'util';
import { exec } from 'child_process';
import axios from 'axios';

const execAsync = promisify(exec);

class AppStartupManager {
  constructor() {
    this.serverProcess = null;
    this.isShuttingDown = false;
  }

  /**
   * Main startup sequence
   */
  async start() {
    console.log('🚀 Starting GradeMyMail with AI models...\n');

    try {
      // Step 1: Check prerequisites
      await this.checkPrerequisites();
      
      // Step 2: Start the server (which will auto-start models)
      await this.startServer();
      
      // Step 3: Wait for everything to be ready
      await this.waitForReadiness();
      
      console.log('\n✅ GradeMyMail is ready!');
      console.log('🌐 Frontend: http://localhost:5173');
      console.log('🔧 Backend: http://localhost:3001');
      console.log('🤖 GMM Model: http://localhost:11434');
      console.log('🤖 FMM Model: http://localhost:11435');
      console.log('\n📊 Model Status: http://localhost:3001/api/health/models');
      console.log('💡 Press Ctrl+C to stop all services\n');

    } catch (error) {
      console.error('❌ Startup failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * Check if all prerequisites are installed
   */
  async checkPrerequisites() {
    console.log('🔍 Checking prerequisites...');

    // Check Node.js
    try {
      const { stdout } = await execAsync('node --version');
      console.log(`✅ Node.js: ${stdout.trim()}`);
    } catch (error) {
      throw new Error('Node.js is not installed');
    }

    // Check npm
    try {
      const { stdout } = await execAsync('npm --version');
      console.log(`✅ npm: ${stdout.trim()}`);
    } catch (error) {
      throw new Error('npm is not installed');
    }

    // Check Ollama
    try {
      const { stdout } = await execAsync('ollama --version');
      console.log(`✅ Ollama: ${stdout.trim()}`);
    } catch (error) {
      console.log('❌ Ollama is not installed');
      console.log('📥 Please install Ollama from: https://ollama.ai/download');
      throw new Error('Ollama is required for AI functionality');
    }

    // Check if dependencies are installed
    try {
      await execAsync('npm list --depth=0');
      console.log('✅ Dependencies: Installed');
    } catch (error) {
      console.log('📦 Installing dependencies...');
      await execAsync('npm install');
      console.log('✅ Dependencies: Installed');
    }

    console.log('');
  }

  /**
   * Start the server
   */
  async startServer() {
    console.log('🚀 Starting server...');

    return new Promise((resolve, reject) => {
      this.serverProcess = spawn('npm', ['run', 'server'], {
        stdio: ['inherit', 'pipe', 'pipe'],
        shell: true,
      });

      let serverReady = false;

      this.serverProcess.stdout.on('data', (data) => {
        const output = data.toString();
        process.stdout.write(output);

        // Check if server is ready
        if (output.includes('Server running on port') && !serverReady) {
          serverReady = true;
          setTimeout(resolve, 2000); // Give it a moment to fully initialize
        }
      });

      this.serverProcess.stderr.on('data', (data) => {
        process.stderr.write(data);
      });

      this.serverProcess.on('error', (error) => {
        reject(new Error(`Failed to start server: ${error.message}`));
      });

      this.serverProcess.on('exit', (code) => {
        if (!this.isShuttingDown && code !== 0) {
          reject(new Error(`Server exited with code ${code}`));
        }
      });

      // Timeout after 60 seconds
      setTimeout(() => {
        if (!serverReady) {
          reject(new Error('Server startup timeout'));
        }
      }, 60000);
    });
  }

  /**
   * Wait for all services to be ready
   */
  async waitForReadiness() {
    console.log('⏳ Waiting for services to be ready...');

    const maxAttempts = 30;
    const interval = 2000;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        // Check server health
        const serverHealth = await axios.get('http://localhost:3001/api/health', {
          timeout: 5000,
        });

        // Check models status
        const modelsHealth = await axios.get('http://localhost:3001/api/health/models', {
          timeout: 10000,
        });

        if (serverHealth.status === 200 && modelsHealth.status === 200) {
          const modelsData = modelsHealth.data;
          console.log('✅ Server: Ready');
          console.log(`✅ GMM Model: ${modelsData.details.gmm.healthy ? 'Ready' : 'Not Ready'}`);
          console.log(`✅ FMM Model: ${modelsData.details.fmm.healthy ? 'Ready' : 'Not Ready'}`);
          return;
        }
      } catch (error) {
        // Continue waiting
      }

      console.log(`⏳ Waiting for services... (${attempt}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, interval));
    }

    throw new Error('Services failed to become ready within timeout');
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    if (this.isShuttingDown) return;
    
    this.isShuttingDown = true;
    console.log('\n🛑 Shutting down...');

    if (this.serverProcess) {
      this.serverProcess.kill('SIGTERM');
      
      // Force kill after 10 seconds
      setTimeout(() => {
        if (this.serverProcess && !this.serverProcess.killed) {
          this.serverProcess.kill('SIGKILL');
        }
      }, 10000);
    }

    console.log('✅ Shutdown complete');
    process.exit(0);
  }
}

// Create startup manager
const startupManager = new AppStartupManager();

// Handle graceful shutdown
process.on('SIGINT', () => startupManager.shutdown());
process.on('SIGTERM', () => startupManager.shutdown());

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  startupManager.shutdown();
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  startupManager.shutdown();
});

// Start the application
startupManager.start().catch((error) => {
  console.error('💥 Startup failed:', error);
  process.exit(1);
});
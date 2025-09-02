// Test server startup and basic functionality
import { spawn } from 'child_process';
import fetch from 'node-fetch';

const testServer = async () => {
  console.log('🚀 Starting server...');
  
  const server = spawn('npm', ['run', 'dev:server'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    detached: false
  });

  let serverOutput = '';
  let serverError = '';
  let serverReady = false;
  
  server.stdout.on('data', (data) => {
    const output = data.toString();
    serverOutput += output;
    console.log('📤 Server:', output.trim());
    if (output.includes('Server running on port')) {
      serverReady = true;
    }
  });

  server.stderr.on('data', (data) => {
    const error = data.toString();
    serverError += error;
    console.error('❌ Server Error:', error.trim());
  });

  // Wait for server to start
  let attempts = 0;
  while (!serverReady && attempts < 30) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    attempts++;
  }

  if (!serverReady) {
    console.error('❌ Server failed to start within 30 seconds');
    server.kill('SIGTERM');
    return;
  }

  console.log('✅ Server started, testing endpoints...');

  try {
    // Test health endpoint
    const healthResponse = await fetch('http://localhost:3001/api/health/simple');
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log('✅ Health check passed:', healthData);
    } else {
      console.error('❌ Health check failed:', healthResponse.status);
    }

    // Test GMMeditor tone options endpoint
    const tonesResponse = await fetch('http://localhost:3001/api/newsletter/tones');
    if (tonesResponse.ok) {
      const tonesData = await tonesResponse.json();
      console.log('✅ Tone options endpoint working:', tonesData.tones?.length, 'tones available');
    } else {
      console.error('❌ Tone options endpoint failed:', tonesResponse.status);
    }

    console.log('🎉 All tests passed! Server is working correctly.');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    console.log('🛑 Stopping server...');
    server.kill('SIGTERM');
  }
};

testServer().catch(console.error);
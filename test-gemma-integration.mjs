/**
 * Simple test to verify Gemma API integration
 */

import { gemmaAPIService } from './server/ai-engines/gemma-api.js';

const testContent = `
Subject: Newsletter Update

Hello everyone,

I wanted to share some exciting news about our latest product updates. 

We've been working hard to improve the user experience and add new features that our customers have been requesting.

Here are the key improvements:
- Better performance
- New dashboard design  
- Enhanced security features

Thank you for your continued support!

Best regards,
The Team
`;

async function testGemmaIntegration() {
  console.log('🧪 Testing Gemma API Integration...\n');

  try {
    // Test health status
    console.log('1. Testing health status...');
    const health = await gemmaAPIService.getHealthStatus();
    console.log('Health Status:', health);
    console.log('');

    if (health.apiKeyConfigured) {
      console.log('2. Testing newsletter scoring...');
      console.log('Test Content Preview:', testContent.substring(0, 100) + '...');
      console.log('');

      const analysis = await gemmaAPIService.analyzeNewsletter(testContent);
      
      console.log('📊 Scoring Results:');
      console.log('==================');
      console.log(`Overall Grade: ${analysis.overallGrade}`);
      console.log(`Audience Fit: ${analysis.audienceFit}%`);
      console.log(`Tone: ${analysis.tone}%`);
      console.log(`Clarity: ${analysis.clarity}%`);
      console.log(`Engagement: ${analysis.engagement}%`);
      console.log(`Spam Risk: ${analysis.spamRisk}%`);
      console.log('');
      
      console.log('📝 Summary:');
      analysis.summary.forEach((item, index) => {
        console.log(`${index + 1}. ${item}`);
      });
      console.log('');
      
      console.log('🔧 Improvements:');
      analysis.improvements.forEach((item, index) => {
        console.log(`${index + 1}. ${item}`);
      });
      console.log('');
      
      console.log('✅ Integration test passed!');
    } else {
      console.log('⚠️  GROQ_API_KEY not configured - skipping full integration test');
      console.log('✅ Basic integration test passed - service is ready for API key configuration');
    }
  } catch (error) {
    console.error('❌ Integration test failed:', error);
    
    if (error instanceof Error) {
      console.error('Error details:', error.message);
    }
  }
}

// Run the test
testGemmaIntegration().catch(console.error);
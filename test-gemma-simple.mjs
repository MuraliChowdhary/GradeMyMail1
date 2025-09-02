import { gemmaAPIService } from './server/ai-engines/gemma-api.ts';

async function testGemmaAPI() {
  console.log('🧪 Testing Gemma API Service...');
  
  try {
    // Test health status
    const health = await gemmaAPIService.getHealthStatus();
    console.log('🏥 Health Status:', health);
    
    if (health.status === 'healthy') {
      // Test analysis
      const testContent = `
        Subject: Weekly Newsletter - Important Updates
        
        Hi everyone,
        
        This week we have some exciting updates to share with you. Our team has been working hard to bring you the best content possible.
        
        Don't miss out on this amazing opportunity! Click here now to learn more!!!
        
        Best regards,
        The Team
      `;
      
      console.log('📝 Testing newsletter analysis...');
      const result = await gemmaAPIService.analyzeNewsletter(testContent);
      console.log('✅ Analysis Result:', JSON.stringify(result, null, 2));
    } else {
      console.log('⚠️ Gemma API is not healthy, skipping analysis test');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testGemmaAPI();
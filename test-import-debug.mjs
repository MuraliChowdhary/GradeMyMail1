// Test the content-tagger import directly
console.log('🔍 Testing content-tagger import...');

try {
  const contentTaggerModule = await import('./server/ai-engines/content-tagger.js');
  console.log('✅ Import successful');
  console.log('📋 Available exports:', Object.keys(contentTaggerModule));
  console.log('🔧 analyzeContent type:', typeof contentTaggerModule.analyzeContent);
  console.log('🔧 DEFAULT_OPTIONS type:', typeof contentTaggerModule.DEFAULT_OPTIONS);
  
  if (contentTaggerModule.analyzeContent) {
    console.log('✅ analyzeContent function is available');
    
    // Test the function
    const testResult = contentTaggerModule.analyzeContent('This is a test sentence with amazing content!', contentTaggerModule.DEFAULT_OPTIONS);
    console.log('✅ Function call successful');
    console.log('📄 Result keys:', Object.keys(testResult));
    console.log('🎨 Annotated preview:', testResult.annotated.substring(0, 100) + '...');
  } else {
    console.log('❌ analyzeContent function is NOT available');
  }
} catch (error) {
  console.error('❌ Import failed:', error.message);
  console.error('Stack:', error.stack);
}
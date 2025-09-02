// Test the content-tagger import and function
console.log('🔍 Testing content-tagger import...');

try {
  const { analyzeContent, DEFAULT_OPTIONS } = await import('./server/ai-engines/content-tagger.js');
  
  console.log('✅ Import successful');
  console.log('🔧 analyzeContent type:', typeof analyzeContent);
  console.log('🔧 DEFAULT_OPTIONS type:', typeof DEFAULT_OPTIONS);
  
  if (analyzeContent && DEFAULT_OPTIONS) {
    console.log('✅ Both functions available, testing...');
    
    const testContent = "This is an amazing test with incredible content!";
    const result = analyzeContent(testContent, DEFAULT_OPTIONS);
    
    console.log('✅ Function call successful');
    console.log('📄 Result keys:', Object.keys(result));
    console.log('🎨 Annotated preview:', result.annotated.substring(0, 100) + '...');
  } else {
    console.log('❌ Functions not available');
  }
} catch (error) {
  console.error('❌ Test failed:', error.message);
  console.error('Stack:', error.stack);
}
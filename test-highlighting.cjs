// Test the rule-based highlighting system directly
const fs = require('fs');
const path = require('path');

// Since we can't import ES modules in CommonJS easily, let's read and eval the file
// This is just for testing purposes
async function testHighlighting() {
  console.log('🧪 Testing Rule-based Highlighting System...');
  
  try {
    // Import using dynamic import
    const contentTaggerModule = await import('./server/ai-engines/content-tagger.js');
    
    const testContent = `
      Subject: URGENT: Don't Miss This Amazing Deal!!!
      
      This is literally the best opportunity you'll ever see! Our revolutionary product will change your life forever. 
      
      Click here immediately to claim your discount before it's too late!
    `;

    console.log('📝 Test Content Length:', testContent.length, 'characters');
    
    const result = contentTaggerModule.analyzeContent(testContent, contentTaggerModule.DEFAULT_OPTIONS);
    
    console.log('✅ Rule-based Analysis Result:');
    console.log('  - Document Issues:', result.report.global.documentIssues?.length || 0);
    console.log('  - Sentence Issues:', result.report.perSentence?.length || 0);
    
    // Show some example issues
    if (result.report.perSentence?.length > 0) {
      console.log('  - Example Sentence Analysis:');
      result.report.perSentence.slice(0, 3).forEach((sentence, i) => {
        if (sentence.tags && sentence.tags.length > 0) {
          console.log(`    ${i + 1}. "${sentence.sentence.substring(0, 50)}..." - Tags: ${sentence.tags.join(', ')}`);
        }
      });
    }
    
    console.log('✅ Rule-based highlighting system is working!');
    
  } catch (error) {
    console.error('❌ Rule-based system failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testHighlighting();
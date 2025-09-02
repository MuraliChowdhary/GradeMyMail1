import * as contentTaggerModule from './server/ai-engines/content-tagger.js';

console.log('🔍 Debugging content-tagger imports...');
console.log('Available exports:', Object.keys(contentTaggerModule));
console.log('DEFAULT_OPTIONS exists:', !!contentTaggerModule.DEFAULT_OPTIONS);
console.log('analyzeContent exists:', !!contentTaggerModule.analyzeContent);
console.log('analyzeContent type:', typeof contentTaggerModule.analyzeContent);

if (contentTaggerModule.analyzeContent) {
  console.log('✅ analyzeContent function is available');
} else {
  console.log('❌ analyzeContent function is NOT available');
}
import { contentTagger } from './server/ai-engines/content-tagger.ts';

// Test content with HTML tags (similar to what rich text editor produces)
const htmlContent = `
<p>Superman is a 2025 American <a href="https://en.wikipedia.org/wiki/Superhero_film" title="Superhero film" class="editor-link">superhero film</a> based on <a href="https://en.wikipedia.org/wiki/Superman" title="Superman" class="editor-link">Superman</a>.</p>

<p>Written and directed by <a href="https://en.wikipedia.org/wiki/James_Gunn" title="James Gunn" class="editor-link">James Gunn</a>, it is the first film in the <a href="https://en.wikipedia.org/wiki/DC_Universe_(franchise)" title="DC Universe (franchise)" class="editor-link">DC Universe</a> franchise.</p>

<p>This is an amazing opportunity with incredible results!</p>
`;

console.log('🧪 Testing HTML cleaning and analysis...');
console.log('📝 Original HTML content:');
console.log(htmlContent.substring(0, 200) + '...');
console.log('');

const result = contentTagger.analyzeNewsletter(htmlContent);

console.log('📊 Analysis Results:');
console.log('===================');
console.log('Sentences processed:', result.report.perSentence.length);
console.log('');

console.log('📈 Sentences with tags:');
result.report.perSentence.forEach((sentence, i) => {
  if (sentence.tags.length > 0) {
    console.log(`${i + 1}. "${sentence.sentence.substring(0, 80)}..."`);
    console.log(`   Tags: ${sentence.tags.join(', ')}`);
  }
});

console.log('');
console.log('🔗 Link Analysis:');
console.log('Link count:', result.report.global.linkCount);
console.log('Word count:', result.report.global.wordCount);
console.log('Link density per 100 words:', result.report.global.linkDensityPer100Words);

console.log('');
console.log('🎯 Annotated content (first 300 chars):');
console.log(result.annotated.substring(0, 300) + '...');

const summary = contentTagger.getAnalysisSummary(result);
console.log('');
console.log('📋 Summary:');
console.log('Overall score:', summary.score);
console.log('Grade:', summary.grade);
console.log('Issue types found:', summary.issueTypes);
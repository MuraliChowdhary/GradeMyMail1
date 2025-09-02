import { contentTagger } from './server/ai-engines/content-tagger.ts';

// Test content designed to trigger multiple highlight types
const testContent = `
🎉🎉🎉 AMAZING DEAL!!! Don't miss out on this incredible opportunity! 🎉🎉🎉

This might be the best solution you'll ever see. We guarantee results that will transform your business completely. Our revolutionary platform leverages cutting-edge technology to optimize your workflow.

Click here now to get started! Limited time offer - act fast before it's too late!

We recently launched new features. The system increased performance by 50. Our team will contact you soon to discuss next steps.

I think this could potentially help your organization. It seems like a good fit for your needs.
`;

console.log('🧪 Testing all highlight types...');
console.log('📝 Content length:', testContent.length, 'characters');
console.log('');

const result = contentTagger.analyzeNewsletter(testContent);

console.log('📊 Issues found by type:');
const issuesByType = {};
result.report.perSentence.forEach((sentence, i) => {
  sentence.tags.forEach(tag => {
    if (!issuesByType[tag]) issuesByType[tag] = 0;
    issuesByType[tag]++;
  });
});

Object.entries(issuesByType).forEach(([type, count]) => {
  console.log(`  ${type}: ${count} instances`);
});

console.log('');
console.log('📋 Summary:');
const summary = contentTagger.getAnalysisSummary(result);
console.log('Overall score:', summary.score);
console.log('Grade:', summary.grade);
console.log('Issue counts by priority:', summary.issueCounts);
console.log('Issue types found:', summary.issueTypes);

console.log('');
console.log('🎯 Annotated content preview:');
console.log(result.annotated.substring(0, 800) + '...');

console.log('');
console.log('📝 Detailed sentence analysis:');
result.report.perSentence.forEach((sentence, i) => {
  if (sentence.tags.length > 0) {
    console.log(`${i + 1}. "${sentence.sentence.substring(0, 60)}..."`);
    console.log(`   Tags: ${sentence.tags.join(', ')}`);
  }
});
import { contentTagger } from './server/ai-engines/content-tagger.ts';

const testContent = `OpenAI Unlocks Image API for Business

OpenAI has launched its image generation model, gpt-image-1, to the API, allowing developers to integrate text-to-image creation, editing, and style rendering into their tools. Early adopters include Adobe, Figma, Airtable, and Quora. Pricing starts at $0.02 per image with built-in safety features. The launch allows companies to automate and scale visual content directly within their products.

→ More details about OpenAI's Image API

AI Agents Now Learn From Experience

Two AI researchers, David Silver and Richard Sutton, describe the start of the Era of Experience in AI, marked by Google DeepMind's AlphaProof, which earned a medal at the International Mathematical Olympiad using reinforcement learning. Unlike models trained on static data, these agents learn through ongoing interaction with their environment, guided by rewards like profit or exam scores. This shift gives AI the ability to pursue long-term goals independently.

→ More about AI agents that learn from experience

Nvidia Offers AI Agents for Workflows

Nvidia has launched NeMo microservices, tools for enterprises to build and customize AI agents for tasks like customer service and software development. Early adopters like Amdocs report productivity gains, including a 50% increase in first-call resolution. Nvidia describes these agents as "digital employees" meant to support knowledge workers and automate business workflows at scale. It will enable businesses to automate specific workflows and scale AI deployment within enterprise operations.

→ More about Nvidia's NeMo microservices`;

console.log('🧪 Testing improved rule-based system...');
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

const summary = contentTagger.getAnalysisSummary(result);
console.log('');
console.log('📋 Summary:');
console.log('Overall score:', summary.score);
console.log('Grade:', summary.grade);
console.log('Issue counts by priority:', summary.issueCounts);
console.log('Issue types found:', summary.issueTypes);

console.log('');
console.log('🎯 Annotated content preview:');
console.log(result.annotated.substring(0, 500) + '...');
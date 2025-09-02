import { contentTagger } from './server/ai-engines/content-tagger.ts';

const testContent = `Early adopters include Adobe, Figma, Airtable, and Quora. Pricing starts at $0.02 per image with built-in safety features.`;

console.log('🧪 Testing grammar checker specifically...');
console.log('📝 Test sentence:', testContent);
console.log('');

const result = contentTagger.analyzeNewsletter(testContent);

console.log('📊 Analysis Results:');
result.report.perSentence.forEach((sentence, i) => {
  if (sentence.tags.includes('grammar_spelling')) {
    console.log(`Sentence ${i + 1}: "${sentence.sentence}"`);
    console.log('Grammar reasons:', sentence.reasons.grammar_spelling);
    console.log('Misspelled words:', sentence.reasons.grammar_spelling?.misspelled || []);
    console.log('');
  }
});
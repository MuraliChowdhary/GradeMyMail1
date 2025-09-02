import { contentTagger } from './server/ai-engines/content-tagger.ts';
import { gemmaAPIService } from './server/ai-engines/gemma-api.ts';

async function testDualSystem() {
  console.log('🧪 Testing Dual System: Rule-based Highlighting + Gemma AI Scoring...\n');
  
  const testContent = `
    Subject: URGENT: Don't Miss This Amazing Deal!!!
    
    Hi there,
    
    This is literally the best opportunity you'll ever see! Our revolutionary product will change your life forever. 
    
    🎉 LIMITED TIME OFFER 🎉
    - Save 90% NOW!!!
    - Only 24 hours left!!!
    - Don't wait, act fast!!!
    
    Click here immediately to claim your discount before it's too late! This deal won't last long and you'll regret missing out on this incredible chance.
    
    Best regards,
    The Sales Team
    
    P.S. Hurry up! Only a few spots left!
  `;

  console.log('📝 Test Content Length:', testContent.length, 'characters\n');

  try {
    console.log('🎯 Testing Rule-based Highlighting System...');
    const highlightingResult = contentTagger.analyzeNewsletter(testContent);
    console.log('✅ Rule-based Analysis Result:');
    console.log('  - Document Issues:', highlightingResult.documentIssues?.length || 0);
    console.log('  - Sentence Issues:', highlightingResult.sentenceIssues?.length || 0);
    console.log('  - Total Issues Found:', (highlightingResult.documentIssues?.length || 0) + (highlightingResult.sentenceIssues?.length || 0));
    
    // Show some example issues
    if (highlightingResult.sentenceIssues?.length > 0) {
      console.log('  - Example Issues:');
      highlightingResult.sentenceIssues.slice(0, 3).forEach((issue, i) => {
        console.log(`    ${i + 1}. ${issue.type}: "${issue.text.substring(0, 50)}..."`);
      });
    }
    console.log('');

  } catch (error) {
    console.error('❌ Rule-based system failed:', error.message);
  }

  try {
    console.log('🤖 Testing Gemma AI Scoring System...');
    const scoringResult = await gemmaAPIService.analyzeNewsletter(testContent);
    console.log('✅ Gemma AI Analysis Result:');
    console.log('  - Overall Grade:', scoringResult.overallGrade);
    console.log('  - Audience Fit:', scoringResult.audienceFit + '%');
    console.log('  - Tone:', scoringResult.tone + '%');
    console.log('  - Clarity:', scoringResult.clarity + '%');
    console.log('  - Engagement:', scoringResult.engagement + '%');
    console.log('  - Spam Risk:', scoringResult.spamRisk + '%');
    console.log('  - Summary Points:', scoringResult.summary.length);
    console.log('  - Improvement Suggestions:', scoringResult.improvements.length);
    
    if (scoringResult.improvements.length > 0) {
      console.log('  - Top Improvements:');
      scoringResult.improvements.slice(0, 2).forEach((improvement, i) => {
        console.log(`    ${i + 1}. ${improvement}`);
      });
    }
    console.log('');

  } catch (error) {
    console.error('❌ Gemma AI system failed:', error.message);
  }

  console.log('🎉 Dual System Test Complete!');
  console.log('📊 Both systems provide complementary analysis:');
  console.log('   • Rule-based: Fast, precise highlighting of specific issues');
  console.log('   • Gemma AI: Comprehensive scoring and strategic improvements');
}

testDualSystem();
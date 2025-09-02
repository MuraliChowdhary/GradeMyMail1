const express = require('express');
const cors = require('cors');
const { analyzeContent, DEFAULT_OPTIONS } = require('./ai-engines/content-tagger.js');

const app = express();
const PORT = 3001;

// Enable CORS for frontend
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));

// Parse JSON bodies
app.use(express.json({ limit: '10mb' }));

// Request timing middleware
app.use((req, res, next) => {
  req.startTime = Date.now();
  next();
});

// Helper function to extract highlight ranges from analysis result
const extractHighlightRanges = (content, analysisResult) => {
  const ranges = [];
  
  for (const sentenceData of analysisResult.report.perSentence) {
    if (sentenceData.tags.length === 0) continue;

    const sentence = sentenceData.sentence.trim();
    if (!sentence) continue;

    // Find sentence position in content
    const sentenceStart = content.indexOf(sentence);
    if (sentenceStart === -1) continue;

    const sentenceEnd = sentenceStart + sentence.length;

    // Create ranges for each tag type
    for (const tag of sentenceData.tags) {
      if (isValidHighlightType(tag)) {
        ranges.push({
          start: sentenceStart,
          end: sentenceEnd,
          type: tag,
          priority: getHighlightPriority(tag),
          message: getHighlightMessage(tag),
          suggestion: getHighlightSuggestion(tag),
        });
      }
    }
  }

  return ranges;
};

// Helper function to generate analysis summary
const generateSummary = (ranges, analysisResult) => {
  const issueCounts = {
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
  };

  const issueTypes = new Set();

  for (const range of ranges) {
    issueCounts[range.priority]++;
    issueTypes.add(range.type);
  }

  // Calculate score based on issues
  const totalIssues = issueCounts.high + issueCounts.medium + issueCounts.low;
  const wordCount = analysisResult.report.global.wordCount;
  const score = calculateScore(totalIssues, wordCount);

  return {
    score,
    grade: scoreToGrade(score),
    issueCounts,
    issueTypes: Array.from(issueTypes),
    metrics: {
      wordCount: analysisResult.report.global.wordCount,
      sentenceCount: analysisResult.report.global.sentenceCount,
      readabilityGrade: analysisResult.report.global.readability.fleschKincaidGrade,
      linkDensity: analysisResult.report.global.linkDensityPer100Words,
    },
  };
};

// Helper functions
const isValidHighlightType = (tag) => {
  return [
    'spam_words',
    'grammar_spelling', 
    'hard_to_read',
    'fluff',
    'emoji_excess',
    'cta',
    'hedging',
    'vague_date',
    'vague_number',
    'claim_without_evidence'
  ].includes(tag);
};

const getHighlightPriority = (type) => {
  const priorities = {
    spam_words: 'high',
    grammar_spelling: 'high',
    claim_without_evidence: 'high',
    hard_to_read: 'medium',
    fluff: 'medium',
    hedging: 'medium',
    vague_date: 'medium',
    vague_number: 'medium',
    emoji_excess: 'low',
    cta: 'info',
  };
  
  return priorities[type] || 'medium';
};

const getHighlightMessage = (type) => {
  const messages = {
    spam_words: 'Contains spam-like language that may trigger email filters',
    grammar_spelling: 'Grammar or spelling issue detected',
    hard_to_read: 'This sentence is complex and may be hard to read',
    fluff: 'Contains unnecessary filler words or phrases',
    emoji_excess: 'Too many emojis may appear unprofessional',
    cta: 'Call-to-action detected',
    hedging: 'Uncertain language weakens your message',
    vague_date: 'Vague time reference may confuse readers',
    vague_number: 'Number lacks context or units',
    claim_without_evidence: 'Strong claim without supporting evidence',
  };
  
  return messages[type] || 'Issue detected';
};

const getHighlightSuggestion = (type) => {
  const suggestions = {
    spam_words: 'Use more natural, conversational language',
    grammar_spelling: 'Review and correct the grammar or spelling',
    hard_to_read: 'Break into shorter sentences or simplify the language',
    fluff: 'Remove filler words to make the message more direct',
    emoji_excess: 'Use emojis sparingly for better impact',
    cta: 'Ensure your CTA is clear and compelling',
    hedging: 'Use more confident, direct language',
    vague_date: 'Use specific dates or timeframes',
    vague_number: 'Add units, percentages, or context to numbers',
    claim_without_evidence: 'Add data, sources, or examples to support your claim',
  };
  
  return suggestions[type] || 'Consider revising this content';
};

const calculateScore = (totalIssues, wordCount) => {
  const issuesPerHundred = (totalIssues / Math.max(wordCount, 1)) * 100;
  
  if (issuesPerHundred <= 2) return Math.max(90, 100 - issuesPerHundred * 5);
  if (issuesPerHundred <= 4) return Math.max(80, 90 - (issuesPerHundred - 2) * 5);
  if (issuesPerHundred <= 6) return Math.max(70, 80 - (issuesPerHundred - 4) * 5);
  if (issuesPerHundred <= 8) return Math.max(60, 70 - (issuesPerHundred - 6) * 5);
  return Math.max(0, 60 - (issuesPerHundred - 8) * 2);
};

const scoreToGrade = (score) => {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
};

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    message: 'GroqGemma server is running',
    system: 'rule-based-analysis'
  });
});

// New analyze endpoint with GroqGemma rule-based system
app.post('/api/analyze', async (req, res) => {
  try {
    const { content, message } = req.body;
    const textContent = content || message;
    
    if (!textContent) {
      return res.status(400).json({ error: 'Content is required' });
    }
    
    if (textContent.length > 50000) {
      return res.status(400).json({ error: 'Content too large. Maximum 50,000 characters allowed.' });
    }
    
    console.log(`📧 Analyzing newsletter content (${textContent.length} characters) - using GroqGemma rule-based system`);
    
    // Use the GroqGemma content tagger
    const analysisResult = analyzeContent(textContent, DEFAULT_OPTIONS);
    const ranges = extractHighlightRanges(textContent, analysisResult);
    const summary = generateSummary(ranges, analysisResult);
    
    const processingTime = Date.now() - req.startTime;
    
    res.json({
      analysisResult,
      summary,
      ranges,
      metadata: {
        model: 'groq-gemma-rule-based',
        timestamp: new Date().toISOString(),
        processingTime
      }
    });
    
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ 
      error: 'Analysis failed',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Legacy analyze endpoint for backward compatibility
app.post('/api/newsletter/analyze', async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    console.log(`📧 Analyzing newsletter content (${message.length} characters) - using GroqGemma rule-based system`);
    
    const analysisResult = analyzeContent(message, DEFAULT_OPTIONS);
    
    res.json({
      message: {
        content: analysisResult.annotated
      },
      metadata: {
        model: 'groq-gemma-rule-based',
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - req.startTime,
        note: 'Using GroqGemma rule-based content analysis'
      }
    });
    
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ 
      error: 'Analysis failed',
      details: error.message 
    });
  }
});

// Mock fix endpoint (will be enhanced later)
app.post('/api/fix', (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    console.log(`🔧 Fixing tagged content (${message.length} characters) - using mock improvements`);
    
    // Simple mock improvements
    const improvements = [
      { original: 'amazing', improved: 'excellent' },
      { original: 'incredible', improved: 'remarkable' },
      { original: 'fantastic', improved: 'outstanding' },
      { original: 'free', improved: 'complimentary' },
      { original: 'urgent', improved: 'time-sensitive' }
    ];

    let result = '';
    for (const improvement of improvements) {
      if (message.toLowerCase().includes(improvement.original.toLowerCase())) {
        result += `<old_draft>${improvement.original}</old_draft><optimized_draft>${improvement.improved}</optimized_draft>\n`;
      }
    }

    res.json({
      message: {
        content: result || '<old_draft>No improvements needed</old_draft><optimized_draft>Content is already well-written</optimized_draft>'
      }
    });
    
  } catch (error) {
    console.error('Fix error:', error);
    res.status(500).json({ error: 'Fix failed' });
  }
});

// Store endpoint
app.post('/api/store', (req, res) => {
  try {
    const { payload } = req.body;
    const id = require('crypto').randomUUID();
    
    console.log(`💾 Stored data with ID: ${id}`);
    res.json({ id });
  } catch (error) {
    console.error('Store error:', error);
    res.status(500).json({ error: 'Store failed' });
  }
});

// Load endpoint
app.get('/api/load', (req, res) => {
  try {
    const { id } = req.query;
    
    if (!id) {
      return res.status(400).json({ error: 'ID is required' });
    }
    
    // Mock response
    res.json({
      payload: {
        fullOriginalText: 'Sample text',
        fullOriginalHTML: '<p>Sample text</p>',
        taggedContent: 'Sample text'
      }
    });
  } catch (error) {
    console.error('Load error:', error);
    res.status(500).json({ error: 'Load failed' });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: error.message,
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 GroqGemma server running on port ${PORT}`);
  console.log(`📊 Environment: development`);
  console.log(`🔗 Frontend should connect to: http://localhost:${PORT}`);
  console.log(`✅ Ready to analyze newsletters with rule-based system!`);
  console.log(`🤖 Using GroqGemma rule-based content analysis`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully...');
  process.exit(0);
});
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3001;

// Enable CORS for frontend
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));

// Parse JSON bodies
app.use(express.json());

// Mock analysis function for development
// Note: In development, we use a simple mock instead of the full GroqGemma system
console.log('🔧 Using development mock AI (GroqGemma system available in full server)');

const mockAnalyzeEmail = async (content) => {
  try {
    if (!content || typeof content !== 'string') {
      return content || '';
    }
    
    // Simple mock analysis for development
    // In production, this would use the full GroqGemma dual-system
    let result = content;
    
    // Add some basic highlighting for common spam words
    const spamWords = ['amazing', 'incredible', 'urgent', 'act now', 'limited time', 'free', 'guarantee'];
    spamWords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      result = result.replace(regex, `<span class="highlight-spam">${word}</span>`);
    });
    
    return result;
  } catch (error) {
    console.error('Mock analysis error:', error);
    return content;
  }
};

// Mock fix function
const mockFixEmail = (taggedContent) => {
  const improvements = [
    { original: 'amazing', improved: 'excellent' },
    { original: 'incredible', improved: 'remarkable' },
    { original: 'fantastic', improved: 'outstanding' },
    { original: 'great', improved: 'effective' },
    { original: 'awesome', improved: 'impressive' },
    { original: 'free', improved: 'complimentary' },
    { original: 'urgent', improved: 'time-sensitive' },
    { original: 'act now', improved: 'take action' },
    { original: 'buy now', improved: 'purchase today' }
  ];

  let result = '';
  for (const improvement of improvements) {
    if (taggedContent.toLowerCase().includes(improvement.original.toLowerCase())) {
      result += `<old_draft>${improvement.original}</old_draft><optimized_draft>${improvement.improved}</optimized_draft>\n`;
    }
  }

  return result || '<old_draft>No improvements needed</old_draft><optimized_draft>Content is already well-written</optimized_draft>';
};

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    message: 'Quick server is running'
  });
});

// AI Models health check endpoint (for hybrid AI integration)
app.get('/api/health/models', (req, res) => {
  console.log('📊 Models health check requested');
  
  const healthResponse = {
    status: 'healthy',
    models: {
      'Newsletter-AI': true,
      'GMM': true,
      'FMM': true,
    },
    hybrid: {
      currentPrimary: 'mock-ai',
      usingFallback: false,
      llama: {
        isHealthy: false, // Mock server doesn't have real Llama
        responseTime: 0,
        consecutiveFailures: 0,
      },
      openai: {
        isHealthy: true, // Mock server simulates OpenAI
        responseTime: 150,
        consecutiveFailures: 0,
      },
    },
    timestamp: new Date().toISOString(),
    details: {
      'newsletter-ai': {
        name: 'Mock Newsletter AI (Development)',
        port: 3001,
        healthy: true,
      },
      gmm: {
        name: 'GradeMyMail Model (Mock)',
        port: 3001,
        healthy: true,
      },
      fmm: {
        name: 'FixMyMail Model (Mock)', 
        port: 3001,
        healthy: true,
      },
    },
  };
  
  console.log('✅ Returning healthy status for all models');
  res.json(healthResponse);
});

// New GroqGemma dual-system endpoints for development

// Rule-based highlighting endpoint (matches /api/analyze from main server)
app.post('/api/analyze', (req, res) => {
  try {
    const { content } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }
    
    console.log(`🎯 Mock rule-based highlighting (${content.length} characters)`);
    
    setTimeout(async () => {
      // Mock rule-based analysis result matching GroqGemma format
      let annotatedContent = content;
      
      // SENTENCE-LEVEL HIGHLIGHTING (like the real GroqGemma system)
      // Split content into sentences and analyze each one
      const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
      
      sentences.forEach(sentence => {
        const trimmedSentence = sentence.trim();
        if (!trimmedSentence) return;
        
        // Check for spam indicators in the sentence
        const spamIndicators = ['unlock', 'launch', 'scale', 'automate', 'revolutionar', 'game-chang', 'breakthrough'];
        const hasSpamWords = spamIndicators.some(word => 
          trimmedSentence.toLowerCase().includes(word.toLowerCase())
        );
        
        // Check for fluff indicators
        const fluffIndicators = ['literally', 'absolutely', 'definitely', 'completely', 'really', 'very', 'quite', 'just'];
        const hasFluff = fluffIndicators.some(word => 
          new RegExp(`\\b${word}\\b`, 'i').test(trimmedSentence)
        );
        
        // Check for hard-to-read indicators (long sentences, complex words)
        const isHardToRead = trimmedSentence.split(' ').length > 25 || 
          /microservices|implementation|optimization|configuration/.test(trimmedSentence);
        
        // Apply sentence-level highlighting (prioritize by severity)
        if (hasSpamWords) {
          annotatedContent = annotatedContent.replace(
            trimmedSentence, 
            `<spam_words>${trimmedSentence}</spam_words>`
          );
        } else if (isHardToRead) {
          annotatedContent = annotatedContent.replace(
            trimmedSentence, 
            `<hard_to_read>${trimmedSentence}</hard_to_read>`
          );
        } else if (hasFluff) {
          annotatedContent = annotatedContent.replace(
            trimmedSentence, 
            `<fluff>${trimmedSentence}</fluff>`
          );
        }
      });
      
      const mockAnalysisResult = {
        annotated: annotatedContent,
        report: {
          perSentence: [
            {
              sentence: "This is amazing content!",
              tags: ["spam_words"]
            },
            {
              sentence: "It's literally the best thing ever.",
              tags: ["fluff", "spam_words"]
            }
          ],
          global: {
            documentIssues: [],
            totalSentences: 2,
            flaggedSentences: 2
          }
        }
      };
      
      const mockSummary = {
        totalIssues: 3,
        highPriority: 1,
        mediumPriority: 2,
        lowPriority: 0
      };
      
      const mockRanges = [
        {
          start: content.indexOf('amazing'),
          end: content.indexOf('amazing') + 7,
          type: 'spam_words',
          priority: 'high',
          message: 'Consider using more specific language instead of "amazing"',
          suggestion: 'Try "effective", "valuable", or "useful" instead'
        }
      ];
      
      const response = {
        analysisResult: mockAnalysisResult,
        summary: mockSummary,
        ranges: mockRanges,
        metadata: {
          model: 'groq-gemma-rule-based-mock',
          timestamp: new Date().toISOString(),
          processingTime: 500
        }
      };
      
      console.log('🔍 === MOCK HIGHLIGHTING RESPONSE ===');
      console.log('📄 Full Response:', JSON.stringify(response, null, 2));
      console.log('🎨 Annotated Content:', mockAnalysisResult.annotated.substring(0, 200) + '...');
      console.log('🔍 === END MOCK RESPONSE ===');
      
      res.json(response);
    }, 500);
    
  } catch (error) {
    console.error('Mock highlighting error:', error);
    res.status(500).json({ error: 'Analysis failed', details: error.message });
  }
});

// Gemma AI scoring endpoint (matches /api/newsletter/score from main server)
app.post('/api/newsletter/score', (req, res) => {
  try {
    const { content } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }
    
    console.log(`🤖 Mock Gemma AI scoring (${content.length} characters)`);
    
    setTimeout(() => {
      // Mock comprehensive scoring
      const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
      const readingTime = Math.ceil(wordCount / 200);
      
      res.json({
        metrics: {
          overallGrade: 'B',
          audienceFit: 75,
          tone: 80,
          clarity: 70,
          engagement: 65,
          spamRisk: 25,
          wordCount,
          readingTime,
          summary: [
            'Content has good structure and clear messaging',
            'Some areas could benefit from more specific examples'
          ],
          improvements: [
            'Add more specific examples to support your points',
            'Consider shortening some sentences for better readability',
            'Include a clearer call-to-action'
          ]
        },
        metadata: {
          model: 'groq-gemma-2-9b-it-mock',
          timestamp: new Date().toISOString(),
          processingTime: 1000
        }
      });
    }, 1000);
    
  } catch (error) {
    console.error('Mock scoring error:', error);
    res.status(500).json({ error: 'Scoring failed', details: error.message });
  }
});

// Newsletter-specific improve endpoint (for hybrid AI integration)
app.post('/api/newsletter/improve', (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    console.log(`🔧 Newsletter improvement with hybrid AI (${message.length} characters)`);
    
    // Simulate processing delay
    setTimeout(() => {
      const improvements = mockFixEmail(message);
      
      res.json({
        message: {
          content: improvements
        },
        metadata: {
          model: 'mock-ai',
          usingFallback: false,
          timestamp: new Date().toISOString(),
        }
      });
    }, 1500);
    
  } catch (error) {
    console.error('Newsletter improvement error:', error);
    res.status(500).json({ error: 'Newsletter improvement failed' });
  }
});

// Fix endpoint
app.post('/api/fix', (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    console.log(`🔧 Fixing tagged content (${message.length} characters)`);
    
    // Simulate processing delay
    setTimeout(() => {
      const improvements = mockFixEmail(message);
      
      res.json({
        message: {
          content: improvements
        }
      });
    }, 1500);
    
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
    
    // In a real app, you'd store this in a database
    // For now, just return the ID
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
    
    // Mock response - in real app, load from database
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

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Quick server running on port ${PORT}`);
  console.log(`📊 Environment: development`);
  console.log(`🔗 Frontend should connect to: http://localhost:${PORT}`);
  console.log(`✅ Ready to analyze emails!`);
});

// Keep the server alive and handle errors
server.on('error', (error) => {
  console.error('❌ Server error:', error);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down server gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});
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

// Mock analysis function
const mockAnalyzeEmail = (content) => {
  // Add some mock tags for demonstration
  let taggedContent = content;
  
  // Add some mock tags
  taggedContent = taggedContent.replace(/\b(amazing|incredible|fantastic|great|awesome)\b/gi, '<fluff>$1</fluff>');
  taggedContent = taggedContent.replace(/\b(free|urgent|act now|limited time|buy now)\b/gi, '<spam_words>$1</spam_words>');
  
  // Mark long sentences as hard to read
  const sentences = content.split(/[.!?]+/);
  sentences.forEach(sentence => {
    if (sentence.trim().split(' ').length > 20) {
      taggedContent = taggedContent.replace(sentence.trim(), `<hard_to_read>${sentence.trim()}</hard_to_read>`);
    }
  });
  
  return taggedContent;
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
    message: 'Simple server is running'
  });
});

// Analyze endpoint
app.post('/api/analyze', (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    console.log(`📧 Analyzing email content (${message.length} characters)`);
    
    // Simulate processing delay
    setTimeout(() => {
      const taggedContent = mockAnalyzeEmail(message);
      
      res.json({
        message: {
          content: taggedContent
        }
      });
    }, 1000);
    
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ error: 'Analysis failed' });
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
app.listen(PORT, () => {
  console.log(`🚀 Simple server running on port ${PORT}`);
  console.log(`📊 Environment: development`);
  console.log(`🔗 Frontend should connect to: http://localhost:${PORT}`);
  console.log(`✅ Ready to analyze emails!`);
});
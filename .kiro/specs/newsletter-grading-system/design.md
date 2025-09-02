# Design Document

## Overview

The Newsletter Grading System is a clean, Apple-inspired web application that transforms newsletter content evaluation through intelligent AI analysis. The system now includes a completely rebuilt Fix My Mail feature powered by GMMeditor's advanced AI capabilities, replacing the old mock-based system with sophisticated content rewriting using Llama 3.1 via Groq.

**Core Philosophy**: macOS-style minimalism with production-grade reliability through hybrid AI architecture and professional-grade content improvement.

**Key Components**:
1. **Clean Editor Interface** - Simplified version of existing RichTextEditor
2. **Hybrid AI Engine** - Local Llama 3.2 (primary) + OpenAI GPT-4o-mini (fallback) for Grade My Mail
3. **GMMeditor AI System** - Llama 3.1 via Groq for Fix My Mail content rewriting
4. **Subtle Highlighting System** - Enhanced version of existing HighlightOverlay
5. **Advanced Diff Viewer** - VirtualizedDiffViewer with GMMeditor mapDrafts integration
6. **Simple Metrics Display** - Clean scoring interface
7. **Tone Control System** - Professional tone selection for content rewriting

## Architecture

### System Architecture (Dual AI Approach)

```mermaid
graph TB
    subgraph "Frontend (Apple-inspired UI)"
        A[Grade My Mail Editor] --> B[Real-time Analysis Engine]
        B --> C[Subtle Highlighting System]
        B --> D[Simple Metrics Display]
        A --> E[Fix My Mail Interface]
        E --> F[Tone Selector]
        E --> G[GMMeditor Diff Viewer]
    end

    subgraph "Grade My Mail AI (Hybrid)"
        H[Smart Router] --> I[Local Llama 3.2]
        H --> J[OpenAI GPT-4o-mini]
        I --> K[Health Monitor]
        J --> L[Fallback Controller]
    end

    subgraph "Fix My Mail AI (GMMeditor)"
        M[Groq API Client] --> N[Llama 3.1 via Groq]
        N --> O[rewriteWithLlama31]
        O --> P[mapDrafts Processor]
        P --> Q[Diff Mappings]
    end

    subgraph "Infrastructure"
        R[Model Manager] --> I
        S[API Gateway] --> J
        T[Cache Layer] --> H
        U[Groq SDK] --> M
    end

    B --> H
    E --> M
    K --> L
    R --> S
    Q --> G
```

### Data Flow Architecture

#### Primary Flow (Local Llama 3.2)
```
User Input → Content Validation → Local Model Router → Llama 3.2 Analysis → 
Response Processing → UI Update → Subtle Highlighting
```

#### Fallback Flow (OpenAI GPT-4o-mini)
```
Local Model Failure → Fallback Trigger → OpenAI API → Response Normalization → 
UI Update → Fallback Indicator
```

#### Smart Routing Logic (Grade My Mail)
```javascript
async function analyzeNewsletter(content) {
  // Try local first (faster, private)
  if (localModelHealthy && !highLoad) {
    try {
      return await llamaAnalysis(content);
    } catch (error) {
      logFallback('local-model-error', error);
    }
  }
  
  // Fallback to OpenAI (reliable, consistent)
  return await openAIAnalysis(content);
}
```

#### GMMeditor Fix My Mail Flow
```javascript
async function improveWithGMMeditor(originalText, toneKey = 'friendly', options = {}) {
  // Use GMMeditor's rewriteWithLlama31 via Groq
  const { rewritten, mappings } = await rewriteWithLlama31({
    originalText,
    analysis: {}, // Can include Grade My Mail analysis data
    suggestions: [], // Can include Grade My Mail suggestions
    toneKey,
    options: {
      model: 'llama-3.1-8b-instant',
      temperature: 0.65,
      targetGradeLow: 6,
      targetGradeHigh: 9,
      ...options
    }
  });
  
  return { rewritten, mappings };
}
```

## Components and Interfaces

### Frontend Components (Leveraging Existing Code)

#### 1. Newsletter Editor (Enhanced RichTextEditor)
**Base Component**: `src/components/RichTextEditor/RichTextEditor.tsx`
**Enhancements**:
- Remove complex toolbar, keep only essential formatting
- Apply clean macOS styling
- Integrate with hybrid analysis engine
- Add keyboard shortcuts (Cmd+Enter for analysis)

```typescript
interface NewsletterEditorProps {
  content: string;
  onChange: (content: string, html: string) => void;
  onAnalyze?: () => void;
  placeholder?: string;
  className?: string;
}
```

#### 2. Subtle Highlighting System (Enhanced HighlightOverlay)
**Base Component**: `src/components/HighlightOverlay/HighlightOverlay.tsx`
**Enhancements**:
- Simplified color scheme (3 colors max)
- Smooth, non-intrusive animations
- Clean tooltip design
- Better performance optimization

```typescript
interface HighlightConfig {
  clarity: { color: '#FF6B6B', opacity: 0.3 };    // Red for clarity issues
  engagement: { color: '#FFD93D', opacity: 0.3 }; // Yellow for engagement
  tone: { color: '#6BCF7F', opacity: 0.3 };       // Green for tone issues
}
```

#### 3. Simple Metrics Display (New Component)
**Purpose**: Clean, minimal scoring interface
**Design**: Card-based layout with simple progress indicators

```typescript
interface NewsletterMetrics {
  overallGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  clarity: number;      // 0-100
  engagement: number;   // 0-100
  tone: number;         // 0-100
  wordCount: number;
  readingTime: number;
}
```

#### 4. Clean Comparison View (Enhanced VirtualizedDiffViewer)
**Base Component**: `src/components/VirtualizedDiff/VirtualizedDiffViewer.tsx`
**Enhancements**:
- Minimal side-by-side layout
- Clean typography
- Subtle change indicators
- Copy functionality

#### 5. GMMeditor Integration Components (New for Fix My Mail)

##### Tone Selector Component
**Purpose**: Allow users to select writing tone for AI rewriting
**Design**: Clean dropdown matching Grade My Mail styling

```typescript
interface ToneSelectorProps {
  selectedTone: string;
  onToneChange: (toneKey: string) => void;
  disabled?: boolean;
  className?: string;
}

// Uses GMMeditor TONES constant
const AVAILABLE_TONES = {
  professional: "Professional & formal",
  friendly: "Friendly & conversational", 
  persuasive: "Persuasive & motivational",
  analytical: "Analytical & insight-driven",
  storytelling: "Storytelling with light anecdotes"
};
```

##### GMMeditor Service Integration
**Purpose**: Interface with GMMeditor's rewriteWithLlama31 functionality
**Location**: `src/services/gmmeditor.ts` (new)

```typescript
interface GMMeditorService {
  rewriteContent(params: {
    originalText: string;
    toneKey: string;
    analysis?: any;
    suggestions?: string[];
    options?: any;
  }): Promise<{
    rewritten: string;
    mappings: DiffMapping[];
  }>;
  
  getToneOptions(): Array<{ key: string; label: string }>;
}
```

##### Enhanced Diff Viewer with mapDrafts
**Purpose**: Display GMMeditor improvements with word-level highlighting
**Enhancements**:
- Integration with mapDrafts function from GMMeditor
- Word-level diff highlighting using wordDiff data
- Support for unchanged, changed, inserted, deleted content types

```typescript
interface DiffMapping {
  type: 'unchanged' | 'changed' | 'inserted' | 'deleted';
  old: string;
  new: string;
  wordDiff: Array<{
    added?: boolean;
    removed?: boolean;
    value: string;
  }> | null;
}
```

### Backend Architecture (Hybrid AI System)

#### 1. Smart AI Router
**Purpose**: Intelligently route requests between local and cloud models
**Location**: `server/ai-router.ts` (new)

```typescript
interface AIRouterConfig {
  primaryModel: 'llama3.2';
  fallbackModel: 'gpt-4o-mini';
  healthCheckInterval: 30000;
  fallbackThreshold: 3; // failures before fallback
  loadBalancing: true;
}
```

#### 2. Local Model Manager (Enhanced)
**Base**: `server/model-startup.ts`
**Enhancements**:
- Llama 3.2 download and setup
- Custom newsletter analysis prompt
- Health monitoring
- Performance optimization

#### 3. OpenAI Integration (New)
**Purpose**: Reliable fallback for consistent quality
**Features**:
- GPT-4o-mini integration
- Response normalization
- Cost optimization
- Rate limiting

#### 4. Enhanced API Endpoints
**Base**: `server/index.ts`
**Updated Endpoints**:
```
POST /api/newsletter/analyze - Hybrid analysis (Grade My Mail)
POST /api/newsletter/improve - GMMeditor rewriting (Fix My Mail)
GET /api/models/status - Model health check
POST /api/models/switch - Manual model switching
```

#### 5. GMMeditor Backend Integration (New)
**Purpose**: Replace mock Fix My Mail system with real AI
**Location**: `server/gmmeditor-integration.ts` (new)

```typescript
interface GMMeditorBackend {
  // Main improvement endpoint
  async improveContent(req: {
    originalText: string;
    toneKey?: string;
    analysis?: any;
    suggestions?: string[];
    options?: any;
  }): Promise<{
    rewritten: string;
    mappings: DiffMapping[];
    metadata: {
      model: string;
      processingTime: number;
      toneUsed: string;
    };
  }>;
  
  // Health check for Groq API
  async checkGroqHealth(): Promise<boolean>;
}
```

#### 6. Remove Mock System (Cleanup)
**Purpose**: Completely remove old mock-based Fix My Mail
**Actions**:
- Remove `mockFixEmail` function from `server/index.ts`
- Remove old `/api/fix` endpoint
- Update error handling to never fallback to mock system
- Clean up any references to old improvement system

## Data Models

### Newsletter Content Model
```typescript
interface NewsletterContent {
  id: string;
  originalText: string;
  originalHTML: string;
  analyzedContent: string;     // Tagged content from AI
  metrics: NewsletterMetrics;
  improvements?: NewsletterImprovement[];
  metadata: {
    wordCount: number;
    readingTime: number;
    analysisModel: 'llama3.2' | 'gpt-4o-mini';
    analysisTime: number;
    timestamp: Date;
  };
}
```

### AI Analysis Response Model
```typescript
interface AnalysisResponse {
  taggedContent: string;       // XML-tagged problematic areas
  metrics: {
    clarity: number;
    engagement: number;
    tone: number;
    overallGrade: string;
  };
  issues: Array<{
    type: 'clarity' | 'engagement' | 'tone';
    text: string;
    suggestion: string;
    severity: 'low' | 'medium' | 'high';
    position: { start: number; end: number };
  }>;
  model: 'llama3.2' | 'gpt-4o-mini';
  processingTime: number;
}
```

### Improvement Model (Grade My Mail)
```typescript
interface NewsletterImprovement {
  original: string;
  improved: string;
  type: 'clarity' | 'engagement' | 'tone';
  reasoning: string;
  confidence: number;
  position: { start: number; end: number };
}
```

### GMMeditor Models (Fix My Mail)
```typescript
interface GMMeditorRequest {
  originalText: string;
  toneKey?: 'professional' | 'friendly' | 'persuasive' | 'analytical' | 'storytelling';
  analysis?: {
    readabilityGrade?: number;
    audienceFit?: number;
    toneScore?: number;
    clarity?: number;
    engagement?: number;
    spamRisk?: number;
  };
  suggestions?: string[];
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    targetGradeLow?: number;
    targetGradeHigh?: number;
  };
}

interface GMMeditorResponse {
  rewritten: string;
  mappings: DiffMapping[];
  metadata: {
    model: string;
    processingTime: number;
    toneUsed: string;
    originalLength: number;
    rewrittenLength: number;
  };
}

interface DiffMapping {
  type: 'unchanged' | 'changed' | 'inserted' | 'deleted';
  old: string;
  new: string;
  wordDiff: Array<{
    added?: boolean;
    removed?: boolean;
    value: string;
  }> | null;
}
```

## Apple-Inspired Design System

### Typography
```css
/* System fonts for native feel */
font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif;

/* Typography scale */
--text-xs: 11px;    /* Captions */
--text-sm: 13px;    /* Body small */
--text-base: 15px;  /* Body */
--text-lg: 17px;    /* Subheadings */
--text-xl: 22px;    /* Headings */
--text-2xl: 28px;   /* Page titles */
```

### Color Palette (Minimal)
```css
/* Light mode (primary) */
--color-background: #ffffff;
--color-surface: #f5f5f7;
--color-border: #d2d2d7;
--color-text-primary: #1d1d1f;
--color-text-secondary: #86868b;
--color-accent: #007aff;

/* Issue colors (subtle) */
--color-clarity: #ff6b6b;
--color-engagement: #ffd93d;
--color-tone: #6bcf7f;
```

### Spacing System
```css
/* 8px base unit for consistency */
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-6: 24px;
--space-8: 32px;
--space-12: 48px;
--space-16: 64px;
```

### Component Styling
```css
/* Clean button style */
.btn-primary {
  background: var(--color-accent);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 8px 16px;
  font-weight: 500;
  transition: all 0.2s ease;
}

/* Subtle card style */
.card {
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}
```

## GMMeditor Integration Architecture

### Fix My Mail Redesign
The new Fix My Mail completely replaces the mock-based system with GMMeditor's sophisticated AI capabilities:

#### Current State (Being Removed)
- Mock `fixEmail` function with hardcoded word replacements
- Simple text substitutions (e.g., "amazing" → "excellent")
- No real AI understanding or context awareness
- Limited to pre-tagged content from Grade My Mail

#### New GMMeditor-Powered System
- Real AI rewriting using Llama 3.1 via Groq
- Sophisticated understanding of content and context
- Tone control and style customization
- Works with any content, not just pre-tagged
- Professional-grade editing capabilities

### Integration Points

#### Frontend Integration
```typescript
// New Fix My Mail page structure
const FixMyMail: React.FC = () => {
  const [selectedTone, setSelectedTone] = useState('friendly');
  const [originalContent, setOriginalContent] = useState('');
  const [improvedContent, setImprovedContent] = useState('');
  const [diffMappings, setDiffMappings] = useState<DiffMapping[]>([]);
  
  const handleImprove = async () => {
    const result = await gmmEditorService.rewriteContent({
      originalText: originalContent,
      toneKey: selectedTone,
      analysis: gradeMyMailAnalysis, // Optional: use Grade My Mail data
      options: { targetGradeLow: 6, targetGradeHigh: 9 }
    });
    
    setImprovedContent(result.rewritten);
    setDiffMappings(result.mappings);
  };
  
  return (
    <div className="fix-my-mail-interface">
      <ToneSelector value={selectedTone} onChange={setSelectedTone} />
      <VirtualizedDiffViewer 
        originalContent={originalContent}
        modifiedContent={improvedContent}
        mappings={diffMappings}
      />
    </div>
  );
};
```

#### Backend Integration
```typescript
// Replace old /api/fix endpoint
app.post('/api/newsletter/improve', async (req, res) => {
  const { originalText, toneKey, analysis, suggestions, options } = req.body;
  
  try {
    // Use GMMeditor's rewriteWithLlama31 function
    const result = await rewriteWithLlama31({
      originalText,
      analysis: analysis || {},
      suggestions: suggestions || [],
      toneKey: toneKey || 'friendly',
      options: {
        model: 'llama-3.1-8b-instant',
        temperature: 0.65,
        maxTokens: 1200,
        targetGradeLow: 6,
        targetGradeHigh: 9,
        ...options
      }
    });
    
    res.json({
      rewritten: result.rewritten,
      mappings: result.mappings,
      metadata: {
        model: 'llama-3.1-8b-instant',
        processingTime: Date.now() - startTime,
        toneUsed: toneKey || 'friendly'
      }
    });
  } catch (error) {
    // Fallback to Grade My Mail's intelligent analysis (not mock)
    const fallbackResult = await gradeMyMailFallback(originalText);
    res.json(fallbackResult);
  }
});
```

### File Structure Changes
```
GMMeditor/                          # Existing GMMeditor files
├── rewriteWithLlama31.js          # Main AI rewriting function
├── diffMap.js                     # Diff mapping utilities  
└── editorSystemPrompt.js          # AI system prompts

src/services/
├── gmmeditor.ts                   # New: GMMeditor service integration
└── api.ts                         # Updated: Remove mockFixEmail references

src/pages/
└── FixMyMail.tsx                  # Completely rewritten with GMMeditor

server/
├── gmmeditor-integration.ts       # New: Backend GMMeditor integration
└── index.ts                       # Updated: Remove mock system, add new endpoint
```

## AI Model Configuration

### GMMeditor Llama 3.1 Setup (via Groq)
```typescript
const gmmEditorConfig = {
  apiKey: process.env.GROQ_API_KEY,
  model: 'llama-3.1-8b-instant',
  temperature: 0.65,
  maxTokens: 1200,
  systemPrompt: buildEditorSystemPrompt({
    toneLabel: "Friendly & conversational", // Dynamic based on user selection
    targetGradeLow: 6,
    targetGradeHigh: 9
  })
};
```

### Local Llama 3.2 Setup (Grade My Mail)
```yaml
# Model configuration
model: llama3.2:latest
context_length: 4096
temperature: 0.3
max_tokens: 1024

# System prompt for newsletter analysis
system_prompt: |
  You are a professional newsletter editor. Analyze the provided newsletter content and identify issues in three categories:
  
  1. CLARITY: Hard to read sentences, complex words, unclear messaging
  2. ENGAGEMENT: Weak hooks, poor CTAs, boring language  
  3. TONE: Inconsistent voice, inappropriate formality, spam-like language
  
  Tag problematic text with XML tags:
  - <clarity>text</clarity> for clarity issues
  - <engagement>text</engagement> for engagement problems  
  - <tone>text</tone> for tone inconsistencies
  
  Return only the original text with appropriate tags added.
```

### OpenAI GPT-4o-mini Fallback
```typescript
const openAIConfig = {
  model: 'gpt-4o-mini',
  temperature: 0.3,
  max_tokens: 1024,
  system_prompt: `${llamaSystemPrompt}`, // Same prompt for consistency
  fallback_indicators: {
    add_header: false, // Don't indicate fallback to user
    normalize_response: true // Ensure same format as Llama
  }
};
```

## Performance Optimizations

### Frontend Optimizations
1. **Component Reuse**: Leverage existing optimized components
2. **Lazy Loading**: Load comparison view only when needed
3. **Debounced Analysis**: 1-second delay for real-time analysis
4. **Efficient Highlighting**: Use existing canvas-based overlay
5. **Memory Management**: Clean up resources properly

### Backend Optimizations
1. **Model Caching**: Keep Llama 3.2 warm in memory
2. **Response Caching**: Cache analysis results for identical content
3. **Connection Pooling**: Reuse HTTP connections
4. **Smart Routing**: Route based on model health and load
5. **Graceful Degradation**: Seamless fallback without user disruption

## Error Handling Strategy

### Grade My Mail - Local Model Failures
```typescript
// Graceful fallback without user disruption
try {
  result = await localModel.analyze(content);
} catch (error) {
  console.log('Local model unavailable, using cloud fallback');
  result = await cloudModel.analyze(content);
  // No error shown to user - seamless experience
}
```

### Fix My Mail - GMMeditor Failures
```typescript
// Fallback to Grade My Mail's intelligent system (NOT mock)
try {
  result = await rewriteWithLlama31({
    originalText,
    toneKey,
    options
  });
} catch (error) {
  console.log('GMMeditor unavailable, using Grade My Mail fallback');
  // Use Grade My Mail's intelligent fallback analysis
  result = await gradeMyMailIntelligentFallback(originalText);
  // Never fallback to old mock system
}
```

### Network Failures
```typescript
// Retry with exponential backoff
const result = await retryWithBackoff(
  () => cloudModel.analyze(content),
  { maxRetries: 3, baseDelay: 1000 }
);
```

### User Experience During Errors
- **No Error Modals**: Errors handled silently when possible
- **Subtle Indicators**: Small status indicators for model switching
- **Graceful Degradation**: Basic functionality always available
- **Clear Recovery**: Simple retry mechanisms

## Testing Strategy

### Component Testing
- **Editor**: Test with existing RichTextEditor test suite
- **Highlighting**: Enhance existing HighlightOverlay tests
- **Metrics**: New unit tests for scoring logic
- **Comparison**: Adapt existing VirtualizedDiff tests

### AI Model Testing
- **Local Model**: Test Llama 3.2 setup and responses
- **Fallback Logic**: Test switching between models
- **Response Consistency**: Ensure both models return similar formats
- **Performance**: Load testing with concurrent requests

### Integration Testing
- **End-to-End**: Full user workflow testing
- **Cross-Browser**: Safari, Chrome, Firefox compatibility
- **Mobile**: Responsive design testing
- **Accessibility**: Screen reader and keyboard navigation

## Security Considerations

### Local Model Security
- **Sandboxing**: Run Llama 3.2 in isolated environment
- **Resource Limits**: Prevent resource exhaustion
- **Input Validation**: Sanitize all user content
- **Model Updates**: Secure update mechanism

### API Security
- **Rate Limiting**: Prevent abuse of both local and cloud APIs
- **Input Sanitization**: Clean all user input
- **API Key Management**: Secure OpenAI key storage
- **HTTPS Only**: All communications encrypted

## Deployment Architecture

### Development Environment
```yaml
# docker-compose.yml
services:
  app:
    build: .
    ports: ["3000:3000"]
    environment:
      - AI_MODE=hybrid
      - OPENAI_API_KEY=${OPENAI_API_KEY}
  
  llama:
    image: ollama/ollama
    ports: ["11434:11434"]
    volumes: ["./models:/root/.ollama"]
    command: ["serve"]
```

### Production Environment
```yaml
# Production considerations
- Load balancer for multiple app instances
- Redis for shared caching
- Monitoring for model health
- Auto-scaling based on demand
- Backup OpenAI-only mode for high load
```

## Migration Strategy

### Phase 1: GMMeditor Integration (Fix My Mail Rebuild)
1. **Remove Mock System**: Delete mockFixEmail and old /api/fix endpoint
2. **Integrate GMMeditor Files**: Set up rewriteWithLlama31, diffMap, and editorSystemPrompt
3. **Create New Backend**: Implement /api/newsletter/improve with Groq integration
4. **Rebuild Frontend**: Completely rewrite FixMyMail.tsx with tone selector and enhanced diff viewer

### Phase 2: UI Consistency (Apple-like Polish)
1. **Tone Selector Component**: Create clean dropdown matching Grade My Mail styling
2. **Enhanced Diff Viewer**: Integrate mapDrafts with VirtualizedDiffViewer
3. **Loading States**: Use MinimalPulsePopup for GMMeditor processing
4. **Error Handling**: Implement Grade My Mail fallback (never mock fallback)

### Phase 3: Core Components (Grade My Mail)
1. Simplify existing RichTextEditor
2. Enhance HighlightOverlay with new colors
3. Set up Llama 3.2 locally
4. Implement basic hybrid routing

### Phase 4: Production Hardening
1. **Comprehensive Error Handling**: Both Grade My Mail and Fix My Mail systems
2. **API Health Monitoring**: Groq API status and fallback logic
3. **Performance Optimization**: Caching and request management
4. **Security**: API key management and input validation

### Phase 5: Polish & Launch
1. **UI Refinements**: Consistent Apple-inspired design across both systems
2. **Integration Testing**: End-to-end workflows from Grade My Mail to Fix My Mail
3. **Documentation**: Updated API docs and user guides
4. **Production Deployment**: Staged rollout with monitoring

This design leverages the existing robust codebase while transforming it into a clean, Apple-inspired newsletter grading system with production-grade hybrid AI architecture.
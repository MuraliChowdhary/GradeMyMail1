import Groq from 'groq-sdk';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.development' });

// Get the directory name using a more compatible approach
const __dirname = path.resolve(path.dirname(''));

// Newsletter analysis response interface
export interface NewsletterAnalysis {
  audienceFit: number;
  tone: number;
  clarity: number;
  engagement: number;
  spamRisk: number;
  summary: string[];
  improvements: string[];
  overallGrade: 'A' | 'B' | 'C' | 'D' | 'F';
}

// Groq API configuration
interface GroqConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  topP: number;
}

export class GemmaAPIService {
  private groq: Groq | null = null;
  private systemPrompt: string = '';
  private config: GroqConfig;

  constructor() {
    // Initialize Groq client only if API key is available
    if (process.env.GROQ_API_KEY) {
      this.groq = new Groq({
        apiKey: process.env.GROQ_API_KEY,
      });
    } else {
      console.warn('⚠️  GROQ_API_KEY not configured - Gemma API service will be unavailable');
    }

    // Default configuration
    this.config = {
      model: 'gemma2-9b-it',
      temperature: 0.7,
      maxTokens: 1024,
      topP: 1,
    };

    // Load system prompt
    this.loadSystemPrompt();
  }

  private loadSystemPrompt(): void {
    try {
      // Load the system prompt from the ai-engines directory
      this.systemPrompt = fs.readFileSync(
        path.join(process.cwd(), 'server', 'ai-engines', 'gemma-system-prompt.txt'),
        'utf8'
      );
      console.log('✅ Gemma system prompt loaded successfully.');
    } catch (error) {
      console.error('❌ Error loading Gemma system prompt:', error);
      // Fallback system prompt
      this.systemPrompt = `You are a senior newsletter editor. Be concise, concrete, and non-promotional. Use the user-provided context if present.
Score each category (0–100):
* Audience Fit: How well the content serves the intended audience's needs/level.
* Tone: Appropriate + consistent voice for the audience and goal.
* Clarity: First-pass readability; short, direct sentences; logical flow.
* Engagement: Hook strength, novelty/originality, specificity, story/examples.
* Spam Risk: Hype/claims/spam trigger terms; salesy vibe.

Rules
* Prefer specifics over platitudes.
* If a category had several issues, the score should reflect that.
* Spam risk: higher % = more spammy.
* Be balanced: one sentence on strengths, one on weaknesses, then 2–3 action bullets.

Output EXACTLY this:
Audience Fit: XX%
Tone: XX%
Clarity: XX%
Engagement: XX%
Spam Risk: XX%

Summary:
- [1–2 sentences: overall, mention audience]
- [1–2 sentences: key weaknesses]

Improve Next:
- [bullet 1: specific action]
- [bullet 2: specific action]
- [bullet 3: specific action]`;
    }
  }

  /**
   * Analyze newsletter content using Groq Gemma API
   */
  async analyzeNewsletter(content: string, context?: { intendedAudience?: string; goal?: string }): Promise<NewsletterAnalysis> {
    if (!content || content.trim().length === 0) {
      throw new Error('Content cannot be empty');
    }

    if (!process.env.GROQ_API_KEY || !this.groq) {
      throw new Error('GROQ_API_KEY environment variable is not set');
    }

    try {
      console.log('🤖 Analyzing newsletter with Gemma...');
      
      // Build user message with context if provided
      let userMessage = content;
      if (context && (context.intendedAudience || context.goal)) {
        const contextInfo = [];
        if (context.intendedAudience) {
          contextInfo.push(`Intended Audience: ${context.intendedAudience}`);
        }
        if (context.goal) {
          contextInfo.push(`Newsletter Goal: ${context.goal}`);
        }
        userMessage = `${contextInfo.join('\n')}\n\nNewsletter Content:\n${content}`;
      }

      const chatCompletion = await this.groq.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: this.systemPrompt,
          },
          {
            role: 'user',
            content: userMessage,
          },
        ],
        model: this.config.model,
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
        top_p: this.config.topP,
        stream: false,
        stop: null,
      });

      const response = chatCompletion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('No response from Gemma model');
      }

      console.log('✅ Gemma analysis completed');
      return this.parseAnalysisResponse(response);
    } catch (error) {
      console.error('❌ Error analyzing newsletter with Gemma:', error);
      throw new Error(`Gemma analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse the structured response from Gemma into our interface
   */
  private parseAnalysisResponse(response: string): NewsletterAnalysis {
    try {
      const lines = response.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      
      // Extract scores
      const audienceFit = this.extractScore(lines, 'Audience Fit');
      const tone = this.extractScore(lines, 'Tone');
      const clarity = this.extractScore(lines, 'Clarity');
      const engagement = this.extractScore(lines, 'Engagement');
      const spamRisk = this.extractScore(lines, 'Spam Risk');

      // Extract summary and improvements
      const summary = this.extractSection(lines, 'Summary:');
      const improvements = this.extractSection(lines, 'Improve Next:');

      // Calculate overall grade
      const overallGrade = this.calculateOverallGrade(audienceFit, tone, clarity, engagement, spamRisk);

      return {
        audienceFit,
        tone,
        clarity,
        engagement,
        spamRisk,
        summary,
        improvements,
        overallGrade,
      };
    } catch (error) {
      console.error('❌ Error parsing Gemma response:', error);
      throw new Error('Failed to parse analysis response');
    }
  }

  /**
   * Extract score from response lines
   */
  private extractScore(lines: string[], category: string): number {
    const line = lines.find(l => l.startsWith(category));
    if (!line) {
      console.warn(`⚠️ Could not find score for ${category}, defaulting to 50`);
      return 50;
    }

    const match = line.match(/(\d+)%/);
    if (!match || !match[1]) {
      console.warn(`⚠️ Could not parse score for ${category}, defaulting to 50`);
      return 50;
    }

    return parseInt(match[1], 10);
  }

  /**
   * Extract section content (summary or improvements)
   */
  private extractSection(lines: string[], sectionHeader: string): string[] {
    const startIndex = lines.findIndex(line => line.includes(sectionHeader));
    if (startIndex === -1) {
      console.warn(`⚠️ Could not find section ${sectionHeader}`);
      return [];
    }

    const section: string[] = [];
    for (let i = startIndex + 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;
      
      // Stop if we hit another section header
      if (line.includes(':') && !line.startsWith('-')) {
        break;
      }
      
      // Add bullet points
      if (line.startsWith('-')) {
        section.push(line.substring(1).trim());
      }
    }

    return section;
  }

  /**
   * Calculate overall grade based on scores
   */
  private calculateOverallGrade(
    audienceFit: number,
    tone: number,
    clarity: number,
    engagement: number,
    spamRisk: number
  ): 'A' | 'B' | 'C' | 'D' | 'F' {
    // Calculate weighted average (spam risk is inverted - lower is better)
    const invertedSpamRisk = 100 - spamRisk;
    const average = (audienceFit + tone + clarity + engagement + invertedSpamRisk) / 5;

    if (average >= 90) return 'A';
    if (average >= 80) return 'B';
    if (average >= 70) return 'C';
    if (average >= 60) return 'D';
    return 'F';
  }

  /**
   * Test the connection to Groq API
   */
  async testConnection(): Promise<boolean> {
    if (!this.groq) {
      return false;
    }

    try {
      const testResponse = await this.groq.chat.completions.create({
        messages: [
          {
            role: 'user',
            content: 'Hello, this is a test message.',
          },
        ],
        model: this.config.model,
        temperature: 0.1,
        max_tokens: 50,
      });

      return !!testResponse.choices[0]?.message?.content;
    } catch (error) {
      console.error('❌ Groq API connection test failed:', error);
      return false;
    }
  }

  /**
   * Get service health status
   */
  async getHealthStatus(): Promise<{
    status: 'healthy' | 'unhealthy';
    model: string;
    apiKeyConfigured: boolean;
  }> {
    const apiKeyConfigured = !!process.env.GROQ_API_KEY;
    const connectionWorking = apiKeyConfigured ? await this.testConnection() : false;

    return {
      status: connectionWorking ? 'healthy' : 'unhealthy',
      model: this.config.model,
      apiKeyConfigured,
    };
  }
}

// Export singleton instance
export const gemmaAPIService = new GemmaAPIService();
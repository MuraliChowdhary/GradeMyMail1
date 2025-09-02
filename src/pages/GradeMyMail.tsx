import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import RichTextEditor from '../components/RichTextEditor/RichTextEditor';
import { HighlightedContent } from '../components/HighlightedContent';
import { NavigationManager, type NavigationState } from '../utils/navigationUtils';
import { type EmailData } from '../utils/stateTransfer';
import { useErrorHandler } from '../hooks/useErrorHandler';
import { StatePreservation } from '../utils/errorRecovery';

import { InstructionsPopup } from '../components/InstructionsPopup';
import Logo from '../components/ui/Logo';
import ThemeResponsiveLogo from '../components/ui/ThemeResponsiveLogo';
import { ThemeToggle } from '../components/ThemeToggle';
import { MetricsDisplay, type NewsletterMetrics } from '../components/MetricsDisplay';
import { AnalysisInsights } from '../components/AnalysisInsights';
import { ContextPanel, type NewsletterContext } from '../components/ContextPanel';
import { calculateNewsletterMetrics } from '../utils/metricsCalculator';
import { apiService } from '../services/api';
import ToneSelector from '../components/ToneSelector';
import type { ToneKey } from '../types/gmmeditor';





const GradeMyMail: React.FC = () => {
  const navigate = useNavigate();
  const [content, setContent] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [hasContentChanged, setHasContentChanged] = useState(false);
  const [metrics, setMetrics] = useState<NewsletterMetrics | null>(null);
  const [context, setContext] = useState<NewsletterContext>({
    intendedAudience: '',
    goal: '',
  });
  const [navigationState, setNavigationState] = useState<NavigationState>({
    isLoading: false,
    error: null,
    progress: 0,
  });
  const [aiModelStatus, setAiModelStatus] = useState<{
    currentModel: string;
    isHealthy: boolean;
    usingFallback: boolean;
    lastChecked: Date | null;
  }>({
    currentModel: 'unknown',
    isHealthy: true,
    usingFallback: false,
    lastChecked: null,
  });
  const [selectedTone, setSelectedTone] = useState<ToneKey | null>(null);

  // Container ref for the editor
  const editorContainerRef = useRef<HTMLDivElement>(null);

  // Enhanced error handling
  const { handleAsyncError, enableFallbackMode } = useErrorHandler();

  // Check GroqGemma API health periodically (skip in test environment)
  useEffect(() => {
    // Skip API calls in test environment
    if (process.env.NODE_ENV === 'test' || typeof window === 'undefined') {
      return;
    }

    const checkModelStatus = async () => {
      try {
        console.log('🔍 Checking GroqGemma API health...');
        const healthCheck = await apiService.checkAPIHealth();
        console.log('📊 Received API health status:', healthCheck);

        const isHealthy = healthCheck.healthy;

        console.log(`✅ GroqGemma API status: ${isHealthy ? 'healthy' : 'degraded'}`);

        setAiModelStatus({
          currentModel: 'groq-gemma-dual-system',
          isHealthy,
          usingFallback: false,
          lastChecked: new Date(),
        });
      } catch (error) {
        console.warn('❌ Failed to check GroqGemma API health:', error);
        setAiModelStatus(prev => ({
          ...prev,
          isHealthy: false,
          lastChecked: new Date(),
        }));
      }
    };

    // Check immediately
    checkModelStatus();

    // Check every 30 seconds
    const interval = setInterval(checkModelStatus, 30000);

    return () => clearInterval(interval);
  }, []);

  // Check for recovery data on mount
  useEffect(() => {
    const recovery = StatePreservation.restoreState();
    if (recovery.success && recovery.data) {
      try {
        if (recovery.data.emailContent) {
          setContent(recovery.data.emailContent.originalText || '');
          setHtmlContent(recovery.data.emailContent.originalHTML || '');
        }

        StatePreservation.clearRecoveryData();
      } catch (error) {
        console.error('Failed to restore state:', error);
        StatePreservation.clearRecoveryData();
      }
    }
  }, []);

  // Intelligent fallback analysis when AI systems fail
  const createIntelligentFallbackAnalysis = useCallback((content: string): string => {
    let taggedContent = content;

    // Fluff words detection (common filler words)
    const fluffPatterns = [
      /\b(amazing|incredible|fantastic|awesome|great|wonderful|excellent|outstanding|remarkable|extraordinary)\b/gi,
      /\b(I hope this email finds you well|I hope you're doing well|I trust this finds you well)\b/gi,
      /\b(just wanted to|just checking in|just following up|just a quick)\b/gi,
      /\b(obviously|clearly|definitely|absolutely|certainly|undoubtedly)\b/gi,
      /\b(very|really|quite|extremely|incredibly|tremendously)\b/gi
    ];

    fluffPatterns.forEach(pattern => {
      taggedContent = taggedContent.replace(pattern, '<fluff>$&</fluff>');
    });

    // Spam words detection (marketing/sales language)
    const spamPatterns = [
      /\b(free|urgent|act now|limited time|don't miss|exclusive|special offer|once in a lifetime)\b/gi,
      /\b(guaranteed|risk-free|no obligation|instant|immediate|fast|quick|easy)\b/gi,
      /\b(buy now|order now|click here|call now|sign up now|subscribe now)\b/gi,
      /\b(discount|sale|offer|deal|promotion|bonus|gift|prize)\b/gi,
      /\b(money back|refund|cash|earn|profit|income|opportunity)\b/gi
    ];

    spamPatterns.forEach(pattern => {
      taggedContent = taggedContent.replace(pattern, '<spam_words>$&</spam_words>');
    });

    // Hard to read detection (complex sentences and jargon)
    const hardToReadPatterns = [
      /\b(synergistic|paradigm|leverage|optimize|maximize|utilize|facilitate|implement|strategize)\b/gi,
      /\b(solutions|methodology|framework|infrastructure|architecture|ecosystem|platform)\b/gi,
      /\b(innovative|cutting-edge|state-of-the-art|next-generation|revolutionary|disruptive)\b/gi,
      /\b(comprehensive|holistic|integrated|scalable|robust|dynamic|agile|streamlined)\b/gi
    ];

    hardToReadPatterns.forEach(pattern => {
      taggedContent = taggedContent.replace(pattern, '<hard_to_read>$&</hard_to_read>');
    });

    // Detect overly long sentences (potential readability issues)
    const sentences = taggedContent.split(/[.!?]+/);
    sentences.forEach((sentence, index) => {
      const words = sentence.trim().split(/\s+/);
      if (words.length > 25) { // Sentences longer than 25 words
        const longSentence = sentence.trim();
        if (longSentence && !longSentence.includes('<hard_to_read>')) {
          taggedContent = taggedContent.replace(longSentence, `<hard_to_read>${longSentence}</hard_to_read>`);
        }
      }
    });

    return taggedContent;
  }, []);

  // Smart content validation
  const validateContentForAnalysis = useCallback((content: string): { isValid: boolean; reason?: string } => {
    const trimmedContent = content.trim();

    // Check minimum length
    if (trimmedContent.length < 10) {
      return { isValid: false, reason: 'Content too short (minimum 10 characters)' };
    }

    // Check maximum length
    if (trimmedContent.length > 50000) {
      return { isValid: false, reason: 'Content too long (maximum 50,000 characters)' };
    }

    // Check if content looks like email/newsletter content
    const wordCount = trimmedContent.split(/\s+/).filter(word => word.length > 0).length;
    if (wordCount < 5) {
      return { isValid: false, reason: 'Content too short (minimum 5 words)' };
    }

    // Check for suspicious patterns that might indicate non-email content
    const codePatterns = [
      /function\s*\(/,
      /class\s+\w+/,
      /import\s+.*from/,
      /const\s+\w+\s*=/,
      /let\s+\w+\s*=/,
      /var\s+\w+\s*=/
    ];

    const hasCodePatterns = codePatterns.some(pattern => pattern.test(trimmedContent));
    if (hasCodePatterns) {
      return { isValid: false, reason: 'Content appears to be code rather than email text' };
    }

    return { isValid: true };
  }, []);

  // Manual analysis function with dual-system approach (rule-based + Gemma AI)
  const handleAnalyzeClick = useCallback(async () => {
    // Smart content validation
    const validation = validateContentForAnalysis(content);
    if (!validation.isValid) {
      console.warn('❌ Content validation failed:', validation.reason);
      return;
    }

    setIsAnalyzing(true);

    try {
      console.log('🔍 Starting newsletter analysis with GroqGemma dual-system approach...');
      console.log(`📊 Content stats: ${content.length} chars, ${content.split(/\s+/).length} words`);

      // Use unified dual-system analysis endpoint with context
      const hasContext = context.intendedAudience.trim() || context.goal.trim();
      const unifiedResponse = await apiService.analyzeNewsletter(
        content, 
        'newsletter-unified',
        hasContext ? context : undefined
      );

      console.log('✅ Unified dual-system analysis completed successfully');
      console.log('🎯 System health:', unifiedResponse.metadata?.systemHealth || 'unknown');
      console.log('🤖 Models used:', unifiedResponse.metadata?.systems || 'unknown');

      // LOG THE EXACT AI OUTPUT FOR DEBUGGING
      console.log('🔍 === UNIFIED SYSTEM OUTPUT ===');
      console.log('📄 Unified Response:', unifiedResponse);
      console.log('🔍 === END UNIFIED SYSTEM OUTPUT ===');

      // Set analysis result for highlighting (rule-based system)
      setAnalysisResult(unifiedResponse);

      // Combine metrics from both systems (rule-based + Gemma AI)
      const combinedMetrics = {
        ...unifiedResponse.metrics,
        // Use word count from rule-based analysis (more accurate)
        wordCount: unifiedResponse.analysisResult?.report?.global?.wordCount || unifiedResponse.metrics.wordCount,
        // Add readability and link density from rule-based analysis
        readabilityGrade: unifiedResponse.analysisResult?.report?.global?.readability?.fleschKincaidGrade,
        linkDensity: unifiedResponse.analysisResult?.report?.global?.linkDensityPer100Words,
        // Ensure Gemma AI summary and improvements are included
        summary: unifiedResponse.metrics.summary || [],
        improvements: unifiedResponse.metrics.improvements || [],
      };

      setMetrics(combinedMetrics);

      setHasContentChanged(false); // Reset the changed flag after analysis

      // Update model status after successful analysis
      setAiModelStatus(prev => ({
        ...prev,
        currentModel: 'groq-gemma-dual-system',
        isHealthy: unifiedResponse.metadata?.systemHealth?.ruleBased && unifiedResponse.metadata?.systemHealth?.gemmaAI,
        usingFallback: unifiedResponse.metadata?.systems?.highlighting === 'fallback' || unifiedResponse.metadata?.systems?.scoring === 'fallback',
        lastChecked: new Date(),
      }));

    } catch (error) {
      console.error('❌ Dual-system analysis failed:', error);

      // Update model status to indicate failure
      setAiModelStatus(prev => ({
        ...prev,
        isHealthy: false,
        lastChecked: new Date(),
      }));

      handleAsyncError(
        error instanceof Error ? error : new Error('Analysis failed'),
        {
          operation: 'dual-system-analysis',
          contentLength: content.length,
          errorType: error instanceof Error ? error.name : 'Unknown',
          currentModel: 'groq-gemma-dual-system',
          usingFallback: false
        },
        async () => {
          // Retry with exponential backoff
          await new Promise(resolve => setTimeout(resolve, 1000));
          await handleAnalyzeClick();
        },
        () => {
          enableFallbackMode(true);
          console.log('🔄 GroqGemma systems failed, using intelligent fallback analysis...');

          // Provide intelligent fallback response when all AI systems fail
          const fallbackResponse = {
            analysisResult: {
              annotated: createIntelligentFallbackAnalysis(content)
            },
            summary: {
              totalIssues: 3,
              categories: ['fluff', 'spam_words', 'hard_to_read']
            },
            ranges: [],
            metadata: {
              model: 'intelligent-fallback',
              timestamp: new Date().toISOString()
            }
          };

          setAnalysisResult(fallbackResponse);
          
          // Create fallback metrics
          const fallbackMetrics = calculateNewsletterMetrics(
            fallbackResponse.analysisResult.annotated,
            content
          );
          setMetrics(fallbackMetrics);
          setHasContentChanged(false);
        }
      );
    } finally {
      setIsAnalyzing(false);
    }
  }, [content, htmlContent, context, handleAsyncError, enableFallbackMode]);

  const handleContentChange = useCallback((newContent: string, newHtmlContent: string) => {
    setContent(newContent);
    setHtmlContent(newHtmlContent);

    // Mark content as changed if there's an existing analysis
    if (analysisResult) {
      setHasContentChanged(true);
      // Reset metrics when content changes
      setMetrics(null);
    }
  }, [analysisResult]);

  const handleSampleEmailClick = useCallback(() => {
    const sampleEmail = `Subject: Quarterly Sales Meeting

Hi team,

I hope this email finds you well. I wanted to reach out to you regarding our upcoming quarterly sales meeting that we need to schedule for next month.

As you probably already know, we really need to discuss our performance metrics and maybe talk about some strategies that might help us improve our numbers going forward.

I was thinking we could potentially meet sometime next week, but I'm not entirely sure about everyone's availability. Could you please let me know when you might be free?

Also, we should probably discuss the new product launch and how it's been performing in the market so far.

Looking forward to hearing from you soon.

Best regards,
John`;
    setContent(sampleEmail);
    setHtmlContent(sampleEmail);
  }, []);

  const handleFixMyMailClick = useCallback(async () => {
    // Extract tagged content from the dual-system response
    const taggedContent = analysisResult?.analysisResult?.annotated || 
                         analysisResult?.message?.content || 
                         '';
    
    if (!taggedContent) {
      return;
    }

    try {
      // Start the improvement loading screen
      setNavigationState(prev => ({ ...prev, isLoading: true, progress: 0 }));

      StatePreservation.preserveState('navigation-to-fixmymail', {
        fromPage: 'GradeMyMail',
        hasAnalysis: true
      });

      setNavigationState(prev => ({ ...prev, progress: 20 }));

      const emailData: Omit<EmailData, 'id' | 'timestamp'> = {
        originalText: content,
        originalHTML: htmlContent,
        taggedContent,
        gradeMyMailMetrics: metrics, // Pass the actual Grade My Mail metrics
        metadata: {
          wordCount: content.split(/\s+/).filter(word => word.length > 0).length,
          emailType: 'general',
          tone: selectedTone || undefined, // Pass the selected tone, or undefined to preserve original tone
        },
      };

      setNavigationState(prev => ({ ...prev, progress: 50 }));

      await NavigationManager.navigateToFixMyMail(
        navigate,
        emailData,
        (navState) => {
          setNavigationState(prev => ({ 
            ...prev, 
            progress: Math.max(prev.progress, 50 + (navState.progress * 0.5))
          }));
        }
      );

    } catch (error) {
      setNavigationState(prev => ({ ...prev, isLoading: false, progress: 0 }));
      handleAsyncError(
        error instanceof Error ? error : new Error('Navigation failed'),
        {
          operation: 'navigate-to-fixmymail',
          hasContent: !!content,
          hasAnalysis: !!analysisResult
        },
        async () => {
          await handleFixMyMailClick();
        }
      );
    }
  }, [navigate, content, htmlContent, analysisResult, metrics, handleAsyncError]);

  return (
    <div className="min-h-screen bg-white dark:bg-[#1C1C1E] transition-colors duration-300">


      {/* Instructions Popup */}
      <InstructionsPopup />

      {/* Minimal Header */}
      <header className="relative">
        <div className="flex items-center justify-center py-16 px-6">
          {/* Pick & Partner Logo - Left Side */}
          <div className="absolute left-20 animate-slide-in-left">
            <Logo size="lg-xl" showText={false} />
          </div>

          {/* Theme-Responsive GradeMyMail Logo - Center */}
          <div className="text-center animate-fade-in-up">
            <ThemeResponsiveLogo
              size="hero"
              clickable={true}
              showFallbackText={true}
            />
          </div>

          {/* Theme Toggle - Right Side */}
          <div className="absolute right-20 animate-slide-in-right">
            <ThemeToggle size="md" />
          </div>
        </div>
      </header>

      {/* Main Content - Minimal Layout */}
      <main className="max-w-4xl mx-auto px-6 pb-16 relative">
        {/* Editor Section - Clean and Spacious */}
        <div className="bg-white dark:bg-[#2C2C2E] border border-gray-200 dark:border-white/5 rounded-xl shadow-sm dark:shadow-[0_4px_20px_rgba(0,0,0,0.4)] overflow-hidden transition-all duration-400 hover:shadow-md dark:hover:shadow-[0_6px_24px_rgba(0,0,0,0.5)] hover:-translate-y-1 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <div
            ref={editorContainerRef}
            className="relative p-8"
          >
            <RichTextEditor
              initialValue={content}
              onChange={handleContentChange}
              placeholder="type something"
              className=""
              enableAutoSave={false}
              enableSpellCheck={false}
              enableGrammarCheck={false}
              showValidation={false}
            />

            {/* Analysis Results - Show highlighted content when analysis is complete */}
            {analysisResult && !hasContentChanged && (
              <div className="absolute inset-0 bg-white/95 dark:bg-[#3A3A3C]/95 backdrop-blur-sm rounded-lg border border-gray-200 dark:border-white/5 p-4 overflow-auto">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-[#EBEBF5]">Analysis Results</h3>
                  <button
                    onClick={() => setAnalysisResult(null)}
                    className="text-gray-400 hover:text-gray-600 dark:text-[#8E8E93] dark:hover:text-[#EBEBF5] transition-colors"
                    title="Close analysis"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <HighlightedContent
                  content={analysisResult.analysisResult?.annotated || analysisResult.message?.content || content}
                  originalHTML={htmlContent}
                  className="text-sm"
                />
              </div>
            )}
          </div>
        </div>

        {/* Context Panel - Fixed position, moved down */}
        <div className="hidden xl:block absolute right-0 top-8 -mr-80">
          <ContextPanel
            context={context}
            onChange={setContext}
            className="animate-fade-in-right w-72"
          />
        </div>

        {/* Action Buttons */}
        <div className="text-center mt-8 space-y-4">
          {/* Analyze Button - Show when there's content AND (no analysis OR content has changed) */}
          {content && content.trim().length > 10 && (!analysisResult || hasContentChanged) && (
            <button
              onClick={handleAnalyzeClick}
              disabled={isAnalyzing}
              className="bg-black hover:bg-gray-800 dark:bg-[#03FF40] dark:hover:bg-[#00e639] disabled:bg-gray-400 dark:disabled:bg-[#8E8E93] text-white dark:text-black px-8 py-3 rounded-xl font-medium transition-all duration-300 cubic-bezier(0.4, 0, 0.2, 1) transform hover:scale-105 hover:-translate-y-1 hover:shadow-xl disabled:transform-none disabled:shadow-none animate-fade-in-up relative overflow-hidden focus:outline-none focus:ring-2 focus:ring-black/50 dark:focus:ring-[#03FF40]/50 focus:ring-offset-2 min-w-[120px]"
            >
              <span className={`relative z-10 flex items-center justify-center ${isAnalyzing ? 'animate-pulse' : ''}`}>
                {isAnalyzing && (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                )}
                {isAnalyzing ? 'Analyzing...' : 'Analyze'}
              </span>
              {!isAnalyzing && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-700 ease-out"></div>
              )}
              {isAnalyzing && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse"></div>
              )}
            </button>
          )}

          {/* Improve Button - Only after analysis and content hasn't changed */}
          {analysisResult && !hasContentChanged && (
            <button
              onClick={handleFixMyMailClick}
              disabled={isAnalyzing || navigationState.isLoading}
              className="bg-orange-500 hover:bg-orange-600 dark:bg-orange-500 dark:hover:bg-orange-600 disabled:bg-orange-300 dark:disabled:bg-orange-700 text-white px-8 py-3 rounded-xl font-medium transition-all duration-300 cubic-bezier(0.4, 0, 0.2, 1) transform hover:scale-105 hover:-translate-y-1 hover:shadow-xl disabled:transform-none disabled:shadow-none animate-fade-in-up relative overflow-hidden focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:ring-offset-2 min-w-[120px]"
              style={{ animationDelay: '0.2s' }}
            >
              <span className={`relative z-10 flex items-center justify-center ${navigationState.isLoading ? 'animate-pulse' : ''}`}>
                {navigationState.isLoading && (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                )}
                {navigationState.isLoading ? 'Loading...' : 'Improve'}
              </span>
              {!navigationState.isLoading && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-700 ease-out"></div>
              )}
              {navigationState.isLoading && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse"></div>
              )}
            </button>
          )}
        </div>

        {/* Sample Button - Only when empty */}
        {!content && (
          <div className="text-center mt-8 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            <button
              onClick={handleSampleEmailClick}
              className="text-gray-500 hover:text-gray-700 dark:text-[#8E8E93] dark:hover:text-[#EBEBF5] text-sm font-medium transition-all duration-300 cubic-bezier(0.4, 0, 0.2, 1) hover:scale-110 hover:-translate-y-0.5 relative focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 rounded-md px-2 py-1"
            >
              <span className="relative z-10">Try sample</span>
              <div className="absolute inset-0 bg-gray-100 dark:bg-gray-700 rounded-md opacity-0 hover:opacity-100 transition-opacity duration-300 -z-10 scale-110"></div>
            </button>
          </div>
        )}

        {/* AI Model Status Indicator - Subtle and non-intrusive */}
        {aiModelStatus.lastChecked && (
          <div className="mt-8 text-center animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            <div className="inline-flex items-center space-x-2 text-xs text-gray-400 dark:text-[#8E8E93] bg-gray-50 dark:bg-[#2C2C2E] px-3 py-1 rounded-full">
              <div className={`w-2 h-2 rounded-full ${aiModelStatus.isHealthy ? 'bg-green-400' : 'bg-yellow-400'}`}></div>
              <span>
                {aiModelStatus.usingFallback ? 'Fallback AI' :
                  aiModelStatus.currentModel === 'llama3.2' ? 'Local AI' :
                    aiModelStatus.currentModel === 'gpt-4o-mini' ? 'Cloud AI' :
                      'Hybrid AI'}
                {!aiModelStatus.isHealthy && ' (Degraded)'}
              </span>
            </div>
          </div>
        )}

        {/* Technical Metrics - Below AI Health Status */}
        {metrics && !hasContentChanged && !isAnalyzing && (metrics.readabilityGrade !== undefined || metrics.linkDensity !== undefined) && (
          <div className="mt-6 text-center animate-fade-in-up" style={{ animationDelay: '0.35s' }}>
            <div className="inline-flex items-center space-x-8 text-sm bg-gray-50 dark:bg-[#2C2C2E] px-6 py-3 rounded-full">
              {/* Readability Score with Newsletter Context */}
              {metrics.readabilityGrade !== undefined && (
                <div className="flex items-center space-x-2 group relative">
                  <span className="text-gray-500 dark:text-[#8E8E93]">Readability:</span>
                  <div className="flex items-center space-x-1">
                    <span className={`font-semibold ${
                      metrics.readabilityGrade <= 6 ? 'text-green-600 dark:text-[#30D158]' :
                      metrics.readabilityGrade <= 9 ? 'text-blue-600 dark:text-[#007AFF]' :
                      metrics.readabilityGrade <= 12 ? 'text-yellow-600 dark:text-[#FFD60A]' :
                      metrics.readabilityGrade <= 16 ? 'text-orange-600 dark:text-[#FF9F0A]' :
                      'text-red-600 dark:text-[#FF453A]'
                    }`}>
                      {metrics.readabilityGrade.toFixed(1)} grade
                    </span>
                    
                    {/* Newsletter Context Indicator */}
                    {metrics.readabilityGrade > 12 && (
                      <div className="flex items-center">
                        <svg className="w-3 h-3 text-amber-500 dark:text-amber-400 ml-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                  
                  {/* Tooltip for Newsletter Context */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                    <div className="text-center">
                      <div className="font-medium mb-1">Newsletter Readability</div>
                      <div className="space-y-0.5 text-left">
                        <div className="text-green-400 dark:text-green-600">✓ Ideal: 6-9 grade</div>
                        <div className="text-yellow-400 dark:text-yellow-600">⚠ OK: 10-12 grade</div>
                        {metrics.readabilityGrade > 12 && (
                          <div className="text-red-400 dark:text-red-600">✗ Too complex for newsletters</div>
                        )}
                      </div>
                    </div>
                    {/* Tooltip arrow */}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900 dark:border-t-gray-100"></div>
                  </div>
                </div>
              )}
              
              {/* Separator */}
              {metrics.readabilityGrade !== undefined && metrics.linkDensity !== undefined && (
                <div className="w-1.5 h-1.5 bg-gray-300 dark:bg-[#8E8E93] rounded-full"></div>
              )}
              
              {/* Link Density */}
              {metrics.linkDensity !== undefined && (
                <div className="flex items-center space-x-2">
                  <span className="text-gray-500 dark:text-[#8E8E93]">Links:</span>
                  <span className={`font-semibold ${
                    metrics.linkDensity <= 2 ? 'text-green-600 dark:text-[#30D158]' :
                    metrics.linkDensity <= 4 ? 'text-yellow-600 dark:text-[#FFD60A]' :
                    'text-red-600 dark:text-[#FF453A]'
                  }`}>
                    {metrics.linkDensity.toFixed(1)}/100 words
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Results Section - Only show when content hasn't changed */}
        {metrics && !hasContentChanged && !isAnalyzing && (
          <div className="mt-16 space-y-12">
            {/* Side by Side Layout - Better Spacing & Alignment */}
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-12 items-start">
              {/* Metrics Display - Takes 2 columns, positioned left */}
              <div className="lg:col-span-2 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
                <div className="sticky top-8">
                  <MetricsDisplay
                    metrics={metrics}
                    className="shadow-lg"
                  />
                </div>
              </div>

              {/* Analysis Insights - Takes 3 columns, positioned right */}
              <div className="lg:col-span-3 animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
                <div className="pl-4 lg:pl-8">
                  <AnalysisInsights
                    metrics={metrics}
                    className=""
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default GradeMyMail;
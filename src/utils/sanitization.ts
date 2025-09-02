import DOMPurify from 'dompurify';

// Configuration for DOMPurify to allow rich text formatting while preventing XSS
const SANITIZE_CONFIG = {
  ALLOWED_TAGS: [
    'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'del',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li',
    'blockquote', 'pre', 'code',
    'a', 'img',
    'div', 'span'
  ],
  ALLOWED_ATTR: [
    'href', 'title', 'alt', 'src', 'width', 'height',
    'class', 'id', 'style',
    'target', 'rel'
  ],
  ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  ALLOW_DATA_ATTR: false,
  FORBID_SCRIPT: true,
  FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input', 'button'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur'],
  KEEP_CONTENT: true,
  RETURN_DOM: false,
  RETURN_DOM_FRAGMENT: false,
  RETURN_DOM_IMPORT: false,
  SANITIZE_DOM: true,
  WHOLE_DOCUMENT: false,
  FORCE_BODY: false
};

// Strict configuration for paste content (more restrictive)
const PASTE_SANITIZE_CONFIG = {
  ...SANITIZE_CONFIG,
  ALLOWED_TAGS: [
    'p', 'br', 'strong', 'b', 'em', 'i', 'u',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li',
    'blockquote', 'a'
  ],
  ALLOWED_ATTR: ['href', 'title', 'target', 'rel'],
  // Remove potentially dangerous styling
  FORBID_ATTR: [
    ...SANITIZE_CONFIG.FORBID_ATTR,
    'style', 'class', 'id'
  ]
};

/**
 * Sanitizes HTML content to prevent XSS attacks while preserving formatting
 */
export function sanitizeHTML(html: string, strict = false): string {
  if (!html || typeof html !== 'string') {
    return '';
  }

  const config = strict ? PASTE_SANITIZE_CONFIG : SANITIZE_CONFIG;
  return DOMPurify.sanitize(html, config);
}

/**
 * Sanitizes content specifically for paste operations
 * More restrictive to prevent malicious content from external sources
 */
export function sanitizePastedContent(html: string): string {
  return sanitizeHTML(html, true);
}

/**
 * Validates content length and structure
 */
export interface ContentValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  stats: {
    characterCount: number;
    wordCount: number;
    htmlSize: number;
  };
}

export const CONTENT_LIMITS = {
  MAX_CHARACTERS: 50000, // 50k characters
  MAX_WORDS: 10000, // 10k words
  MAX_HTML_SIZE: 100000, // 100kb HTML
  WARN_CHARACTERS: 40000, // Warning at 40k characters
  WARN_WORDS: 8000, // Warning at 8k words
  WARN_HTML_SIZE: 80000 // Warning at 80kb HTML
};

/**
 * Validates content against length and security constraints
 */
export function validateContent(html: string, plainText: string): ContentValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Calculate stats
  const characterCount = plainText.length;
  const wordCount = plainText.trim() ? plainText.trim().split(/\s+/).length : 0;
  const htmlSize = new Blob([html]).size;
  
  // Check hard limits
  if (characterCount > CONTENT_LIMITS.MAX_CHARACTERS) {
    errors.push(`Content exceeds maximum character limit (${CONTENT_LIMITS.MAX_CHARACTERS.toLocaleString()})`);
  }
  
  if (wordCount > CONTENT_LIMITS.MAX_WORDS) {
    errors.push(`Content exceeds maximum word limit (${CONTENT_LIMITS.MAX_WORDS.toLocaleString()})`);
  }
  
  if (htmlSize > CONTENT_LIMITS.MAX_HTML_SIZE) {
    errors.push(`Content size exceeds maximum limit (${(CONTENT_LIMITS.MAX_HTML_SIZE / 1024).toFixed(0)}KB)`);
  }
  
  // Check warning thresholds
  if (characterCount > CONTENT_LIMITS.WARN_CHARACTERS && characterCount <= CONTENT_LIMITS.MAX_CHARACTERS) {
    warnings.push(`Content is approaching character limit (${characterCount.toLocaleString()}/${CONTENT_LIMITS.MAX_CHARACTERS.toLocaleString()})`);
  }
  
  if (wordCount > CONTENT_LIMITS.WARN_WORDS && wordCount <= CONTENT_LIMITS.MAX_WORDS) {
    warnings.push(`Content is approaching word limit (${wordCount.toLocaleString()}/${CONTENT_LIMITS.MAX_WORDS.toLocaleString()})`);
  }
  
  if (htmlSize > CONTENT_LIMITS.WARN_HTML_SIZE && htmlSize <= CONTENT_LIMITS.MAX_HTML_SIZE) {
    warnings.push(`Content size is approaching limit (${(htmlSize / 1024).toFixed(0)}KB/${(CONTENT_LIMITS.MAX_HTML_SIZE / 1024).toFixed(0)}KB)`);
  }
  
  // Basic security checks
  if (html.includes('<script') || html.includes('javascript:')) {
    errors.push('Content contains potentially dangerous scripts');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    stats: {
      characterCount,
      wordCount,
      htmlSize
    }
  };
}

/**
 * Extracts and cleans text from HTML while preserving basic structure
 */
export function extractCleanText(html: string): string {
  // Create a temporary DOM element to parse HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = sanitizeHTML(html);
  
  // Get text content and normalize whitespace
  return tempDiv.textContent || tempDiv.innerText || '';
}

/**
 * Cleans HTML content for display purposes, removing all HTML tags and analysis tags
 * while preserving readable formatting and text content
 */
export function cleanHtmlForDisplay(html: string): string {
  // Input validation
  if (!html || typeof html !== 'string') {
    console.warn('cleanHtmlForDisplay: Invalid input provided', { type: typeof html, value: html });
    return '';
  }

  // Performance monitoring for large content
  const startTime = performance.now();
  const inputLength = html.length;
  
  if (inputLength > 100000) { // 100KB threshold
    console.warn('cleanHtmlForDisplay: Processing large content', { size: inputLength });
  }

  try {
    const result = html
    // Remove analysis tags first (fluff, spam_words, hard_to_read) - both opening and closing
    .replace(/<\/?(?:fluff|spam_words|hard_to_read)>/gi, '')
    
    // Convert block elements to line breaks with proper spacing
    .replace(/<\/?(p|div|h[1-6]|li|blockquote|article|section|header|footer|main|aside)[^>]*>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?(ul|ol|dl)[^>]*>/gi, '\n')
    .replace(/<hr[^>]*>/gi, '\n---\n')
    
    // Handle table elements
    .replace(/<\/?(table|tbody|thead|tfoot|tr)[^>]*>/gi, '\n')
    .replace(/<\/?(td|th)[^>]*>/gi, ' | ')
    
    // Convert some inline elements to preserve meaning
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
    .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
    .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
    .replace(/<u[^>]*>(.*?)<\/u>/gi, '_$1_')
    .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '$2 ($1)')
    .replace(/<a[^>]*>(.*?)<\/a>/gi, '$1')
    
    // Remove all remaining HTML tags
    .replace(/<[^>]*>/g, '')
    
    // Decode HTML entities comprehensively
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&cent;/g, '¢')
    .replace(/&pound;/g, '£')
    .replace(/&yen;/g, '¥')
    .replace(/&euro;/g, '€')
    .replace(/&copy;/g, '©')
    .replace(/&reg;/g, '®')
    .replace(/&trade;/g, '™')
    .replace(/&hellip;/g, '...')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&lsquo;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"')
    
    // Handle numeric HTML entities
    .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (match, hex) => String.fromCharCode(parseInt(hex, 16)))
    
    // Clean up whitespace and formatting
    .replace(/\n\s*\n\s*\n+/g, '\n\n') // Max 2 consecutive line breaks
    .replace(/[ \t]+/g, ' ') // Multiple spaces/tabs to single space
    .replace(/\n[ \t]+/g, '\n') // Remove spaces at start of lines
    .replace(/[ \t]+\n/g, '\n') // Remove spaces at end of lines
    .replace(/^\n+/, '') // Remove leading newlines
    .replace(/\n+$/, '') // Remove trailing newlines
    .trim();

    // Performance logging
    const endTime = performance.now();
    const processingTime = endTime - startTime;
    
    if (processingTime > 100) { // Log if processing takes more than 100ms
      console.warn('cleanHtmlForDisplay: Slow processing detected', {
        inputSize: inputLength,
        outputSize: result.length,
        processingTime: `${processingTime.toFixed(2)}ms`
      });
    }

    // Validation of output
    const hasRemainingHtmlTags = /<[^>]*>/.test(result);
    const hasRemainingAnalysisTags = /<(fluff|spam_words|hard_to_read)>/.test(result);
    
    if (hasRemainingHtmlTags || hasRemainingAnalysisTags) {
      console.warn('cleanHtmlForDisplay: Incomplete cleaning detected', {
        hasRemainingHtmlTags,
        hasRemainingAnalysisTags,
        resultPreview: result.substring(0, 200) + '...'
      });
    }

    return result;

  } catch (error) {
    console.error('cleanHtmlForDisplay: Error during processing', {
      error: error instanceof Error ? error.message : 'Unknown error',
      inputLength,
      inputPreview: html.substring(0, 200) + '...'
    });
    
    // Fallback: return input with basic tag removal
    try {
      return html.replace(/<[^>]*>/g, '').trim();
    } catch (fallbackError) {
      console.error('cleanHtmlForDisplay: Fallback also failed', fallbackError);
      return 'Content could not be processed for display';
    }
  }
}

/**
 * Checks if content appears to be potentially malicious
 */
export function detectSuspiciousContent(html: string): string[] {
  const suspiciousPatterns = [
    /javascript:/gi,
    /data:text\/html/gi,
    /vbscript:/gi,
    /on\w+\s*=/gi, // Event handlers like onclick, onload, etc.
    /<script/gi,
    /<iframe/gi,
    /<object/gi,
    /<embed/gi,
    /<form/gi,
    /expression\s*\(/gi, // CSS expressions
    /url\s*\(\s*javascript:/gi
  ];
  
  const detectedIssues: string[] = [];
  
  suspiciousPatterns.forEach((pattern, index) => {
    if (pattern.test(html)) {
      const issueNames = [
        'JavaScript URLs',
        'Data URLs with HTML',
        'VBScript URLs',
        'Event handlers',
        'Script tags',
        'Iframe tags',
        'Object tags',
        'Embed tags',
        'Form tags',
        'CSS expressions',
        'JavaScript in CSS URLs'
      ];
      detectedIssues.push(issueNames[index]);
    }
  });
  
  return detectedIssues;
}
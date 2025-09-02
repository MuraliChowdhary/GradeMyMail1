// Professional highlight mapping utility
// Maps highlights from tagged plain text to HTML while preserving formatting

interface HighlightInfo {
  type: 'hard_to_read' | 'fluff' | 'spam_words';
  text: string;
  start: number;
  end: number;
}

/**
 * Extract highlights from tagged plain text
 */
export function extractHighlights(taggedContent: string): HighlightInfo[] {
  const highlights: HighlightInfo[] = [];
  const tagRegex = /<(hard_to_read|fluff|spam_words)>(.*?)<\/\1>/gs;
  
  // Get the plain text version for accurate position mapping
  let plainTextOffset = 0;
  let currentOffset = 0;
  let match;

  // Reset regex
  tagRegex.lastIndex = 0;

  while ((match = tagRegex.exec(taggedContent)) !== null) {
    const [fullMatch, tagType, taggedText] = match;
    const matchStart = match.index;

    // Calculate position in plain text
    const beforeMatch = taggedContent.substring(currentOffset, matchStart);
    const plainBefore = beforeMatch.replace(/<[^>]*>/g, '');
    
    const startPos = plainTextOffset + plainBefore.length;
    const endPos = startPos + taggedText.length;

    highlights.push({
      type: tagType as HighlightInfo['type'],
      text: taggedText.trim(),
      start: startPos,
      end: endPos
    });

    plainTextOffset += plainBefore.length + taggedText.length;
    currentOffset = matchStart + fullMatch.length;
  }

  return highlights;
}

/**
 * Apply highlights to HTML content while preserving structure
 */
export function applyHighlightsToHTML(
  htmlContent: string, 
  highlights: HighlightInfo[],
  styleMap: Record<string, React.CSSProperties>,
  tooltipMap: Record<string, string>
): string {
  if (highlights.length === 0) return htmlContent;

  let result = htmlContent;

  // Sort highlights by text length (longest first) to avoid partial replacements
  const sortedHighlights = [...highlights].sort((a, b) => b.text.length - a.text.length);

  sortedHighlights.forEach(highlight => {
    const { type, text } = highlight;
    
    if (!text || text.trim().length === 0) return;

    const style = styleMap[type];
    const tooltip = tooltipMap[type];
    
    // Convert style object to CSS string
    const styleString = Object.entries(style)
      .map(([key, value]) => {
        const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
        return `${cssKey}: ${value}`;
      })
      .join('; ');

    // Create a more precise regex that avoids matching inside HTML tags
    // This regex uses negative lookbehind and lookahead to avoid matching inside tags
    const escapedText = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Only replace text that's not inside HTML tags and not already highlighted
    const regex = new RegExp(
      `(?<!<[^>]*>)(?<!<span[^>]*class="highlight-span"[^>]*>)${escapedText}(?![^<]*>)(?!</span>)`,
      'gi'
    );

    const replacement = `<span class="highlight-span" style="${styleString}" title="${tooltip}">${text}</span>`;
    
    // Only replace if we find matches
    if (regex.test(result)) {
      result = result.replace(regex, replacement);
    }
  });

  return result;
}

/**
 * Simple fallback: process tagged content directly
 */
export function processTaggedContent(
  taggedContent: string,
  styleMap: Record<string, React.CSSProperties>,
  tooltipMap: Record<string, string>
): string {
  return taggedContent.replace(
    /<(hard_to_read|fluff|spam_words)>(.*?)<\/\1>/gs,
    (match, tagType, taggedText) => {
      const style = styleMap[tagType];
      const tooltip = tooltipMap[tagType];
      
      if (!style || !tooltip) return taggedText;
      
      const styleString = Object.entries(style)
        .map(([key, value]) => {
          const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
          return `${cssKey}: ${value}`;
        })
        .join('; ');
      
      return `<span class="highlight-span" style="${styleString}" title="${tooltip}">${taggedText}</span>`;
    }
  );
}
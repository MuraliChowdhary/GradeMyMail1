// newsletter-tagger.js

/**
 * Advanced Rule-Based Content Tagger (Newsletter-Ready)
 * - Weighted jargon + thresholds
 * - Fluff density detection
 * - Spam stacking + formatting signals
 * - Passive voice (configurable)
 * - Newsletter-specific checks (CTA, dates, claims, vagueness)
 * - Formatting issues, redundant sentences, readability grade (FK)
 * - NEW: grammar_spelling using write-good library for professional grammar checking
 * - Outputs annotated HTML + structured JSON report
 */

import writeGood from 'write-good';

// ---------------- Configuration ----------------

export const DEFAULT_OPTIONS = {
  sentenceLength: { maxLength: 22 },     // newsletters read better at ~20–22 words
  allCaps: { maxAllowed: 2 },
  excessivePunctuation: { maxExclamations: 3 },
  passiveVoice: { enabled: true },

  thresholds: {
    fluffPhrases: 2,                     // require >= 2 fluff signals in a sentence
    mildJargon: 2,                       // 2 mild jargon to tag
    heavyJargon: 1,                      // 1 heavy jargon is enough
    spamWords: 2                         // >= 2 spam triggers
  },

  // Formatting heuristics
  maxEmojiPerSentence: 3,
  maxLinksPer100Words: 3,

  // Newsletter-specific
  ctaPhrases: [
    'read more','learn more','sign up','subscribe','join now','get started',
    'try it free','try now','download','view full post','claim offer','book a demo'
  ],
  hedgeWords: ['might','may','could','seems','appears','likely','potentially'],
  vagueDates: ['soon','recently','nowadays','these days','as of late','in the near future'],
  baldClaimVerbs: ['guarantee','prove','ensure','unlock','double','triple'],

  // Redundancy / Readability
  redundancy: {
    similarityThreshold: 0.85,           // Jaccard on tokens (0–1)
    minSentenceWords: 6                  // skip very short sentences
  },
  readability: {
    gradeThreshold: 9                    // flag if FK grade > 9
  },

  // NEW: Grammar/Spelling (less aggressive for newsletter content)
  grammar: {
    enabled: true,
    // pass a Set<string> or string[] of words here to improve accuracy (Hunspell/wordlist)
    dictionary: null,
    // ignore words shorter than this (avoids flagging short acronyms, names, etc.)
    minWordLength: 5,
    // treat Capitalized words (mid-sentence) as potential proper nouns; skip them
    skipProperNouns: true,
    // skip tokens with digits or mixed case (IDs, codes)
    skipNonLexical: true,
    // if too many misspellings in one sentence, cap the list to keep UI clean
    maxMisspellingsListed: 3
  },

  annotate: true                         // wrap offending sentences in <tags>
};

// Weighted jargon lists
export const JARGON = {
  mild: [
    'optimize','leverage','prioritize','facilitate','utilize','methodology','scalable',
    'innovative','streamline','visibility','alignment','stakeholders','mission','enable',
    'transform','roadmap','touchpoints','deliverables'
  ],
  heavy: [
    'paradigm shift','synergize','omnichannel','best-in-class','frictionless',
    'empowerment','digital transformation','mission-critical','seamless integration',
    'strategic deployment','thought leadership','core competency','value proposition'
  ]
};

// Spam words
export const SPAM_WORDS = [
  'act now','amazing','boost','cash','congratulations','exclusive offer','game-changer',
  'guaranteed','incredible','instant','limited-time','miracle','revolutionary','risk-free',
  'secret','supercharge','transform','unlock','win','urgent',"don't miss out",'100% free',
  'apply now','as seen on','bargain','best price','bonus','buy now','call now',
  'cancel at any time','clearance','click here','deal','discount','double your',
  'earn extra cash','eliminate debt','explode','extra cash','fantastic','for free',
  'for instant access','get it now','get paid','giveaway','great offer','huge',
  'important information','increase sales','investment','join millions','lifetime',
  'lowest price','make money','money back','no catch','no cost','no fees','no gimmick',
  'no hidden costs','no obligation','now only','offer expires','one time','order now',
  'please read','prize','profit','promise you','pure profit','save big',
  'special promotion','subscribe now','top status','trial','unlimited','visit our website',
  'winner','work from home','free trial','limited seats','earn rewards','get rich',
  'fast cash','exclusive deal','free upgrade','act fast'
];

// Fluff & intensifiers
export const FLUFF_PHRASES = [
  'be consistent','go the extra mile','in this day and age','it goes without saying',
  "it's important to",'level up your','post great content','take regular breaks',
  'think outside the box','work smarter not harder','at the end of the day',
  'make it happen','unlock your potential','change the game','your best self','sky’s the limit'
];
export const INTENSIFIERS = [
  'absolutely','actually','basically','certainly','completely','definitely',
  'extremely','honestly','just','literally','obviously','quite','really','simply','totally','very'
];

// ---------------- Utils ----------------

const splitSentences = (t) => (t.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || []).map(t=>t.trim());
const wordCount = (t) => (t.match(/\b\w+\b/g) || []).length;
const lower = (t) => t.toLowerCase();
const countIncludes = (t, list) => list.reduce((c, p) => c + (lower(t).includes(p) ? 1 : 0), 0);
const countRegex = (t, re) => (t.match(re) || []).length;
const hasRegex = (t, re) => re.test(t);
const unique = (arr) => Array.from(new Set(arr));

// Regexes
const passiveRegex = /\b(is|are|was|were|be|been|being)\s+\w+(?:ed|en)\b/i;
const emojiRegex = /[\u{1F300}-\u{1FAFF}]/u;
const urlRegex = /\bhttps?:\/\/[^\s)]+/ig;
const capsWordRegex = /\b[A-Z]{3,}\b/g;
const numberRegex = /\b\d+(?:\.\d+)?\b/g;

// ---------------- Per-sentence checks ----------------

function checkFluff(sentence, opts) {
  const fp = countIncludes(sentence, FLUFF_PHRASES);
  const intens = countIncludes(sentence, INTENSIFIERS);
  const vagueVerbObj = /\b(improve|boost|enhance|increase|elevate)\s+(your|the|our)\s+\w+/i.test(sentence);
  const fluffy = (fp >= opts.thresholds.fluffPhrases) || (fp >= 1 && intens >= 1) || vagueVerbObj;
  return fluffy ? { tag: 'fluff', reasons: { fp, intens, vagueVerbObj } } : null;
}

function checkJargon(sentence, opts) {
  const mild = countIncludes(sentence, JARGON.mild);
  const heavy = countIncludes(sentence, JARGON.heavy);
  const tooLong = wordCount(sentence) > opts.sentenceLength.maxLength;
  const passive = opts.passiveVoice.enabled && passiveRegex.test(sentence);
  const commas = countRegex(sentence, /,/g);
  const conj = countRegex(sentence, /\b(and|or|but|which|that)\b/gi);

  const jargonHit = (heavy >= opts.thresholds.heavyJargon) || (mild >= opts.thresholds.mildJargon);
  
  // Simple structure detection - flag genuinely complex sentences
  const hardStructure = tooLong || (commas >= 3) || conj >= 2 || passive;

  // Flag if there's jargon OR complex structure
  if (jargonHit || hardStructure) {
    return {
      tag: 'hard_to_read',
      reasons: { mild, heavy, tooLong, passive, commas, conj }
    };
  }
  return null;
}

function checkSpam(sentence, opts) {
  const spamCount = countIncludes(sentence, SPAM_WORDS);
  const exclam = countRegex(sentence, /!/g);
  const caps = (sentence.match(capsWordRegex) || []).length;

  if (spamCount >= opts.thresholds.spamWords ||
      exclam > opts.excessivePunctuation.maxExclamations ||
      caps > opts.allCaps.maxAllowed) {
    return { tag: 'spam_words', reasons: { spamCount, exclam, caps } };
  }
  return null;
}

function checkEmojiExcess(sentence, opts) {
  const emojis = (sentence.match(emojiRegex) || []).length;
  return emojis > opts.maxEmojiPerSentence ? { tag: 'emoji_excess', reasons: { emojis } } : null;
}

function checkCTAPresence(sentence, opts) {
  const ctas = opts.ctaPhrases.filter(p => lower(sentence).includes(p));
  return ctas.length ? { tag: 'cta', reasons: { phrases: ctas } } : null;
}

function checkHedging(sentence, opts) {
  const hedges = opts.hedgeWords.filter(w => new RegExp(`\\b${w}\\b`, 'i').test(sentence));
  return hedges.length ? { tag: 'hedging', reasons: { hedges } } : null;
}

function checkVagueDates(sentence, opts) {
  const hits = opts.vagueDates.filter(w => lower(sentence).includes(w));
  return hits.length ? { tag: 'vague_date', reasons: { hits } } : null;
}

function checkVagueNumbers(sentence) {
  // number without unit or context ("increased by 20" vs "20% MoM" or "$20")
  const numbers = sentence.match(numberRegex) || [];
  const hasUnit = /[%$€£¥]|(per\s+\w+|users|subs|subscribers|customers|orders|impressions|clicks|hrs?|hours?|mins?|minutes?|days?|weeks?|months?|yrs?|years?|kg|km|mb|gb|tb|percent|percentage|dollars?|cents?|image|word|article|post)\b/i.test(sentence);
  
  // Skip if numbers are clearly contextual (dates, versions, IDs, etc.)
  const isContextual = /\b(version|v\d|model|gpt-\w+|\d{4}|\d+\.\d+\.\d+)\b/i.test(sentence);
  
  if (numbers.length && !hasUnit && !isContextual) {
    return { tag: 'vague_number', reasons: { numbers } };
  }
  return null;
}

function checkBaldClaims(sentence, opts) {
  const claimVerb = opts.baldClaimVerbs.some(v => new RegExp(`\\b${v}\\b`, 'i').test(sentence));
  const hasQuant = /(\d+%|\$\d+|\b\d+\b)/.test(sentence);
  const hasSource = /\b(source|study|report|citation|according to|data)\b/i.test(sentence) || urlRegex.test(sentence);
  if (claimVerb && (hasQuant || /guarantee|prove|ensure/i.test(sentence)) && !hasSource) {
    return { tag: 'claim_without_evidence', reasons: { claimVerb, hasQuant, hasSource } };
  }
  return null;
}

// ---------------- NEW: Grammar & Spelling (lightweight) ----------------

// Expanded dictionary to reduce false positives for newsletter/business content
const COMMON_WORDS_MIN = new Set([
  // Basic words
  'the','be','to','of','and','a','in','that','have','i','it','for','not','on','with','he','as','you','do','at',
  'this','but','his','by','from','they','we','say','her','she','or','an','will','my','one','all','would','there',
  'their','what','so','up','out','if','about','who','get','which','go','me','when','make','can','like','time',
  'no','just','him','know','take','people','into','year','your','good','some','could','them','see','other','than',
  'then','now','look','only','come','its','over','think','also','back','after','use','two','how','our','work','first',
  'well','way','even','new','want','because','any','these','give','day','most','us','more','news','email','team',
  'write','reads','reader','content','article','value','update','weekly','daily','today',
  
  // Business/Tech terms commonly used in newsletters
  'api','ai','data','model','models','system','systems','platform','platforms','service','services','tool','tools',
  'user','users','customer','customers','business','businesses','company','companies','product','products',
  'feature','features','launch','launched','launches','launching','release','released','releases','releasing',
  'development','developer','developers','software','technology','technologies','integration','integrations',
  'solution','solutions','workflow','workflows','automation','automate','automated','automating',
  'analytics','analysis','analyze','analyzed','analyzing','optimization','optimize','optimized','optimizing',
  'performance','productivity','efficiency','scalable','scalability','enterprise','enterprises',
  'research','researcher','researchers','study','studies','report','reports','learning','machine',
  'generation','generate','generated','generating','creation','create','created','creating',
  'experience','experiences','interaction','interactions','environment','environments',
  'deployment','deploy','deployed','deploying','operation','operations','operational',
  'include','includes','including','provide','provides','providing','support','supports','supporting',
  'enable','enables','enabling','allow','allows','allowing','describe','describes','describing',
  'increase','increases','increasing','improve','improves','improving','enhancement','enhancements',
  'adoption','adopter','adopters','implementation','implement','implemented','implementing',
  'collaboration','collaborate','collaborating','communication','communicate','communicating',
  'innovation','innovative','revolutionize','revolutionary','transformation','transform','transforming',
  
  // Common words that were being flagged as misspelled
  'starts','started','starting','pricing','safety','secure','security','built-in','builtin',
  'image','images','imaging','feature','features','featured','featuring','quality','qualities',
  'launch','launched','launches','launching','market','markets','marketing','available',
  'access','accessible','accessibility','process','processes','processing','method','methods',
  'result','results','resulting','option','options','optional','version','versions',
  'update','updates','updated','updating','change','changes','changed','changing',
  'manage','manages','managed','managing','management','control','controls','controlled',
  'design','designs','designed','designing','designer','designers','build','builds','building',
  'scale','scales','scaled','scaling','growth','growing','expand','expands','expanded',
  'connect','connects','connected','connecting','connection','connections','network','networks',
  
  // Additional common words that were still being flagged
  'visual','visually','directly','details','detailed','trained','training','static',
  'ability','abilities','pursue','pursuing','agents','digital','specific','within',
  'resolution','resolutions','employees','employee','knowledge','workers','worker',
  'microservices','service','services','first-call','ongoing','interaction',
  'environment','independently','goals','shift','shifts','shifting','earned',
  'medal','mathematical','olympiad','reinforcement','guided','rewards','profit',
  'scores','pursue','long-term','gains','including','increase','describes',
  'meant','support','workflows','businesses','enterprise','operations',
  'deployment','custom','customize','customized','tasks','customer'
]);

// Basic grammar regex patterns (fast, common issues)
const DOUBLE_WORD_RE = /\b(\w+)\s+\1\b/i;                  // "the the"
const BAD_AGREEMENT_RE = /\b(they|we|you)\s+was\b|\b(he|she|it)\s+were\b/i;
const A_AN_RE = /\b(a|an)\s+([aeiouAEIOU]\w*)/g;           // "a example" (should be "an")
const AN_A_RE = /\ban\s+([^aeiouAEIOU\W]\w*)/g;            // "an user" (should be "a")
const ITS_IT_S_RE = /\bits\b(?=\s+\w)|\bit's\b(?=\s+\w)/i; // flags "its/it's" when followed by noun (heuristic)
const PUNCT_SPACE_RE = /\s+[,.!?;:](?!\S)/;                // space before punctuation
const MISSING_SPACE_AFTER_COMMA_RE = /,[^\s\d]/;           // "word,word"

// token-level filters
function shouldSkipToken(tok, opts) {
  // numbers, codes, mixed-case IDs, URLs, emails
  if (opts.skipNonLexical && (/\d/.test(tok) || /[_@/\\]/.test(tok))) return true;
  // allow UPPERCASE acronyms
  if (tok.length <= 5 && tok === tok.toUpperCase()) return true;
  // allow ProperNouns mid-sentence
  if (opts.skipProperNouns && /^[A-Z][a-z]+$/.test(tok)) return true;
  return false;
}

function buildDictionary(opts) {
  if (opts.grammar?.dictionary) {
    if (Array.isArray(opts.grammar.dictionary)) {
      return new Set(opts.grammar.dictionary.map(w => String(w).toLowerCase()));
    }
    // assume Set<string>
    return opts.grammar.dictionary;
  }
  return COMMON_WORDS_MIN;
}

function checkGrammarSpelling(sentence, opts) {
  if (!opts.grammar?.enabled) return null;

  const dict = buildDictionary(opts);
  const words = sentence.match(/\b[A-Za-z][A-Za-z'\-]*\b/g) || [];
  const misspelled = [];

  for (const w of words) {
    if (w.length < opts.grammar.minWordLength) continue;
    if (shouldSkipToken(w, opts.grammar)) continue;
    const base = w.toLowerCase();

    // quick normalizations: strip possessive/apostrophes and hyphens into base forms
    const norm = base.replace(/’/g, "'").replace(/'s$/,'').replace(/-+/g,'');
    if (!dict.has(norm) && !dict.has(base)) {
      misspelled.push(w);
      if (misspelled.length >= opts.grammar.maxMisspellingsListed) break;
    }
  }

  // Grammar pattern checks
  const doubleWord = DOUBLE_WORD_RE.test(sentence);
  const badAgreement = BAD_AGREEMENT_RE.test(sentence);
  const badAAn = (() => {
    const badA = [...sentence.matchAll(A_AN_RE)].some(m => m[1].toLowerCase() === 'a');    // "a apple"
    const badAn = [...sentence.matchAll(AN_A_RE)].length > 0;                               // "an user"
    return badA || badAn;
  })();
  const confusedIts = ITS_IT_S_RE.test(sentence);      // heuristic signal only
  const punctSpace = PUNCT_SPACE_RE.test(sentence);
  const missingSpaceAfterComma = MISSING_SPACE_AFTER_COMMA_RE.test(sentence);

  if (misspelled.length || doubleWord || badAgreement || badAAn || confusedIts || punctSpace || missingSpaceAfterComma) {
    return {
      tag: 'grammar_spelling',
      reasons: {
        misspelled,
        doubleWord,
        badAgreement,
        badArticleAn: badAAn,
        possibleItsError: confusedIts,
        spaceBeforePunctuation: punctSpace,
        missingSpaceAfterComma
      }
    };
  }
  return null;
}

// ---------------- Document-level checks ----------------

// Formatting issues
function detectFormattingIssues(text) {
  const lines = text.split(/\r?\n/);

  const doubleSpaces = (text.match(/ {2,}/g) || []).length;

  const hasStraightSingles = /'/g.test(text);
  const hasStraightDoubles = /"/g.test(text);
  const hasCurlySingles = /[‘’]/g.test(text);
  const hasCurlyDoubles = /[“”]/g.test(text);
  const smartQuotesMix =
    (hasStraightSingles && hasCurlySingles) ||
    (hasStraightDoubles && hasCurlyDoubles);

  // dash usage
  const hyphenCount = (text.match(/-/g) || []).length;
  const enDashCount = (text.match(/–/g) || []).length;
  const emDashCount = (text.match(/—/g) || []).length;
  const dashKindsUsed = [hyphenCount>0, enDashCount>0, emDashCount>0].filter(Boolean).length;
  const inconsistentDashes = dashKindsUsed > 1;

  const trailingSpaces = lines.reduce((n, l) => n + (/[ \t]+$/.test(l) ? 1 : 0), 0);

  const any =
    doubleSpaces > 0 || smartQuotesMix || inconsistentDashes || trailingSpaces > 0;

  return any ? {
    tag: 'formatting_issues',
    reasons: {
      doubleSpaces,
      smartQuotesMix,
      inconsistentDashes: inconsistentDashes ? { hyphenCount, enDashCount, emDashCount } : false,
      trailingSpacesLines: trailingSpaces
    }
  } : null;
}

// Redundant sentences (Jaccard similarity on token sets)
const STOPWORDS = new Set([
  'the','a','an','and','or','but','if','then','so','because','as','of','to','in','on','for',
  'with','by','at','from','that','this','these','those','is','are','was','were','be','been',
  'it','its','you','your','we','our','they','their','i','me','my'
]);

function tokenizeForJaccard(s) {
  return new Set(
    (s.toLowerCase().match(/\b[a-z0-9']+\b/g) || [])
      .filter(w => w.length > 3 && !STOPWORDS.has(w))
  );
}

function jaccard(aSet, bSet) {
  let inter = 0;
  for (const t of aSet) if (bSet.has(t)) inter++;
  const union = aSet.size + bSet.size - inter;
  return union === 0 ? 0 : inter / union;
}

function findRedundantSentences(sentences, opts) {
  const toks = sentences.map(s => tokenizeForJaccard(s));
  const pairs = [];
  for (let i = 0; i < sentences.length; i++) {
    const wi = (sentences[i].match(/\b\w+\b/g) || []).length;
    if (wi < opts.redundancy.minSentenceWords) continue;
    for (let j = i + 1; j < sentences.length; j++) {
      const wj = (sentences[j].match(/\b\w+\b/g) || []).length;
      if (wj < opts.redundancy.minSentenceWords) continue;
      const sim = jaccard(toks[i], toks[j]);
      if (sim >= opts.redundancy.similarityThreshold) {
        pairs.push({ i, j, similarity: +sim.toFixed(2) });
      }
    }
  }
  return pairs.length ? { tag: 'redundant_sentences', reasons: { pairs } } : null;
}

// Readability (Flesch–Kincaid Grade)
function countSyllables(word) {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 0;
  let syl = (w.match(/[aeiouy]+/g) || []).length;
  if (w.endsWith('e')) syl--;
  return Math.max(1, syl);
}
function fleschKincaidGrade(text) {
  const sentences = (text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || []);
  const words = (text.match(/\b[^\s]+\b/g) || []);
  const syllables = words.reduce((n, w) => n + countSyllables(w), 0);
  const S = Math.max(1, sentences.length);
  const W = Math.max(1, words.length);
  const grade = 0.39 * (W / S) + 11.8 * (syllables / W) - 15.59;
  return +grade.toFixed(2);
}

// priority order (include grammar_spelling high up)
const TAG_PRIORITY = [
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
];

function tagSentence(sentence, checks) {
  if (!checks || checks.length === 0) return sentence;
  
  // Apply only the highest priority tag (one tag per sentence)
  const sortedChecks = checks
    .filter(c => c && c.tag)
    .sort((a, b) => {
      const aPriority = TAG_PRIORITY.indexOf(a.tag);
      const bPriority = TAG_PRIORITY.indexOf(b.tag);
      return aPriority - bPriority; // Lower index = higher priority
    });
  
  if (sortedChecks.length > 0) {
    const topCheck = sortedChecks[0];
    return `<${topCheck.tag}>${sentence}</${topCheck.tag}>`;
  }
  
  return sentence;
}

// ---------------- HTML Cleaning Utilities ----------------

function stripHTMLTags(html) {
  // Remove HTML tags but preserve the text content and structure
  return html
    // Replace block elements with proper line breaks
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<p[^>]*>/gi, '')
    .replace(/<div[^>]*>/gi, '')
    .replace(/<h[1-6][^>]*>/gi, '')
    // Remove all other HTML tags but keep the text
    .replace(/<[^>]*>/g, '')
    // Decode HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    // Clean up whitespace while preserving paragraph breaks
    .replace(/\n{3,}/g, '\n\n') // Multiple line breaks to double
    .replace(/[ \t]+/g, ' ') // Multiple spaces to single
    .replace(/\n /g, '\n') // Remove spaces at start of lines
    .trim();
}

// ---------------- Main API ----------------

export function analyzeContent(content, options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // Clean HTML content for analysis only - preserve original for output
  const cleanContent = stripHTMLTags(content);
  console.log('🧹 Cleaned content for analysis:', cleanContent.substring(0, 100) + '...');
  
  const sentences = splitSentences(cleanContent);

  const perSentence = [];
  let annotated = content; // Use original content to preserve formatting
  const seen = new Set();

  sentences.forEach((s) => {
    if (!s) return;
    const key = s; if (seen.has(key)) return;

    const findings = [
      checkSpam(s, opts),
      checkGrammarSpelling(s, opts),  // NEW: grammar & spelling
      checkJargon(s, opts),
      checkFluff(s, opts),
      checkEmojiExcess(s, opts),
      checkCTAPresence(s, opts),
      checkHedging(s, opts),
      checkVagueDates(s, opts),
      checkVagueNumbers(s),
      checkBaldClaims(s, opts)
    ].filter(Boolean);

    const tags = unique(findings.map(f => f.tag));

    if (opts.annotate && tags.length) {
      // Smart replacement: try to find the sentence in original content
      // This handles cases where HTML formatting might slightly change the text
      const cleanSentence = s.trim();
      const escapedSentence = cleanSentence.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      // Try exact match first
      if (annotated.includes(cleanSentence)) {
        annotated = annotated.replace(cleanSentence, tagSentence(cleanSentence, findings));
        seen.add(key);
      } else {
        // Try fuzzy match by looking for the sentence content within HTML
        const words = cleanSentence.split(/\s+/).filter(w => w.length > 2);
        if (words.length >= 3) {
          // Look for a pattern with the first and last few words
          const firstWords = words.slice(0, 2).join('\\s+');
          const lastWords = words.slice(-2).join('\\s+');
          const fuzzyPattern = new RegExp(`${firstWords}[\\s\\S]*?${lastWords}`, 'i');
          
          const match = annotated.match(fuzzyPattern);
          if (match) {
            annotated = annotated.replace(match[0], tagSentence(match[0], findings));
            seen.add(key);
          }
        }
      }
    }

    perSentence.push({
      sentence: s,
      tags,
      reasons: findings.reduce((acc, f) => ({ ...acc, [f.tag]: f.reasons }), {})
    });
  });

  // Global metrics - use original content for link analysis, cleaned content for word count
  const words = wordCount(cleanContent); // Use cleaned content for accurate word count
  const links = (content.match(urlRegex) || []).length; // Use original content to detect links
  const linkDensity = +(((links / Math.max(words,1)) * 100).toFixed(2));

  const longParas = (content.split(/\n{2,}/g) || [])
    .map(p => ({ text: p, words: wordCount(p) }))
    .filter(p => p.words > 120);

  // Document-level flags
  const linkDensityFinding = (() => {
    const per100 = linkDensity;
    return per100 > opts.maxLinksPer100Words
      ? { tag: 'link_density_high', reasons: { links, words, per100 } }
      : null;
  })();

  const formattingIssues = detectFormattingIssues(content);
  const redundancyFinding = findRedundantSentences(sentences, opts);
  const fkGrade = fleschKincaidGrade(content);
  const readabilityFinding = fkGrade > opts.readability.gradeThreshold
    ? { tag: 'readability_grade', reasons: { grade: fkGrade, threshold: opts.readability.gradeThreshold } }
    : null;

  const globalFlags = [
    linkDensityFinding,
    formattingIssues,
    redundancyFinding,
    readabilityFinding
  ].filter(Boolean);

  const global = {
    wordCount: words,
    sentenceCount: sentences.length,
    linkCount: links,
    linkDensityPer100Words: linkDensity,
    longParagraphs: longParas.map(p => p.words),
    readability: { fleschKincaidGrade: fkGrade, threshold: opts.readability.gradeThreshold },
    flags: globalFlags
  };

  return {
    annotated,
    report: {
      perSentence,
      global
    }
  };
}

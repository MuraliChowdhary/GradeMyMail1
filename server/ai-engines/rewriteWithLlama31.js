// file: rewriteWithLlama31.js
// npm i groq-sdk diff
// package.json: { "type": "module" }

import Groq from "groq-sdk";
import { buildEditorSystemPrompt } from "./editorSystemPrompt.js";
import { mapDrafts } from "./diffMap.js";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Choose a valid Groq model slug available to your account
const DEFAULT_MODEL = process.env.GROQ_LLM_MODEL || "llama-3.1-8b-instant";

// Tone presets for your dropdown
export const TONES = {
  professional: "Professional & formal",
  friendly: "Friendly & conversational",
  persuasive: "Persuasive & motivational",
  analytical: "Analytical & insight-driven",
  storytelling: "Storytelling with light anecdotes",
};

function buildUserPrompt({ originalText, analysis = {}, suggestions = [] }) {
  const { readabilityGrade, audienceFit, toneScore, clarity, engagement, spamRisk } = analysis;

  const stats = [
    ["ReadabilityGrade", readabilityGrade],
    ["AudienceFit", audienceFit],
    ["ToneScore", toneScore],
    ["Clarity", clarity],
    ["Engagement", engagement],
    ["SpamRisk", spamRisk],
  ]
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `- ${k}: ${v}`)
    .join("\n");

  const tips =
    suggestions?.length
      ? suggestions.map((s) => `- ${s}`).join("\n")
      : [
          "- Break up long paragraphs for readability",
          "- Replace vague claims with concrete numbers/examples",
          "- Keep all important facts intact",
        ].join("\n");

  return `
ANALYSIS STATS
${stats || "(none provided)"}

IMPROVEMENT TIPS
${tips}

INSTRUCTIONS
- Apply the tips above.
- Lower the reading level to middle-school range.
- Preserve factual details.
- Return ONLY the fully rewritten draft. No commentary.

ORIGINAL TEXT
${originalText}
  `.trim();
}

/**
 * Main entry: rewrite using Llama 3.1 on Groq.
 * Returns both the rewritten draft and a mapping for UI diff.
 */
export async function rewriteWithLlama31({
  originalText,
  analysis = {},
  suggestions = [],
  toneKey = "friendly",
  options = {},
}) {
  if (!process.env.GROQ_API_KEY) throw new Error("Missing GROQ_API_KEY.");
  if (!originalText?.trim()) throw new Error("originalText is required.");

  const {
    model = DEFAULT_MODEL,
    temperature = 0.65,
    maxTokens = 1200,
    targetGradeLow = 6,
    targetGradeHigh = 9,
  } = options;

  const systemPrompt = buildEditorSystemPrompt({
    toneLabel: TONES[toneKey] || TONES.friendly,
    targetGradeLow,
    targetGradeHigh,
  });

  const userPrompt = buildUserPrompt({ originalText, analysis, suggestions });

  const completion = await groq.chat.completions.create({
    model,
    temperature,
    max_tokens: maxTokens,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  const rewritten = completion?.choices?.[0]?.message?.content?.trim() || "";
  const mappings = mapDrafts(originalText, rewritten);
  return { rewritten, mappings };
}

// For your tone selector
export function getToneOptions() {
  return Object.entries(TONES).map(([key, label]) => ({ key, label }));
}

// Optional CLI demo
if (import.meta.main) {
  (async () => {
    const demoText = `
Nvidia launched NeMo microservices for enterprises to build and customize AI agents.
Early adopters reported faster support response and a 50% jump in first-call resolution.
These agents support knowledge workers and automate routine workflows at scale.
`;
    const demoAnalysis = {
      readabilityGrade: 22.6,
      audienceFit: 75,
      toneScore: 80,
      clarity: 90,
      engagement: 60,
      spamRisk: 10,
    };
    const demoSuggestions = [
      "Add a concrete anecdote or mini-case study.",
      "Quantify benefits (e.g., % time saved, cost reduction).",
      "Split into short paragraphs for scannability.",
    ];

    const { rewritten, mappings } = await rewriteWithLlama31({
      originalText: demoText,
      analysis: demoAnalysis,
      suggestions: demoSuggestions,
      toneKey: "friendly",
      options: { temperature: 0.6, targetGradeLow: 6, targetGradeHigh: 9 },
    });

    console.log("\n--- REWRITTEN ---\n", rewritten);
    console.log("\n--- MAPPINGS (first 3) ---\n", mappings.slice(0, 3));
  })().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
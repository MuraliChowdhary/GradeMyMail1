// file: utils/diffMap.js
// npm i diff
import { diffSentences, diffWords } from "diff";

/**
 * Produce a deterministic mapping for side-by-side rendering:
 *  - unchanged: identical sentence both sides
 *  - changed:   old→new (with wordDiff)
 *  - inserted:  new sentence (no left)
 *  - deleted:   old sentence (no right)
 */
export function mapDrafts(oldText, newText) {
  const sentenceDiff = diffSentences(normalize(oldText), normalize(newText));
  const mappings = [];
  let pendingRemoved = null;

  for (const part of sentenceDiff) {
    if (part.removed) {
      pendingRemoved = part.value;
    } else if (part.added) {
      const oldSentence = pendingRemoved ?? "";
      const newSentence = part.value;
      mappings.push({
        type: oldSentence ? "changed" : "inserted",
        old: oldSentence,
        new: newSentence,
        wordDiff: diffWords(oldSentence, newSentence),
      });
      pendingRemoved = null;
    } else {
      splitSentences(part.value).forEach((s) =>
        mappings.push({ type: "unchanged", old: s, new: s, wordDiff: null })
      );
    }
  }

  if (pendingRemoved) {
    mappings.push({ type: "deleted", old: pendingRemoved, new: "", wordDiff: null });
  }

  return mappings;
}

// Helpers
function splitSentences(block) {
  return block.split(/(?<=[.!?])\s+/).filter(Boolean);
}
function normalize(s) {
  return (s || "")
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/[ \t]+\./g, ".")
    .trim();
}

// Optional HTML renderer for word-level diffs
export function renderWordDiff(wordDiff) {
  if (!wordDiff) return "";
  return wordDiff
    .map((w) => {
      if (w.added) return `<ins>${escapeHtml(w.value)}</ins>`;
      if (w.removed) return `<del>${escapeHtml(w.value)}</del>`;
      return `<span>${escapeHtml(w.value)}</span>`;
    })
    .join("");
}

function escapeHtml(s) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}
/**
 * AI Semantic Verdict — Prompt Builder & Streaming Interface
 *
 * DAA/DMSC Concept: Finite Automaton for text streaming
 * The streaming response is modeled as a push-automaton:
 * each chunk event drives a state transition in the UI,
 * building output incrementally (like a tape in a Turing machine).
 *
 * @module lib/ai/semanticVerdict
 */

/**
 * Build a structured prompt for the AI semantic verdict panel.
 * The prompt encodes algorithmic findings into structured context
 * so the AI can reason about structural vs. semantic similarity.
 *
 * @param {object} params
 * @param {number} params.score      - LCS similarity score (0–100)
 * @param {string} params.verdict    - 'Safe' | 'Suspicious' | 'Blatant'
 * @param {number} params.lcsLength  - Length of the LCS bigram sequence
 * @param {string} params.dpTableSize - e.g. "12 × 14 blocks"
 * @param {number} params.tedDistance - Tree Edit Distance result
 * @param {number} params.collisions  - Number of Rabin-Karp hash collisions
 * @param {string[]} params.commonTokens - Common bigram token list
 * @returns {string} Formatted prompt string
 */
export function buildSemanticPrompt({
  score,
  verdict,
  lcsLength,
  dpTableSize,
  tedDistance,
  collisions,
  commonTokens = [],
}) {
  const topTokens = commonTokens.slice(0, 8).join(', ');

  return `You are ASTGuard's Semantic Analysis Engine. A structural plagiarism scan has completed. Provide a concise, expert-level analysis in 3–4 sentences. Use technical language appropriate for a DAA/algorithms course presentation.

ANALYSIS RESULTS:
- LCS Similarity Score: ${score.toFixed(1)}%
- Verdict: ${verdict}
- LCS Bigram Length: ${lcsLength} shared structural bigrams
- DP Table Dimensions: ${dpTableSize}
- Tree Edit Distance: ${tedDistance} operations
- Rabin-Karp Hash Collisions: ${collisions} structural fingerprint matches
- Sample Common Structural Tokens: ${topTokens || 'none'}

Based on these DAA algorithm results, explain:
1. What the structural similarity score indicates at the AST level
2. Whether the Tree Edit Distance corroborates or contradicts the LCS verdict
3. Whether the Rabin-Karp collisions suggest localized or distributed copying
4. Your final semantic verdict, citing specific algorithmic evidence

Be precise, cite the numbers, and avoid generic phrases.`;
}

/**
 * Simulate AI streaming response using chunked text delivery.
 * In production this would connect to an LLM API with streaming.
 * For demo purposes, this generates a deterministic analytical response.
 *
 * @param {object} analysisData - Same params as buildSemanticPrompt
 * @param {function} onChunk   - Callback for each streamed text chunk
 * @param {function} onDone    - Called when stream completes
 * @returns {function} cleanup/abort function
 */
export function streamSemanticVerdict(analysisData, onChunk, onDone) {
  const { score, verdict, lcsLength, tedDistance, collisions, commonTokens = [] } = analysisData;

  const responses = {
    Safe: [
      `Structural analysis yields an LCS similarity of ${score.toFixed(1)}%, well below the 30% suspicion threshold. `,
      `The DP table resolved ${lcsLength} common bigrams across ${analysisData.dpTableSize}, indicating isolated overlap on common Python idioms rather than systematic copying. `,
      `Tree Edit Distance of ${tedDistance} operations corroborates structural divergence — the two submissions require substantial transformation to align. `,
      `With only ${collisions} Rabin-Karp fingerprint collision${collisions !== 1 ? 's' : ''}, the evidence points to independently authored solutions. `,
      `Semantic verdict: CLEAN. The observed overlap is consistent with shared domain knowledge (e.g., both use loops and conditionals) rather than plagiarism.`,
    ],
    Suspicious: [
      `The LCS algorithm recovered ${lcsLength} shared structural bigrams, yielding a ${score.toFixed(1)}% similarity score in the suspicious range (30–77%). `,
      `The DP table (${analysisData.dpTableSize}) shows non-trivial alignment, particularly at top-level function boundaries — a pattern consistent with partial structural copying. `,
      `Tree Edit Distance of ${tedDistance} indicates moderate structural divergence, suggesting the original may have been restructured (e.g., loop-to-comprehension conversion) to obscure copying. `,
      `${collisions} Rabin-Karp hash collision${collisions !== 1 ? 's' : ''} confirm localized fingerprint matches on windows including: ${commonTokens.slice(0, 3).join(', ') || 'control-flow sequences'}. `,
      `Semantic verdict: REVIEW REQUIRED. The algorithm evidence warrants manual inspection of the flagged structural regions.`,
    ],
    Blatant: [
      `Critical finding: the LCS algorithm extracted ${lcsLength} shared bigrams with a ${score.toFixed(1)}% Sørensen-Dice similarity — approaching the theoretical maximum for structurally equivalent programs. `,
      `The full DP table (${analysisData.dpTableSize}) shows near-diagonal alignment, meaning almost every structural token pair matches in sequence — the hallmark of identifier-renamed plagiarism. `,
      `Tree Edit Distance of ${tedDistance} is minimal, confirming the AST structures require almost no transformation to become identical. Only surface-level mutations (variable renaming, literal substitution) separate the two submissions. `,
      `${collisions} Rabin-Karp structural fingerprint collision${collisions !== 1 ? 's' : ''} confirm systematic copying across multiple code windows. `,
      `Semantic verdict: HIGH CONFIDENCE PLAGIARISM DETECTED. The algorithmic trifecta — LCS DP, Tree Edit Distance, and Rabin-Karp hashing — all independently converge on the same conclusion.`,
    ],
  };

  const chunks = responses[verdict] || responses['Safe'];
  let index = 0;
  let charIndex = 0;
  let cancelled = false;
  let timeoutId;

  function streamNext() {
    if (cancelled) return;
    if (index >= chunks.length) {
      onDone?.();
      return;
    }

    const chunk = chunks[index];
    if (charIndex < chunk.length) {
      // Stream char-by-char for typewriter effect
      onChunk(chunk[charIndex]);
      charIndex++;
      timeoutId = setTimeout(streamNext, 18 + Math.random() * 12);
    } else {
      index++;
      charIndex = 0;
      timeoutId = setTimeout(streamNext, 80);
    }
  }

  // Begin streaming after a brief "thinking" delay
  timeoutId = setTimeout(streamNext, 800);

  return () => {
    cancelled = true;
    clearTimeout(timeoutId);
  };
}

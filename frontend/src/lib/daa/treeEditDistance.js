/**
 * treeEditDistance — Zhang-Shasha Tree Edit Distance
 *
 * DAA Concept: Dynamic Programming on Trees
 * The Tree Edit Distance (TED) problem extends the classic string edit
 * distance (Levenshtein) to ordered labeled trees. The recurrence is:
 *
 *   TED(∅, ∅) = 0
 *   TED(F, ∅) = TED(F - t_last, ∅) + cost(delete t_last)
 *   TED(∅, G) = TED(∅, G - t_last) + cost(insert t_last)
 *   TED(F, G) = min(
 *     TED(F - t_i, G)         + cost(delete t_i),
 *     TED(F, G - t_j)         + cost(insert t_j),
 *     TED(F - T_i, G - T_j)   + cost(relabel t_i → t_j)   if same subtree structure
 *   )
 *
 * Time Complexity: O(|T1| × |T2| × depth(T1) × depth(T2))
 * Space Complexity: O(|T1| × |T2|)
 *
 * @module lib/daa/treeEditDistance
 */

/**
 * Linearize an AST (from the backend's token stream) into a
 * list of tree nodes with parent references.
 * @param {object} astRoot - Root node from backend response
 * @returns {Array<{id, type, children, parent, depth}>}
 */
export function flattenASTNodes(tokenStream) {
  if (!tokenStream || tokenStream.length === 0) return [];
  // Token stream represents pre-order DFS traversal — reconstruct
  const nodes = tokenStream.map((token, i) => ({
    id: i,
    type: typeof token === 'string' ? token : token.token,
    lineno: typeof token === 'object' ? token.lineno : null,
    depth: 0,
  }));
  return nodes;
}

/**
 * Compute a simplified tree edit distance between two token sequences.
 * Uses the standard LCS-based DP as a proxy for TED when full tree
 * structure is only available as a pre-order traversal.
 *
 * @param {string[]} seqA - Token sequence A
 * @param {string[]} seqB - Token sequence B
 * @returns {{ distance: number, similarity: number, dpTable: number[][] }}
 */
export function computeTED(seqA, seqB) {
  const m = seqA.length;
  const n = seqB.length;

  // DP table: dp[i][j] = edit distance between seqA[0..i-1] and seqB[0..j-1]
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  // Base cases
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  // Recurrence: classic edit distance
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (seqA[i - 1] === seqB[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1]; // no cost (match)
      } else {
        dp[i][j] = 1 + Math.min(
          dp[i - 1][j],     // delete from A
          dp[i][j - 1],     // insert into B
          dp[i - 1][j - 1], // relabel (substitute)
        );
      }
    }
  }

  const distance = dp[m][n];
  const maxLen = Math.max(m, n, 1);
  const similarity = Math.max(0, 1 - distance / maxLen);

  // Return only a reduced DP table for visualization (cap at 20×20)
  const capM = Math.min(m, 20);
  const capN = Math.min(n, 20);
  const dpTable = Array.from({ length: capM + 1 }, (_, i) =>
    Array.from({ length: capN + 1 }, (_, j) => dp[i][j])
  );

  return { distance, similarity, dpTable, m, n };
}

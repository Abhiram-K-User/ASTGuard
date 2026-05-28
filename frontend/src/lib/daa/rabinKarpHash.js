/**
 * rabinKarpHash — Structural Rolling Hash
 *
 * DAA Concept: Rabin-Karp Algorithm / Rolling Hash
 * Rabin-Karp uses a polynomial rolling hash to find pattern matches
 * in O(n + m) expected time:
 *
 *   H(s) = (s[0]·p^(n-1) + s[1]·p^(n-2) + … + s[n-1]·p^0) mod M
 *
 * Rolling update (sliding window of size w):
 *   H_new = (H_old - s[i]·p^(w-1)) · p + s[i+w]   (mod M)
 *
 * When applied to AST token sequences (where each token maps to an
 * integer), the hash groups structurally identical sub-programs even
 * if identifier names differ — forming "hash collision groups" that
 * expose plagiarism clusters.
 *
 * Time Complexity: O(n + m)  — one pass over the token stream
 * Space Complexity: O(n)     — one hash per position
 *
 * @module lib/daa/rabinKarpHash
 */

const BASE = 31;
const MOD  = 1_000_003; // Large prime to minimize collisions

// Build a canonical integer mapping for AST node types
let _tokenMap = {};
let _tokenCounter = 1;
function tokenToInt(tok) {
  if (!_tokenMap[tok]) _tokenMap[tok] = _tokenCounter++;
  return _tokenMap[tok];
}

/**
 * Compute Rabin-Karp rolling hashes for all windows of size `w`
 * in the given token sequence.
 *
 * @param {string[]} tokens - AST structural token sequence
 * @param {number}   w      - Window size (sub-sequence length)
 * @returns {Array<{ hash: number, start: number, window: string[] }>}
 */
export function rollingHashes(tokens, w = 3) {
  if (tokens.length < w) return [];

  const ints = tokens.map(tokenToInt);
  const results = [];

  // Precompute p^(w-1) mod M
  let pw = 1;
  for (let i = 0; i < w - 1; i++) pw = (pw * BASE) % MOD;

  // Compute first window hash
  let h = 0;
  for (let i = 0; i < w; i++) {
    h = (h * BASE + ints[i]) % MOD;
  }
  results.push({ hash: h, start: 0, window: tokens.slice(0, w) });

  // Roll the hash over the rest
  for (let i = w; i < ints.length; i++) {
    h = (h - ints[i - w] * pw % MOD + MOD) % MOD;
    h = (h * BASE + ints[i]) % MOD;
    results.push({ hash: h, start: i - w + 1, window: tokens.slice(i - w + 1, i + 1) });
  }

  return results;
}

/**
 * Group rolling hash results by hash value to find structural duplicates.
 * Each group represents code windows with identical structural patterns.
 *
 * @param {ReturnType<typeof rollingHashes>} hashesA
 * @param {ReturnType<typeof rollingHashes>} hashesB
 * @returns {Array<{ hash: number, groupA: number[], groupB: number[], size: number }>}
 */
export function buildCollisionMap(hashesA, hashesB) {
  const mapA = new Map();
  for (const { hash, start } of hashesA) {
    if (!mapA.has(hash)) mapA.set(hash, []);
    mapA.get(hash).push(start);
  }

  const collisions = [];
  const seen = new Set();

  for (const { hash, start } of hashesB) {
    if (mapA.has(hash) && !seen.has(hash)) {
      seen.add(hash);
      collisions.push({
        hash,
        groupA: mapA.get(hash),
        groupB: [start],
        size: mapA.get(hash).length + 1,
        label: `0x${hash.toString(16).toUpperCase().slice(-4)}`,
      });
    } else if (mapA.has(hash) && seen.has(hash)) {
      const existing = collisions.find(c => c.hash === hash);
      if (existing && !existing.groupB.includes(start)) {
        existing.groupB.push(start);
        existing.size++;
      }
    }
  }

  // Sort by collision size (most suspicious first)
  return collisions.sort((a, b) => b.size - a.size);
}

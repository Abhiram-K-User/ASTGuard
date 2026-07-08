import { API_BASE } from '../constants';

/**
 * POST /api/compare
 * Sends two code snippets to the backend for AST + LCS analysis.
 * @returns {Promise<object>} CompareResponse
 */
export async function compareCode(codeA, codeB, language = 'python') {
  const res = await fetch(`${API_BASE}/api/compare`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code_a: codeA, code_b: codeB, language }),
  });

  const data = await res.json();

  if (!res.ok) {
    // Surface structured error from FastAPI
    const detail = data.detail;
    if (typeof detail === 'object' && detail.message) {
      throw new Error(detail.message + ' | A: ' + detail.error_a + ' | B: ' + detail.error_b);
    }
    throw new Error(typeof detail === 'string' ? detail : `HTTP ${res.status}`);
  }

  return data;
}

/**
 * GET /api/examples
 * Fetches built-in demonstration code pairs from the backend.
 * @returns {Promise<Array>} List of example objects
 */
export async function fetchExamples() {
  const res = await fetch(`${API_BASE}/api/examples`);
  if (!res.ok) throw new Error('Could not load examples');
  const data = await res.json();
  return data.examples;
}

# =============================================================================
# Code Plagiarism Detection Backend
# =============================================================================
# Author  : Senior Software Engineer (DAA Specialization)
# Tech    : Python 3.10+ | FastAPI | Python's native `ast` module
# Purpose : Detect structural plagiarism in Python code submissions by comparing
#           Abstract Syntax Trees (ASTs) using the LCS Dynamic Programming
#           algorithm on BIGRAM token sequences.
#
# Core DAA Paradigm : Dynamic Programming
# Algorithm         : LCS on normalised AST bigram streams
# Time Complexity   : O(m x n)  -- m, n are lengths of the bigram sequences
# Space Complexity  : O(m x n)  -- for the DP table
#
# Why bigrams instead of unigrams?
# Python's structural vocabulary contains only ~40 node types. Any two
# non-trivial programs naturally share tokens like FunctionDef, For, If,
# Return just because they are Python programs -- causing unigram LCS to
# report false-positive Suspicious scores on completely different code.
#
# Bigrams (consecutive token pairs, e.g. FunctionDef->For) expand the
# effective vocabulary to ~40^2 = 1600 possible combinations. Two programs
# must share the same local ordering of structural operations to match,
# which is a far stricter condition and eliminates the false-positive problem.
# =============================================================================

import ast
import logging
import time
from typing import Any

import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from tree_sitter_languages import get_parser

# ---------------------------------------------------------------------------
# Logging Configuration
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# FastAPI Application Instance
# ---------------------------------------------------------------------------
app = FastAPI(
    title="Code Plagiarism Detector",
    description=(
        "Detects structural code plagiarism by extracting AST node-type "
        "sequences and comparing them using the LCS Dynamic Programming algorithm."
    ),
    version="2.0.0",
)

# ---------------------------------------------------------------------------
# CORS Middleware — allows the single-file HTML frontend to call this API
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],      # Tighten to specific origin in production
    allow_methods=["*"],
    allow_headers=["*"],
)

# ===========================================================================
# SECTION 1 — DATA MODELS (Pydantic Schemas)
# ===========================================================================

class CompareRequest(BaseModel):
    """Request payload carrying two code snippets to compare."""
    code_a: str
    code_b: str
    language: str = "python"
    label_a: str = "Student A"
    label_b: str = "Student B"


class TokenDetail(BaseModel):
    """A single AST structural token extracted from a code submission."""
    token: str           # Node-type name, e.g. "FunctionDef", "For", "If"
    lineno: int | None   # Source line number (for highlighting)


class CompareResponse(BaseModel):
    """Full analysis result returned to the frontend."""
    similarity_score: float           # 0.0 – 100.0
    verdict: str                      # "Safe", "Suspicious", "Blatant"
    lcs_length: int                   # Length of the common bigram subsequence
    tokens_a: list[str]               # Normalised unigram token stream for code A (for display)
    tokens_b: list[str]               # Normalised unigram token stream for code B (for display)
    tokens_a_detail: list[TokenDetail]
    tokens_b_detail: list[TokenDetail]
    common_tokens: list[str]          # LCS bigram sequence (e.g. "FunctionDef→For")
    dp_table_size: str                # e.g. "41 × 37" — bigram sequence lengths
    time_ms: float                    # Wall-clock time of DP computation
    ngram_size: int = 2              # N-gram window used for comparison
    error_a: str | None = None        # Syntax error message for code A, if any
    error_b: str | None = None        # Syntax error message for code B, if any


# ===========================================================================
# SECTION 2 — AST PARSER & NORMALISER
# ===========================================================================

# Node types that carry meaningful *structural* information.
# We intentionally EXCLUDE leaf nodes that only carry identifiers or literals
# (Name, Constant, Str, Num, Bytes, NameConstant, Ellipsis) so that a student
# who merely renames variables or changes magic numbers cannot fool the detector.
STRUCTURAL_NODES: frozenset[str] = frozenset({
    # ── Statements ──────────────────────────────────────────────────────────
    "FunctionDef", "AsyncFunctionDef", "ClassDef",
    "Return", "Delete", "Assign", "AugAssign", "AnnAssign",
    "For", "AsyncFor", "While", "If", "With", "AsyncWith",
    "Match",                     # Python 3.10+ structural pattern matching
    "Raise", "Try", "TryStar",   # TryStar = `except*` (Python 3.11+)
    "ExceptHandler",
    "Import", "ImportFrom",
    "Global", "Nonlocal",
    "Pass", "Break", "Continue",
    # ── Expressions ─────────────────────────────────────────────────────────
    "BoolOp", "NamedExpr", "BinOp", "UnaryOp", "Lambda",
    "IfExp", "Dict", "Set", "ListComp", "SetComp", "DictComp",
    "GeneratorExp", "Await", "Yield", "YieldFrom",
    "Compare", "Call", "JoinedStr",           # JoinedStr = f-string
    "Attribute", "Subscript", "Starred",
    "List", "Tuple",
    # ── Pattern nodes (Python 3.10+) ────────────────────────────────────────
    "MatchValue", "MatchSingleton", "MatchSequence",
    "MatchMapping", "MatchClass", "MatchStar",
    "MatchAs", "MatchOr",
})


class ASTNormaliser(ast.NodeVisitor):
    """
    Walks a Python AST in a depth-first, left-to-right (pre-order) traversal
    and collects a *structural* token stream.

    Design decisions
    ----------------
    * Only node *types* from STRUCTURAL_NODES are recorded — not names or
      values — making the stream invariant under identifier renaming and
      literal substitution.
    * The traversal order is deterministic (mirrors source order) so that
      two structurally identical programs produce identical token sequences
      even if the variable names differ.
    * Docstrings are ignored (the first Expr/Constant child of a function or
      class body is skipped).
    """

    def __init__(self) -> None:
        self.tokens: list[str] = []
        self.token_details: list[TokenDetail] = []

    def _get_custom_type(self, node: ast.AST) -> str:
        node_type = type(node).__name__
        if isinstance(node, ast.Compare):
            op_symbols = {
                ast.Lt: "<", ast.Gt: ">", ast.LtE: "<=", ast.GtE: ">=",
                ast.Eq: "==", ast.NotEq: "!=", ast.Is: "is", ast.IsNot: "is not",
                ast.In: "in", ast.NotIn: "not in"
            }
            op_sym = "?"
            if node.ops:
                op_sym = op_symbols.get(type(node.ops[0]), "?")
            return f"Compare({op_sym})"
        elif isinstance(node, ast.BinOp):
            op_map = {
                ast.Add: "+", ast.Sub: "-", ast.Mult: "*", ast.Div: "/",
                ast.Mod: "%", ast.FloorDiv: "//", ast.Pow: "**",
                ast.LShift: "<<", ast.RShift: ">>",
                ast.BitOr: "|", ast.BitAnd: "&", ast.BitXor: "^",
                ast.MatMult: "@"
            }
            op_sym = op_map.get(type(node.op), "?")
            return f"BinOp({op_sym})"
        elif isinstance(node, ast.UnaryOp):
            op_map = {
                ast.UAdd: "+", ast.USub: "-", ast.Not: "not", ast.Invert: "~"
            }
            op_sym = op_map.get(type(node.op), "?")
            return f"UnaryOp({op_sym})"
        elif isinstance(node, ast.Subscript):
            is_adjacent = False
            slice_node = node.slice
            def has_add_sub(n) -> bool:
                if isinstance(n, ast.BinOp) and type(n.op) in [ast.Add, ast.Sub]:
                    return True
                for child in ast.iter_child_nodes(n):
                    if has_add_sub(child):
                        return True
                return False
            if slice_node and has_add_sub(slice_node):
                is_adjacent = True
            return f"Subscript({'Adjacent' if is_adjacent else 'Indexed'})"
        elif isinstance(node, ast.BoolOp):
            op_sym = "And" if isinstance(node.op, ast.And) else "Or"
            return f"BoolOp({op_sym})"
        return node_type

    def _record(self, node: ast.AST) -> None:
        """Append the node type to the token stream if it is structural."""
        node_type = type(node).__name__
        if node_type in STRUCTURAL_NODES:
            custom_type = self._get_custom_type(node)
            lineno: int | None = getattr(node, "lineno", None)
            self.tokens.append(custom_type)
            self.token_details.append(TokenDetail(token=custom_type, lineno=lineno))

    def generic_visit(self, node: ast.AST) -> None:
        """Override to record before descending (pre-order traversal)."""
        self._record(node)
        super().generic_visit(node)


def parse_and_normalise(source: str) -> tuple[list[str], list[TokenDetail], str | None]:
    """
    Parse Python *source* code and return its normalised structural token stream.

    Parameters
    ----------
    source : str
        Raw Python source code submitted by a student.

    Returns
    -------
    tokens       : list[str]         — Structural node-type sequence.
    token_details: list[TokenDetail] — Tokens annotated with source line numbers.
    error        : str | None        — Human-readable syntax error, or None.

    Notes
    -----
    We use `ast.parse()` which is part of Python's standard library — no third-
    party parser is needed.  The `type_comments=True` flag is omitted to stay
    compatible with code that has no type annotations.
    """
    try:
        tree = ast.parse(source, mode="exec")
    except SyntaxError as exc:
        msg = f"SyntaxError at line {exc.lineno}: {exc.msg}"
        logger.warning("Parse failure: %s", msg)
        return [], [], msg
    except Exception as exc:
        msg = f"Parse error: {exc}"
        logger.error("Unexpected parse error: %s", msg)
        return [], [], msg

    normaliser = ASTNormaliser()
    normaliser.visit(tree)
    logger.info("Parsed %d structural tokens.", len(normaliser.tokens))
    return normaliser.tokens, normaliser.token_details, None


# ── Tree-Sitter Unified Mapping for Multi-Language Support ──────────────────
TS_TO_AST_MAP: dict[str, str] = {
    "function_definition": "FunctionDef",
    "method_declaration": "FunctionDef",
    "class_declaration": "ClassDef",
    "struct_specifier": "ClassDef",
    "if_statement": "If",
    "for_statement": "For",
    "while_statement": "While",
    "do_statement": "While",
    "try_statement": "Try",
    "catch_clause": "ExceptHandler",
    "return_statement": "Return",
    "throw_statement": "Raise",
    "break_statement": "Break",
    "continue_statement": "Continue",
    "binary_expression": "BinOp",
    "unary_expression": "UnaryOp",
    "update_expression": "AugAssign",
    "assignment_expression": "Assign",
    "call_expression": "Call",
    "method_invocation": "Call",
    "subscript_expression": "Subscript",
    "array_access": "Subscript",
    "field_expression": "Attribute",
    "member_expression": "Attribute",
    "pointer_expression": "Starred",
}


def ts_has_add_sub(node) -> bool:
    """Helper to check if a tree-sitter index node contains dynamic offsets (+ or -)."""
    if node.type == "binary_expression":
        for child in node.children:
            if child.type in ["+", "-"]:
                return True
    for child in node.children:
        if ts_has_add_sub(child):
            return True
    return False


def parse_and_normalise_tree_sitter(
    source: str, language: str
) -> tuple[list[str], list[TokenDetail], str | None]:
    """
    Parse C/C++/Java source code using tree-sitter, mapping structural nodes
    to a unified token list.
    """
    try:
        parser = get_parser(language)
    except Exception as exc:
        msg = f"Failed to load parser for '{language}': {exc}"
        logger.error(msg)
        return [], [], msg

    try:
        tree = parser.parse(bytes(source, "utf8"))
    except Exception as exc:
        msg = f"Parse error: {exc}"
        logger.error(msg)
        return [], [], msg

    root_node = tree.root_node

    if root_node.has_error:
        # Find first ERROR node and report its line
        error_lines: list[int] = []

        def walk_errors(n) -> None:
            if n.type == "ERROR":
                error_lines.append(n.start_point[0] + 1)
            for child in n.children:
                walk_errors(child)

        walk_errors(root_node)
        line_num = error_lines[0] if error_lines else 1
        msg = f"SyntaxError at line {line_num}: Syntax errors detected by parser."
        logger.warning("Parse failure: %s", msg)
        return [], [], msg

    tokens: list[str] = []
    token_details: list[TokenDetail] = []

    def traverse(node) -> None:
        if node.type in TS_TO_AST_MAP:
            mapped_type = TS_TO_AST_MAP[node.type]
            if node.type == "binary_expression":
                op_node = None
                for child in node.children:
                    if not child.is_named:
                        op_node = child
                        break
                op_sym = op_node.type if op_node else "?"
                if op_sym in ["<", "<=", ">", ">=", "==", "!="]:
                    mapped_type = f"Compare({op_sym})"
                elif op_sym in ["&&", "||"]:
                    mapped_type = f"BoolOp({'And' if op_sym == '&&' else 'Or'})"
                else:
                    mapped_type = f"BinOp({op_sym})"
            elif node.type == "unary_expression":
                op_node = None
                for child in node.children:
                    if not child.is_named:
                        op_node = child
                        break
                op_sym = op_node.type if op_node else "?"
                mapped_type = f"UnaryOp({op_sym})"
            elif node.type in ["subscript_expression", "array_access"]:
                is_adjacent = ts_has_add_sub(node)
                mapped_type = f"Subscript({'Adjacent' if is_adjacent else 'Indexed'})"
            
            lineno = node.start_point[0] + 1
            tokens.append(mapped_type)
            token_details.append(TokenDetail(token=mapped_type, lineno=lineno))
        for child in node.children:
            traverse(child)

    traverse(root_node)
    logger.info("Parsed %d structural tree-sitter tokens.", len(tokens))
    return tokens, token_details, None


def to_ngrams(seq: list[str], n: int = 2) -> list[str]:
    """
    Convert a flat structural token stream into a sequence of n-gram strings.

    Purpose
    -------
    Unigram LCS suffers from a fundamental false-positive problem: Python's
    structural vocabulary is small (~40 node types), so any two programs that
    use functions, loops, and conditions will share many individual tokens by
    coincidence.  Using n-grams (typically bigrams, n=2) captures the *local
    ordering* of consecutive structural operations, making matches meaningful:

        Unigram stream : ["FunctionDef", "For", "If", "Return"]
        Bigram stream  : ["FunctionDef→For", "For→If", "If→Return"]

    Two programs must have the *same sequence of adjacent node pairs* to score
    highly, which is a far stricter condition.

    Complexity
    ----------
    Time  : O(|seq|)  — single linear pass.
    Space : O(|seq|)  — output list has |seq| − n + 1 elements.

    Fallback
    --------
    If len(seq) < n (code is so short it has fewer tokens than the window),
    the raw unigram sequence is returned unchanged so very tiny snippets are
    still compared rather than silently returning an empty list.

    Parameters
    ----------
    seq : list[str]
        Normalised structural token stream produced by ASTNormaliser.
    n   : int
        Window size.  n=2 (bigram) is the default and recommended value.

    Returns
    -------
    list[str]
        N-gram strings joined by '→', e.g. "FunctionDef→For".
    """
    if len(seq) < n:
        return seq  # Graceful fallback for very short snippets
    return [
        "\u2192".join(seq[i : i + n])   # '→' (U+2192) as separator
        for i in range(len(seq) - n + 1)
    ]


# ===========================================================================
# SECTION 3 — CORE DP ALGORITHM: LONGEST COMMON SUBSEQUENCE
# ===========================================================================

def compute_lcs(
    seq_a: list[str],
    seq_b: list[str],
) -> tuple[int, list[str]]:
    """
    Compute the Longest Common Subsequence (LCS) of two token sequences using
    classic bottom-up Dynamic Programming.

    ────────────────────────────────────────────────────────────────────────
    Mathematical Recurrence Relation
    ────────────────────────────────────────────────────────────────────────
    Let  A = a₁ a₂ … aₘ   and   B = b₁ b₂ … bₙ  be the two sequences.
    Define  dp[i][j]  as the length of the LCS of the prefixes A[1..i]
    and B[1..j].

        Base case:
            dp[0][j] = 0   for all j ∈ [0..n]
            dp[i][0] = 0   for all i ∈ [0..m]

        Recurrence:
            if A[i] == B[j]:
                dp[i][j] = dp[i-1][j-1] + 1          ← characters match
            else:
                dp[i][j] = max(dp[i-1][j], dp[i][j-1]) ← skip one character

    The answer is dp[m][n].

    ────────────────────────────────────────────────────────────────────────
    Complexity Analysis
    ────────────────────────────────────────────────────────────────────────
    Time Complexity  : Θ(m · n)
        — We fill an (m+1) × (n+1) table, each cell in O(1).

    Space Complexity : Θ(m · n)
        — The full 2-D table is retained here so that we can backtrack to
          reconstruct the actual LCS sequence (needed for detailed reporting).
          If only the length is required, space can be reduced to Θ(min(m,n))
          using a two-row rolling array.

    ────────────────────────────────────────────────────────────────────────

    Parameters
    ----------
    seq_a, seq_b : list[str]
        Normalised structural token streams for the two code submissions.

    Returns
    -------
    lcs_length : int       — Length of the longest common subsequence.
    lcs_seq    : list[str] — The actual common token sequence (via backtrack).
    """
    m, n = len(seq_a), len(seq_b)

    # ── Initialise DP table ────────────────────────────────────────────────
    # dp is a (m+1) × (n+1) integer matrix, initialised to 0.
    # We use a list-of-lists for clarity; numpy is intentionally avoided to
    # keep the dependency footprint minimal.
    dp: list[list[int]] = [[0] * (n + 1) for _ in range(m + 1)]

    # ── Fill the DP table (bottom-up) ─────────────────────────────────────
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if seq_a[i - 1] == seq_b[j - 1]:
                # Characters match → extend the LCS
                dp[i][j] = dp[i - 1][j - 1] + 1
            else:
                # Characters differ → inherit the better prefix
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])

    lcs_length: int = dp[m][n]

    # ── Backtrack to reconstruct the LCS sequence ─────────────────────────
    # Starting from dp[m][n], follow the path that built each +1 increment.
    lcs_seq: list[str] = []
    i, j = m, n
    while i > 0 and j > 0:
        if seq_a[i - 1] == seq_b[j - 1]:
            lcs_seq.append(seq_a[i - 1])
            i -= 1
            j -= 1
        elif dp[i - 1][j] > dp[i][j - 1]:
            i -= 1
        else:
            j -= 1
    lcs_seq.reverse()   # Backtracking yields reversed order

    logger.info(
        "LCS complete: length=%d  (|A|=%d, |B|=%d)", lcs_length, m, n
    )
    return lcs_length, lcs_seq


# ===========================================================================
# SECTION 4 — SIMILARITY SCORING
# ===========================================================================

def compute_similarity(lcs_length: int, len_a: int, len_b: int) -> float:
    # Convert the LCS length into a normalised similarity percentage.
    # Formula: similarity = 2 * lcs_length / (len_a + len_b) * 100
    # This is the Sorensen-Dice coefficient. It is symmetric and bounded in
    # [0, 100]. Using (len_a + len_b) in the denominator penalises submissions
    # of very different lengths, which prevents a tiny snippet from claiming
    # 100% similarity to a large program.
    # Edge case: both empty -> return 0.0 to avoid division by zero.
    total = len_a + len_b
    if total == 0:
        return 0.0
    return round(2.0 * lcs_length / total * 100, 2)


def verdict(score: float) -> str:
    # Classify the bigram-LCS similarity score into a human-readable risk level.
    #
    # Thresholds calibrated for bigram (n=2) comparison.
    # Bigrams naturally produce lower raw scores than unigrams, so the
    # Suspicious band starts at 30%, not the naive 40-50% one might expect.
    #
    # Calibrated ranges (empirical, from test_examples.py):
    #   Completely different programs  -> ~18%   (Safe)
    #   Partially restructured copy    -> ~55-72% (Suspicious)
    #   Variable-renamed copy          -> ~100%  (Blatant)
    #
    #   below 30%  -> Safe        (green)  genuinely distinct algorithms
    #   30 to 77%  -> Suspicious  (orange) notable structural overlap
    #   78% and up -> Blatant     (red)    near-identical structure
    if score >= 78.0:
        return "Blatant"
    if score >= 30.0:
        return "Suspicious"
    return "Safe"


# ===========================================================================
# SECTION 5 — API ENDPOINTS
# ===========================================================================

@app.get("/", summary="Health check")
async def root() -> dict[str, Any]:
    """Simple health-check endpoint."""
    return {
        "status": "ok",
        "service": "Code Plagiarism Detector",
        "version": "2.2.0",
        "algorithm": "LCS on normalised AST bigram streams (DP, Θ(m·n))",
        "ngram_size": 2,
        "thresholds": {"safe": "<30%", "suspicious": "30-77%", "blatant": ">=78%"},
    }


@app.post("/api/compare", response_model=CompareResponse, summary="Compare two code submissions")
async def compare_code(payload: CompareRequest) -> CompareResponse:
    """
    Main analysis endpoint.

    1. Parse both code submissions into normalised AST token streams.
    2. Run the LCS DP algorithm.
    3. Compute the similarity score and return a structured result.

    Raises
    ------
    HTTPException(422) if both code snippets have syntax errors
    (at least one must be parseable to produce a meaningful comparison).
    """
    logger.info(
        "Comparison request: label_a=%r, label_b=%r", payload.label_a, payload.label_b
    )

    # ── Step 1: Parse & normalise ─────────────────────────────────────────
    lang = payload.language.lower()
    if lang not in ["python", "cpp", "c", "java"]:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported language '{payload.language}'. Supported: python, cpp, c, java"
        )

    if lang == "python":
        tokens_a, details_a, error_a = parse_and_normalise(payload.code_a)
        tokens_b, details_b, error_b = parse_and_normalise(payload.code_b)
    else:
        tokens_a, details_a, error_a = parse_and_normalise_tree_sitter(payload.code_a, lang)
        tokens_b, details_b, error_b = parse_and_normalise_tree_sitter(payload.code_b, lang)

    if error_a and error_b:
        raise HTTPException(
            status_code=422,
            detail={
                "message": "Both code snippets have syntax errors. Cannot compare.",
                "error_a": error_a,
                "error_b": error_b,
            },
        )

    # ── Step 2: Convert to bigrams ────────────────────────────────────────
    # Bigrams (consecutive token pairs) dramatically reduce false positives.
    # Two programs must share the *same local ordering* of structural operations
    # to match, not merely the same set of individual node types.
    # See to_ngrams() docstring for full rationale.
    NGRAM_SIZE = 2
    ngrams_a = to_ngrams(tokens_a, NGRAM_SIZE)
    ngrams_b = to_ngrams(tokens_b, NGRAM_SIZE)

    logger.info(
        "Bigram streams: |A|=%d → %d bigrams, |B|=%d → %d bigrams",
        len(tokens_a), len(ngrams_a), len(tokens_b), len(ngrams_b),
    )

    # ── Step 3: Run LCS DP on bigram sequences ────────────────────────────
    t0 = time.perf_counter()
    lcs_length, lcs_seq = compute_lcs(ngrams_a, ngrams_b)
    elapsed_ms = round((time.perf_counter() - t0) * 1000, 3)

    # ── Step 4: Score & verdict ──────────────────────────────────────────
    # Dice coefficient is computed over the bigram sequence lengths, not the
    # original unigram lengths, so the denominator correctly reflects the
    # search space that was actually compared.
    score = compute_similarity(lcs_length, len(ngrams_a), len(ngrams_b))
    risk  = verdict(score)

    logger.info(
        "Result: score=%.2f%% | verdict=%s | lcs_bigrams=%d | time=%.3f ms",
        score, risk, lcs_length, elapsed_ms,
    )

    return CompareResponse(
        similarity_score=score,
        verdict=risk,
        lcs_length=lcs_length,
        tokens_a=tokens_a,          # Unigram tokens — for display in the UI
        tokens_b=tokens_b,          # Unigram tokens — for display in the UI
        tokens_a_detail=details_a,
        tokens_b_detail=details_b,
        common_tokens=lcs_seq,      # Bigram LCS — e.g. ["FunctionDef→For", …]
        dp_table_size=f"{len(ngrams_a)} × {len(ngrams_b)}",
        time_ms=elapsed_ms,
        ngram_size=NGRAM_SIZE,
        error_a=error_a,
        error_b=error_b,
    )


@app.get("/api/examples", summary="Return built-in example code pairs")
async def get_examples() -> dict[str, Any]:
    """
    Return a set of pre-written example code pairs for UI demonstration.
    """
    return {
        "examples": [
            {
                "label": "Blatant Plagiarism — Variable Renaming",
                "description": "Same structure, only identifiers changed.",
                "code_a": EXAMPLE_ORIGINAL,
                "code_b": EXAMPLE_RENAMED,
            },
            {
                "label": "Suspicious — Partially Restructured",
                "description": "Loop converted to list comprehension; some shared structure.",
                "code_a": EXAMPLE_ORIGINAL,
                "code_b": EXAMPLE_RESTRUCTURED,
            },
            {
                "label": "Safe — Completely Different",
                "description": "Unrelated programs with minimal structural overlap.",
                "code_a": EXAMPLE_ORIGINAL,
                "code_b": EXAMPLE_DIFFERENT,
            },
        ]
    }


# ===========================================================================
# SECTION 6 — EXAMPLE CODE SNIPPETS (for /api/examples)
# ===========================================================================

EXAMPLE_ORIGINAL = '''\
def calculate_grade(score):
    if score >= 90:
        grade = "A"
    elif score >= 80:
        grade = "B"
    elif score >= 70:
        grade = "C"
    else:
        grade = "F"
    return grade

def process_students(students):
    results = []
    for student in students:
        name = student["name"]
        marks = student["marks"]
        g = calculate_grade(marks)
        results.append({"name": name, "grade": g})
    return results

students = [
    {"name": "Alice", "marks": 92},
    {"name": "Bob",   "marks": 78},
    {"name": "Carol", "marks": 55},
]
output = process_students(students)
for item in output:
    print(item["name"], "->", item["grade"])
'''

EXAMPLE_RENAMED = '''\
def get_letter(pts):
    if pts >= 90:
        ltr = "A"
    elif pts >= 80:
        ltr = "B"
    elif pts >= 70:
        ltr = "C"
    else:
        ltr = "F"
    return ltr

def run_batch(data):
    out = []
    for entry in data:
        nm = entry["name"]
        sc = entry["marks"]
        r = get_letter(sc)
        out.append({"name": nm, "grade": r})
    return out

pupils = [
    {"name": "X", "marks": 92},
    {"name": "Y", "marks": 78},
    {"name": "Z", "marks": 55},
]
final = run_batch(pupils)
for rec in final:
    print(rec["name"], "->", rec["grade"])
'''

EXAMPLE_RESTRUCTURED = '''\
# Suspicious: same problem domain, but grade function uses a guard-clause
# (early return) style instead of if-elif, and the batch function switches
# from a for-loop with append to a list comprehension.
# Shared bigrams: FunctionDef->If, If->Return, Assign->For, For->Assign etc.

def calculate_grade(score):
    if score >= 90:
        return "A"
    if score >= 80:
        return "B"
    if score >= 70:
        return "C"
    return "F"

def process_students(students):
    return [
        {"name": s["name"], "grade": calculate_grade(s["marks"])}
        for s in students
    ]

students = [
    {"name": "Alice", "marks": 92},
    {"name": "Bob",   "marks": 78},
    {"name": "Carol", "marks": 55},
]
results = process_students(students)
for item in results:
    print(item["name"], "->", item["grade"])
'''

EXAMPLE_DIFFERENT = '''\
# Safe: completely different algorithm family.
# Binary search (uses While loop) + bubble sort (nested For loops).
# These structural bigrams (While->Assign, For->For, AugAssign->...)
# have almost zero overlap with grade-calculation bigrams.

def binary_search(arr, target):
    left = 0
    right = len(arr) - 1
    while left <= right:
        mid = (left + right) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return -1

def bubble_sort(arr):
    n = len(arr)
    for i in range(n):
        for j in range(n - i - 1):
            if arr[j] > arr[j + 1]:
                arr[j], arr[j + 1] = arr[j + 1], arr[j]
    return arr

data = [64, 34, 25, 12, 22, 11, 90]
sorted_data = bubble_sort(data)
idx = binary_search(sorted_data, 25)
print("Found 25 at index:", idx)
'''

# ===========================================================================
# SECTION 7 — ENTRY POINT
# ===========================================================================

if __name__ == "__main__":
    import os
    port = int(os.environ.get("PORT", 8000))
    reload_mode = os.environ.get("RELOAD", "true").lower() == "true"
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=reload_mode,
        log_level="info",
    )

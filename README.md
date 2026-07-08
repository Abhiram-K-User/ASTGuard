# 🛡️ ASTGuard — Code Plagiarism Detector

> **DAA Project** · Python AST · Longest Common Subsequence (DP) · Bigram Token Streams · React + Vite · FastAPI

A production-ready, full-stack code plagiarism detection system that compares Python submissions at the **structural (AST) level** using **Dynamic Programming**. Variable renaming, literal substitution, and comment changes cannot fool it.

---

## ✨ Key Features

| Feature | Detail |
|---------|--------|
| 🧬 **AST Normalisation** | Strips all identifiers and literals; only structural node types are kept |
| ⚡ **Bigram LCS (DP)** | Longest Common Subsequence runs on *consecutive token pairs*, not individual tokens |
| 🔍 **Rename-Proof** | `calculate_grade` and `get_letter` with identical logic → 100% match |
| 📊 **Rich Results UI** | Animated score ring, token stream visualiser, LCS chip display |
| 🎓 **DAA Reference Panel** | Recurrence relation, time/space complexity shown in-app |

---

## 📁 Project Structure

```
Code_Plagiarism_Checker/
├── .gitignore           # Python venv, node_modules, IDE files, OS artifacts
├── backend/
│   ├── main.py              # FastAPI server — AST parser, bigram builder, LCS DP engine
│   ├── requirements.txt     # Python dependencies
│   └── test_examples.py     # Live API validation script (all 3 example pairs)
├── frontend/
│   ├── src/
│   │   ├── App.jsx          # Root component — state, API calls, keyboard shortcut
│   │   ├── App.css          # Complete design system (glassmorphism, animations)
│   │   ├── index.css        # Global reset and CSS variables
│   │   ├── constants.js     # API URL, verdict config, placeholder code
│   │   ├── services/
│   │   │   └── api.js       # fetch() wrappers for /api/compare and /api/examples
│   │   └── components/
│   │       ├── Background.jsx   # Animated blobs canvas
│   │       ├── Header.jsx       # Logo, algorithm badge, API docs link
│   │       ├── Hero.jsx         # Title, description, feature pills
│   │       ├── CodeEditor.jsx   # Textarea with live line numbers + Tab support
│   │       ├── ScoreRing.jsx    # Animated SVG radial score ring
│   │       ├── TokenStream.jsx  # AST chip renderer with LCS highlighting
│   │       └── ResultsPanel.jsx # Full result — stats, LCS, complexity reference
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── venv/                    # Python virtual environment
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+

### 1 — Clone and set up the Python environment

```powershell
cd Code_Plagiarism_Checker
python -m venv venv
venv\Scripts\activate
pip install -r backend\requirements.txt
```

### 2 — Start the backend

```powershell
cd backend
python main.py
```

The FastAPI server starts at → **`http://127.0.0.1:8000`**  
Interactive API docs → **`http://127.0.0.1:8000/docs`**

### 3 — Start the frontend (separate terminal)

```powershell
cd frontend
npm install       # first time only
npm run dev
```

The React + Vite app starts at → **`http://localhost:5173`**

> **Tip:** Press **Ctrl + Enter** anywhere on the page to trigger an analysis without clicking the button.

---

## 🔌 API Reference

### `GET /`  —  Health check

```json
{
  "status": "ok",
  "version": "2.2.0",
  "algorithm": "LCS on normalised AST bigram streams (DP, Θ(m·n))",
  "ngram_size": 2,
  "thresholds": { "safe": "<30%", "suspicious": "30-77%", "blatant": ">=78%" }
}
```

### `POST /api/compare`  —  Compare two submissions

**Request body:**
```json
{
  "code_a": "def foo():\n    pass",
  "code_b": "def bar():\n    pass",
  "label_a": "Student A",
  "label_b": "Student B"
}
```

**Response:**
```json
{
  "similarity_score": 50.0,
  "verdict": "Suspicious",
  "lcs_length": 16,
  "tokens_a": ["FunctionDef", "If", "Return", "..."],
  "tokens_b": ["FunctionDef", "If", "Return", "..."],
  "common_tokens": ["FunctionDef→If", "If→Return", "..."],
  "dp_table_size": "36 × 28",
  "time_ms": 0.23,
  "ngram_size": 2,
  "error_a": null,
  "error_b": null
}
```

### `GET /api/examples`  —  Built-in demo pairs

Returns 3 pre-written pairs (Blatant, Suspicious, Safe) used by the UI's **Load Example Pair** buttons.

---

## 🧠 Core Algorithm — DAA Reference

### Step 1 · AST Normalisation

Python source code is parsed with the standard library `ast` module. A depth-first **pre-order** visitor walks the tree and records only **structural node types** from a curated allow-list (e.g. `FunctionDef`, `For`, `If`, `Assign`, `Return`, `ListComp`). All of the following are **intentionally discarded**:

- Variable names (`Name`, identifier strings)
- Literal values (`Constant`, numbers, strings)
- Operators (`BinOp`, `Compare`, `BoolOp`)
- Attribute accesses, subscripts, calls

This makes the token stream invariant under renaming and literal substitution.

### Step 2 · Bigram Construction

The flat token stream is converted into **consecutive token pairs** (bigrams):

```
Unigrams: ["FunctionDef", "If", "Assign", "Return"]
               ↓  to_ngrams(seq, n=2)
Bigrams:  ["FunctionDef→If", "If→Assign", "Assign→Return"]
```

**Why bigrams?** Python's structural vocabulary has only ~40 node types. Any two non-trivial programs share tokens like `FunctionDef`, `For`, `If`, `Return` by coincidence, causing a naïve unigram detector to report false positives. Bigrams expand the effective vocabulary to ~40² ≈ 1,600 combinations, requiring programs to share the **same local ordering of adjacent structural operations** — a much stricter condition.

```
Complexity of to_ngrams:  Time O(n),  Space O(n)
```

### Step 3 · Longest Common Subsequence (Dynamic Programming)

LCS is computed on the two **bigram** sequences using classic bottom-up DP.

**Recurrence relation:**

```
dp[0][j] = 0   ∀ j        (base case)
dp[i][0] = 0   ∀ i        (base case)

         ┌ dp[i-1][j-1] + 1               if A[i] == B[j]   (match)
dp[i][j] = ┤
         └ max(dp[i-1][j], dp[i][j-1])   otherwise          (skip)

Answer: dp[m][n]
```

| Property | Value |
|----------|-------|
| **Paradigm** | Bottom-up Dynamic Programming |
| **Time Complexity** | Θ(m · n) |
| **Space Complexity** | Θ(m · n) — full table for backtracking |
| **Backtracking** | O(m + n) — reconstructs the actual LCS sequence |
| **m, n** | Lengths of the two bigram streams |

### Step 4 · Similarity Score (Sørensen–Dice)

```
similarity = (2 × LCS_length) / (|bigrams_A| + |bigrams_B|) × 100
```

The Dice coefficient is symmetric and bounded in \[0, 100\]. Using the **sum** of both lengths in the denominator penalises submissions of very different sizes.

### Step 5 · Verdict Classification

Thresholds are empirically calibrated for bigram comparison (verified via `test_examples.py`):

| Score | Verdict | Interpretation |
|-------|---------|----------------|
| ≥ 78% | 🚨 **Blatant** | Near-identical AST structure — strong plagiarism signal |
| 30–77% | ⚠️ **Suspicious** | Notable structural overlap — manual review recommended |
| < 30% | ✅ **Safe** | Genuinely distinct algorithms |

**Empirically validated example pairs:**

| Pair | Bigram Score | Verdict |
|------|-------------|---------|
| Grade calc vs. renamed copy | **100.0 %** | 🚨 Blatant |
| Grade calc vs. guard-clause restructure | **50.0 %** | ⚠️ Suspicious |
| Grade calc vs. binary search + bubble sort | **17.98 %** | ✅ Safe |

---

## 🧪 Running the Validation Suite

```powershell
cd backend
python test_examples.py
```

Expected output:
```
==============================================================
  Live API validation — all three example pairs
==============================================================
  PASS  [Blatant Plagiarism — Variable Renaming]
       Score   : 100.0%   (expected verdict: Blatant)
       Verdict : Blatant

  PASS  [Suspicious — Partially Restructured]
       Score   : 50.0%   (expected verdict: Suspicious)
       Verdict : Suspicious

  PASS  [Safe — Completely Different]
       Score   : 17.98%   (expected verdict: Safe)
       Verdict : Safe

==============================================================
  Overall: ALL PASS
==============================================================
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Python 3.10+, FastAPI, Uvicorn, Pydantic |
| **AST Parsing** | Python standard library `ast` module |
| **Frontend** | React 18, Vite 6, Vanilla CSS |
| **Styling** | Custom design system — glassmorphism, CSS variables, micro-animations |

---

## 🌐 Deployment
This project is configured to be deployed easily for free:

### 1. Deploy the Backend (FastAPI) on Render
1. Sign up/Log in to [Render](https://render.com/).
2. Create a new **Web Service** and connect this repository.
3. Configure the settings:
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `python main.py` or `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Set the **Instance Type** to **Free**.
5. Deploy and copy your new backend service URL (e.g. `https://astguard-backend.onrender.com`).

### 2. Deploy the Frontend (React + Vite) on Vercel
1. Sign up/Log in to [Vercel](https://vercel.com/).
2. Import this repository.
3. Configure the settings:
   - **Root Directory**: `frontend`
   - **Framework Preset**: `Vite`
   - **Environment Variables**: Add `VITE_API_BASE` and set it to your Render backend URL (e.g. `https://astguard-backend.onrender.com`).
4. Click **Deploy**.

---

## 📄 License

MIT — free to use for academic and educational purposes.

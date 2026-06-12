# ASTGuard (SyntaxShield) - Project Explanation & Viva Guide

This document provides a comprehensive overview of the **ASTGuard** project, detailing its purpose, technical architecture, and potential viva (oral exam) questions that an examiner might ask.

---

## 📖 What the Project Does

ASTGuard is a production-ready, full-stack **Code Plagiarism Detection System**. Unlike naive plagiarism checkers that compare text or use simple regular expressions, ASTGuard compares Python source code at the **structural level**. 

When students attempt to plagiarize code, they typically change variable names, modify comments, add whitespace, or change literal values (like string contents or numbers). ASTGuard defeats these attempts by converting the raw code into an **Abstract Syntax Tree (AST)** and systematically stripping away superficial details. It extracts a stream of pure structural nodes (e.g., `FunctionDef`, `If`, `For`, `Return`) and compares them using the **Longest Common Subsequence (LCS)** Dynamic Programming algorithm.

### Core Workflow
1. **Parsing:** The backend parses the two Python scripts into ASTs.
2. **Normalization:** A depth-first traversal records only the *structural nodes*. Identifiers, variable names, and literals are discarded.
3. **Bigram Generation:** The flat token stream is converted into pairs of consecutive tokens (bigrams) to drastically reduce false positives.
4. **LCS Calculation:** A DP matrix is computed to find the longest sequence of matching structural bigrams.
5. **Scoring:** The Sørensen–Dice coefficient is used to calculate a normalized similarity score (0% to 100%), which translates into a verdict (Safe, Suspicious, or Blatant).

---

## 🛠️ Tech Stack

### Backend
* **Language:** Python (3.10+)
* **Framework:** FastAPI & Uvicorn (High-performance async REST API)
* **Parsing Library:** Python Standard Library `ast` module
* **Algorithm Implementation:** Custom Dynamic Programming engine for LCS calculation

### Frontend
* **Framework:** React 18 & Vite
* **Code Editor:** `@monaco-editor/react` (The engine behind VS Code, customized with light/dark themes)
* **Visualizations:** `@xyflow/react` (ReactFlow) for the interactive AST node graphs
* **Styling:** Vanilla CSS & CSS Variables (implementing modern glassmorphism, responsive design, and theming)
* **Icons & Animation:** `lucide-react` for iconography and `framer-motion` for fluid micro-animations.

---

## 🎓 Viva Questions & Answers

These questions are designed to test your understanding of Data Structures and Algorithms (DAA) as well as the practical engineering decisions made during development.

> [!TIP]
> **Q1: Why did you use Abstract Syntax Trees (ASTs) instead of string comparison or regular expressions for detecting plagiarism?**
> **Answer:** String comparison is easily defeated by trivial changes like adding spaces, renaming variables, or rewriting comments. An AST captures the underlying mathematical logic and structure of the code. By comparing ASTs, we can ignore superficial disguises and focus purely on the algorithm the student implemented.

> [!IMPORTANT]
> **Q2: In your AST normalisation step, why do you discard variable names and literal values?**
> **Answer:** Variable renaming (e.g., changing `total_sum` to `ans`) and literal substitution are the most common tactics used to hide plagiarism. If we keep identifiers in the tree, two identical algorithms with different variable names would look entirely different to the system. By discarding them, the system becomes completely invariant to renaming.

> [!TIP]
> **Q3: You mentioned converting the token stream into "bigrams". What is a bigram and why didn't you just use single tokens (unigrams)?**
> **Answer:** A bigram is a sequence of two consecutive items (e.g., `For → If`). Python only has about 40 structural node types. If we used unigrams, any two non-trivial programs would share many `If` and `Assign` nodes by pure coincidence, leading to massive false positive rates. By using bigrams, we expand the vocabulary to ~1,600 pairs, forcing the *local ordering* of operations to match, which is a much stricter and more accurate measure of similarity.

> [!IMPORTANT]
> **Q4: Explain the algorithm you used to compare the bigram streams and its complexities.**
> **Answer:** I used the **Longest Common Subsequence (LCS)** algorithm implemented via Bottom-Up Dynamic Programming. The Time Complexity is `O(m * n)`, where `m` and `n` are the lengths of the two bigram sequences, because we must fill out a 2D grid. The Space Complexity is also `O(m * n)` because we retain the full DP table to backtrack and reconstruct the exact matching sequences for the frontend visualizer.

> [!TIP]
> **Q5: How did you compute the final similarity percentage from the LCS length?**
> **Answer:** I used the Sørensen–Dice coefficient formula: `(2 * LCS_length) / (length_A + length_B) * 100`. This formula is symmetric and safely normalizes the score. Using the sum of both lengths in the denominator automatically penalizes situations where a student submits a massive file with only a small copied snippet inside it.

> [!NOTE]
> **Q6: In your frontend AST Visualizer, what graph traversal did you use to calculate the layout coordinates for the tree?**
> **Answer:** Because the AST nodes arrive from the backend as a flattened, pre-order Depth-First Search (DFS) list, I implemented a stack-based heuristic parser on the frontend to rebuild the parent-child relationships. Once rebuilt, I recursively compute the `x` and `y` coordinates using a centered hierarchical tree-layout algorithm, determining depth for the `y-axis` and distributing children evenly along the `x-axis`.

> [!TIP]
> **Q7: What makes FastAPI a better choice for this backend compared to Flask or Django?**
> **Answer:** FastAPI is significantly faster due to its asynchronous ASGI architecture. It also provides automatic data validation via Pydantic and instantly generates interactive Swagger API documentation out of the box, which made testing the API endpoints very efficient during development.

---

## 🌳 AST Visualizer Terminology

When viewing the trees in the **Visualize AST** tab, the application translates raw Python Abstract Syntax Tree node names into more readable labels. Here is a glossary of the common nodes you will see:

### Control Flow & Functions
* **`def` (`FunctionDef`)**: Defines a standard Python function or method.
* **`async def` (`AsyncFunctionDef`)**: Defines an asynchronous Python function.
* **`class` (`ClassDef`)**: Defines a Python class.
* **`for` / `while` (`For`, `While`)**: Standard iteration loops.
* **`if` (`If`)**: A conditional branch.
* **`try` / `except` (`Try`, `ExceptHandler`)**: Exception handling blocks.
* **`return` / `raise` / `break` / `continue`**: Standard control flow terminators.

### Assignments & Operations
* **`=` (`Assign`)**: A standard variable assignment.
* **`op=` (`AugAssign`)**: An augmented assignment (e.g., `+=`, `-=`).
* **`type =` (`AnnAssign`)**: An annotated assignment (type hinting).
* **`cmp` (`Compare`)**: A comparison operation (e.g., `==`, `<`, `>`).
* **`boolop` (`BoolOp`)**: A boolean operation (e.g., `and`, `or`).
* **`binop` (`BinOp`)**: A binary operation (e.g., `+`, `-`, `*`).
* **`call()` (`Call`)**: A function invocation.

### Data Structures & Comprehensions
* **`list` / `dict` / `set` / `tuple`**: Base data structure declarations.
* **`list-comp` / `dict-comp` (`ListComp`, `DictComp`)**: Python comprehension expressions.
* **`gen-exp` (`GeneratorExp`)**: Generator expressions.

### Miscellaneous
* **`.attr` (`Attribute`)**: Accessing an object's attribute (e.g., `obj.property`).
* **`[sub]` (`Subscript`)**: Array/Dictionary indexing (e.g., `arr[0]`).
* **`*` (`Starred`)**: Unpacking operations (e.g., `*args`).
* **`f-str` (`JoinedStr`)**: Formatted string literals (f-strings).

*Note: Variable names, numbers, and strings are deliberately missing from this visualizer. This is intentional, as the algorithm removes them to become immune to renaming and literal-substitution plagiarism.*


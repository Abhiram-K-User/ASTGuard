import urllib.request
import json

BASE = "http://127.0.0.1:8000"

try:
    with urllib.request.urlopen(BASE + "/api/examples") as r:
        examples = json.loads(r.read())["examples"]
except Exception as e:
    print(f"Error connecting to backend server at {BASE}: {e}")
    print("Please make sure the FastAPI server is running before executing this test script.")
    exit(1)

print("=" * 62)
print("  Live API validation — Python examples")
print("=" * 62)

EXPECTED = ["Blatant", "Suspicious", "Safe"]

all_ok = True
for ex, expected in zip(examples, EXPECTED):
    body = json.dumps({"code_a": ex["code_a"], "code_b": ex["code_b"], "language": "python"}).encode()
    req  = urllib.request.Request(
        BASE + "/api/compare",
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req) as r:
        res = json.loads(r.read())

    label   = ex["label"]
    score   = res["similarity_score"]
    verdict = res["verdict"]
    lcs     = res["lcs_length"]
    dp      = res["dp_table_size"]
    ok      = "PASS" if verdict == expected else "FAIL"
    if ok == "FAIL":
        all_ok = False

    print(f"  {ok}  [{label}]")
    print(f"       Score   : {score}%   (expected: {expected})")
    print(f"       Verdict : {verdict}")
    print()

# --- Multi-language verification ---
print("=" * 62)
print("  Live API validation — C++, Java, C examples")
print("=" * 62)

MULTI_LANG_TESTS = [
    {
        "language": "cpp",
        "label": "C++ - Blatant Plagiarism (Variable Renaming)",
        "expected": "Blatant",
        "code_a": """
            int calculateGrade(int score) {
                if (score >= 90) return 1;
                else if (score >= 80) return 2;
                else return 3;
            }
        """,
        "code_b": """
            int getGrade(int mark) {
                if (mark >= 90) return 1;
                else if (mark >= 80) return 2;
                else return 3;
            }
        """,
    },
    {
        "language": "java",
        "label": "Java - Blatant Plagiarism (Variable Renaming)",
        "expected": "Blatant",
        "code_a": """
            public class Helper {
                public int add(int a, int b) {
                    if (a > 0) {
                        return a + b;
                    }
                    return b;
                }
            }
        """,
        "code_b": """
            public class Calculator {
                public int sum(int x, int y) {
                    if (x > 0) {
                        return x + y;
                    }
                    return y;
                }
            }
        """,
    },
    {
        "language": "c",
        "label": "C - Safe (Different Algorithms)",
        "expected": "Safe",
        "code_a": """
            void multiplyMatrices(int first[10][10], int second[10][10], int result[10][10], int r1, int c1, int r2, int c2) {
                for (int i = 0; i < r1; ++i) {
                    for (int j = 0; j < c2; ++j) {
                        result[i][j] = 0;
                        for (int k = 0; k < c1; ++k) {
                            result[i][j] += first[i][k] * second[k][j];
                        }
                    }
                }
            }
        """,
        "code_b": """
            struct Node {
                int data;
                struct Node* left;
                struct Node* right;
            };

            void printPreorder(struct Node* node) {
                if (node == NULL)
                    return;
                printf("%d ", node->data);
                printPreorder(node->left);
                printPreorder(node->right);
            }
        """,
    }
]

for test in MULTI_LANG_TESTS:
    body = json.dumps({
        "code_a": test["code_a"],
        "code_b": test["code_b"],
        "language": test["language"]
    }).encode()
    req = urllib.request.Request(
        BASE + "/api/compare",
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req) as r:
            res = json.loads(r.read())
        score = res["similarity_score"]
        verdict = res["verdict"]
        expected = test["expected"]
        ok = "PASS" if verdict == expected else "FAIL"
        if ok == "FAIL":
            all_ok = False
        print(f"  {ok}  [{test['label']}]")
        print(f"       Score   : {score}%   (expected: {expected})")
        print(f"       Verdict : {verdict}")
    except Exception as e:
        print(f"  FAIL  [{test['label']}] - Error: {e}")
        all_ok = False
    print()

print("=" * 62)
print("  Overall:", "ALL PASS" if all_ok else "SOME FAILURES")
print("=" * 62)

import urllib.request
import json

BASE = "http://127.0.0.1:8000"

with urllib.request.urlopen(BASE + "/api/examples") as r:
    examples = json.loads(r.read())["examples"]

print("=" * 62)
print("  Live API validation — all three example pairs")
print("=" * 62)

EXPECTED = ["Blatant", "Suspicious", "Safe"]

all_ok = True
for ex, expected in zip(examples, EXPECTED):
    body = json.dumps({"code_a": ex["code_a"], "code_b": ex["code_b"]}).encode()
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
    print(f"       Score   : {score}%   (expected verdict: {expected})")
    print(f"       Verdict : {verdict}")
    print(f"       LCS len : {lcs} bigrams   DP table: {dp}")
    print()

print("=" * 62)
print("  Overall:", "ALL PASS" if all_ok else "SOME FAILURES — thresholds need tuning")
print("=" * 62)

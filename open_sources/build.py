import argparse, pathlib, json, re
from tqdm import tqdm

# lightweight parser/tagger (subset of the full DataBuilder)
import sys
from pdfminer.high_level import extract_text as pdfminer_extract

import hashlib

def norm_space(s: str) -> str:
    import re
    return re.sub(r"\s+", " ", s or "").strip()

def id_from_text(text: str) -> str:
    h = hashlib.sha1((text or "").encode("utf-8", "ignore")).hexdigest()[:12]
    return f"FMQ-{h}"

QSTART = re.compile(r"^\s*(?:Q\.|Que\.|Question\s*)?\s*(\d{1,4})\s*[\.)]\s+(.+)$", re.I)
OPT    = re.compile(r"^\s*[\(\[]?([a-dA-D])[\)\]]\s+(.+)$")
ANS    = re.compile(r"^\s*(?:Ans\.?|Answer\s*[:\-])\s*\(?\s*([a-dA-D]|[-+]?\d*\.?\d+)\s*\)?", re.I)

def parse_pdf(path: pathlib.Path):
    try:
        txt = pdfminer_extract(str(path)) or ""
    except Exception:
        txt = ""
    lines = [l.rstrip() for l in txt.splitlines()]
    qs = []
    cur = None

    def flush():
        nonlocal cur
        if not cur: return
        cur["question_text"] = norm_space(" ".join(cur["acc"]))
        del cur["acc"]
        opts = [norm_space(o) for o in cur["opts"] if norm_space(o)]
        cur["options"] = opts[:4]
        cur["type"] = "MCQ" if opts else "NAT"
        a = cur.get("ans")
        if a:
            a = str(a).strip().lower()
            if a in "abcd":
                cur["answer"] = a
            else:
                try:
                    v = float(a)
                    cur["answerNat"] = v
                    cur["natPrecision"] = 0.01
                    cur["type"] = "NAT"
                except: pass
        if len(cur["question_text"]) > 25:
            cur["id"] = cur.get("id") or id_from_text(cur["question_text"])
            qs.append(cur)
        cur = None

    for ln in lines:
        ms = QSTART.match(ln)
        if ms:
            flush()
            qn, rest = ms.group(1), ms.group(2).strip()
            cur = {
                "id": None,
                "chapter": "",
                "topic": "",
                "exam": "",
                "year": None,
                "acc": [rest],
                "opts": [],
                "ans": None,
                "difficulty": "",
                "subject": "Fluid Mechanics",
                "branch": "ME",
                "marks": 1,
                "source_meta": {"file": path.name}
            }
            continue
        if cur:
            mo = OPT.match(ln)
            if mo:
                idx = "abcd".find(mo.group(1).lower())
                text = mo.group(2)
                if idx >= 0:
                    while len(cur["opts"]) <= idx:
                        cur["opts"].append("")
                    cur["opts"][idx] = (cur["opts"][idx] + " " + text).strip() if cur["opts"][idx] else text.strip()
                else:
                    cur["opts"].append(text.strip())
                continue
            ma = ANS.match(ln)
            if ma and cur.get("ans") is None:
                cur["ans"] = ma.group(1); continue
            if ln and not ln.strip().startswith(("Solution", "Sol.", "Explanation")):
                cur["acc"].append(ln.strip())
    flush()
    return qs

def tag_taxonomy(q, rules):
    text = " ".join([q.get("question_text","")] + (q.get("options") or []))
    for ch, topic, pats in rules:
        import re
        if any(p.search(text) for p in pats):
            q["chapter"] = ch; q["topic"] = topic; return q
    return q

def load_rules(tax_path: pathlib.Path):
    import ruyaml, re
    y = ruyaml.YAML(typ='safe').load(tax_path.read_text(encoding='utf-8'))
    items = []
    for ch in y.get("chapters", []):
        for t in ch.get("topics", []):
            pats = [re.compile(p, re.I) for p in (t.get("include") or [])]
            items.append((ch["name"], t["name"], pats))
    return items

def main():
    ap = argparse.ArgumentParser(description="Build dataset from input_pdfs → questions.json/jsonl")
    ap.add_argument("--pdfs", required=True)
    ap.add_argument("--taxonomy", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--jsonl", default=None)
    ap.add_argument("--min-len", type=int, default=30)
    args = ap.parse_args()

    rules = load_rules(pathlib.Path(args.taxonomy))

    pool = []
    for pdf in sorted(pathlib.Path(args.pdfs).glob("*.pdf")):
        qs = parse_pdf(pdf)
        for q in qs:
            if len(q.get("question_text","")) >= args.min_len:
                q = tag_taxonomy(q, rules)
                pool.append(q)

    # dedupe by normalized question text
    seen = set(); out = []
    for q in pool:
        key = re.sub(r"\W+", "", (q.get("question_text","").lower()))[:240]
        if key in seen: continue
        seen.add(key)
        # tracker defaults
        q.setdefault("attempted", 0); q.setdefault("correct", 0)
        q.setdefault("last_seen_at", None); q.setdefault("streak", 0); q.setdefault("weight", 1.0)
        out.append(q)

    out.sort(key=lambda x: (x.get("chapter",""), x.get("topic",""), x.get("id","")))
    pathlib.Path(args.out).parent.mkdir(parents=True, exist_ok=True)
    pathlib.Path(args.out).write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    if args.jsonl:
        with open(args.jsonl, "w", encoding="utf-8") as f:
            for q in out:
                f.write(json.dumps(q, ensure_ascii=False) + "\n")
    print(f"Parsed: {len(pool)} • Deduped: {len(out)}")
    print("Wrote:", args.out)
    if args.jsonl: print("Wrote:", args.jsonl)

if __name__ == "__main__":
    main()

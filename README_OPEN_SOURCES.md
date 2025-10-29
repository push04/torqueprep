# TorquePrep — Open Sources Pack (ME • GATE/ESE)

This pack gives you **only the necessary new files** to acquire 2,000+ *real* Mechanical Engineering questions **locally**,
using publicly available links **you have rights to use**. It does **not modify your app**. Drop this folder at repo root
(or anywhere), run the CLI, then copy the built `questions.json` to your app's `public/questions.json`.

> ⚠️ You are responsible for ensuring you have rights to download and reuse each source. Respect site terms.

## TL;DR

```bash
# 1) (optional) create venv
python -m venv .venv && source .venv/bin/activate

# 2) install deps
pip install -r requirements.txt

# 3) fetch PDFs listed in datasources/open_sources.yaml (to ./input_pdfs)
python -m open_sources.fetch --manifest ./datasources/open_sources.yaml --out ./input_pdfs

# 4) parse + tag + merge → build/questions.json + questions.jsonl
python -m open_sources.build --pdfs ./input_pdfs --taxonomy ./taxonomy/fluid_and_me.yaml   --out ./build/questions.json --jsonl ./build/questions.jsonl

# 5) copy to your app
cp ./build/questions.json ../your-app/public/questions.json
```

## What’s inside
- `datasources/open_sources.yaml` — curated list of publicly reachable pages hosting GATE/ESE PDFs (ME). **Edit as needed.**
- `open_sources/fetch.py` — safe fetcher: downloads PDFs from the manifest into `./input_pdfs/`.
- `open_sources/build.py` — runs the DataBuilder pipeline (parser + tagger + dedupe) and emits JSON/JSONL.
- `taxonomy/fluid_and_me.yaml` — taxonomy focused on **Fluid Mechanics** plus scaffolding for other ME subjects.

## Notes
- This pack does **not** change UI/UX or your codebase. It only produces data files you can drop in.
- If a site disallows automated downloads, remove that URL from the manifest or download manually and place the PDFs into `input_pdfs/`.
- You can add your college notes PDFs, PYQs, and your own scans.

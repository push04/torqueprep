import argparse, pathlib, requests, re, sys, time
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse

HDRS = {"User-Agent":"Mozilla/5.0 (X11; Linux x86_64) TorquePrepFetcher/1.0"}

def discover_pdfs(url: str):
    r = requests.get(url, headers=HDRS, timeout=30)
    r.raise_for_status()
    soup = BeautifulSoup(r.text, "html.parser")
    links = []
    for a in soup.select("a[href]"):
        href = a["href"]
        if not href: continue
        full = urljoin(url, href)
        if re.search(r"\.pdf(\?.*)?$", full, re.I):
            links.append(full)
    return sorted(set(links))

def fetch_one(url: str, out_dir: pathlib.Path):
    out_dir.mkdir(parents=True, exist_ok=True)
    name = urlparse(url).path.split("/")[-1] or f"file_{int(time.time())}.pdf"
    dest = out_dir / name
    if dest.exists(): return dest
    with requests.get(url, headers=HDRS, timeout=60, stream=True) as r:
        r.raise_for_status()
        with open(dest, "wb") as f:
            for chunk in r.iter_content(1024*64):
                if chunk: f.write(chunk)
    return dest

def main():
    ap = argparse.ArgumentParser(description="Fetch PDFs from a manifest into ./input_pdfs")
    ap.add_argument("--manifest", required=True, help="datasources/open_sources.yaml")
    ap.add_argument("--out", default="./input_pdfs", help="output folder")
    args = ap.parse_args()

    import ruyaml
    y = ruyaml.YAML(typ='safe').load(pathlib.Path(args.manifest).read_text(encoding='utf-8'))
    out = pathlib.Path(args.out)
    out.mkdir(parents=True, exist_ok=True)

    for src in y.get("sources", []):
        url = src.get("url")
        if not url: continue
        print(f"[source] {src.get('name')} — {url}")
        try:
            if src.get("type") == "html-page":
                pdfs = discover_pdfs(url) if src.get("find") else []
            else:
                pdfs = [url]
        except Exception as e:
            print(f"  ! discovery failed: {e}")
            pdfs = []
        for p in pdfs:
            try:
                dest = fetch_one(p, out)
                print(f"  + {dest.name}")
            except Exception as e:
                print(f"  ! fetch failed: {p} — {e}")

if __name__ == "__main__":
    main()

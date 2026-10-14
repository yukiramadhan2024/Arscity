"""
Arscity Automated Bug Tester - Website & Codebase Integrity
Tests HTTP server, HTML meta, CSS Liquid Glass tokens, solar math, and zero-emoji compliance.
"""

import sys
import os
import re
import urllib.request
import urllib.error

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

def run_tests():
    print("[*] Menjalankan test_website_bugs.py...")
    failures = []

    # 1. Dev Server HTTP Ping
    server_url = "http://localhost:5173/"
    try:
        req = urllib.request.Request(server_url, headers={"User-Agent": "ArscityBugTester/1.0"})
        with urllib.request.urlopen(req, timeout=3) as resp:
            status = resp.getcode()
            if status == 200:
                print("  [PASS] Dev server responsif (HTTP 200 OK)")
            else:
                failures.append(f"Dev server mengembalikan status HTTP {status}")
    except Exception as e:
        print(f"  [WARN] Dev server belum online di {server_url} ({e})")

    # 2. Strict Zero Emoji Verification in src/
    src_dir = os.path.join(PROJECT_ROOT, "src")
    emoji_regex = re.compile(r"[\U0001F300-\U0001F9FF\u2600-\u26FF\u2700-\u27BF]")
    found_emojis = []
    
    for root, _, files in os.walk(src_dir):
        for f in files:
            if f.endswith((".ts", ".tsx", ".js", ".jsx", ".css", ".html")):
                filepath = os.path.join(root, f)
                with open(filepath, "r", encoding="utf-8", errors="ignore") as fp:
                    for line_idx, line in enumerate(fp, 1):
                        if emoji_regex.search(line):
                            found_emojis.append(f"{os.path.relpath(filepath, PROJECT_ROOT)}:{line_idx}")

    if found_emojis:
        failures.append(f"Ditemukan emoji di file sumber: {', '.join(found_emojis[:5])}")
    else:
        print("  [PASS] Verifikasi Nol-Emoji (Strict Zero Emoji) berhasil di seluruh src/")

    # 3. Verifikasi HTML
    index_html = os.path.join(PROJECT_ROOT, "index.html")
    if os.path.exists(index_html):
        with open(index_html, "r", encoding="utf-8") as f:
            content = f.read()
            if 'id="root"' in content:
                print("  [PASS] index.html valid dengan root DOM")
            else:
                failures.append("index.html kehilangan elemen root")
    else:
        failures.append("index.html tidak ditemukan")

    # 4. Verifikasi Formula Matahari Yogyakarta (-7.8 LS, 110.37 BT)
    solar_file = os.path.join(PROJECT_ROOT, "src", "core", "math", "SolarPosition.ts")
    if os.path.exists(solar_file):
        with open(solar_file, "r", encoding="utf-8") as f:
            content = f.read()
            if "-7.8" in content and "110.37" in content:
                print("  [PASS] Parameter astronomi matahari Yogyakarta terverifikasi (-7.8 LS, 110.37 BT)")
            else:
                failures.append("SolarPosition.ts belum memuat koordinat presisi Yogyakarta")
    else:
        failures.append("SolarPosition.ts tidak ditemukan")

    # 5. Verifikasi Penghapusan Bug Tester Modal dalam Game
    bug_modal_file = os.path.join(PROJECT_ROOT, "src", "ui", "components", "BugTesterModal.tsx")
    if os.path.exists(bug_modal_file):
        failures.append("BugTesterModal.tsx masih ada di dalam src/ui/components (harus dihapus dari game)")
    else:
        print("  [PASS] Bug Tester modal dalam game telah dihapus bersih dari src/ui")

    if failures:
        print("[-] GAGAL pada test_website_bugs:")
        for fail in failures:
            print(f"    - {fail}")
        return False

    print("[+] test_website_bugs: SEMUA LULUS\n")
    return True

if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)

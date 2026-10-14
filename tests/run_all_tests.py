"""
Arscity - Master Automated Bug Test Suite
Jalankan skrip ini sebelum meluncurkan atau commit kode baru.
Pengujian meliputi:
1. Website & Codebase Integrity (test_website_bugs.py)
2. Navbar & UI Synchronization (test_navbar_sync.py)
3. Desktop & Touchpad/Mousepad Behaviors (test_desktop_mobile_bugs.py)
4. Camera Orbit 360 & Zoom (test_portal_zoom.py)
"""

import sys
import os
import subprocess
import time

TESTS_DIR = os.path.dirname(os.path.abspath(__file__))

TEST_SUITES = [
    "test_website_bugs.py",
    "test_navbar_sync.py",
    "test_desktop_mobile_bugs.py",
    "test_portal_zoom.py",
]

def main():
    print("=" * 65)
    print("           ARSCITY PRE-LAUNCH AUTOMATED BUG TEST SUITE           ")
    print("=" * 65)
    start_time = time.time()
    results = []

    for suite in TEST_SUITES:
        suite_path = os.path.join(TESTS_DIR, suite)
        if not os.path.exists(suite_path):
            print(f"[!] File {suite} tidak ditemukan.")
            results.append((suite, False, "File missing"))
            continue

        cmd = [sys.executable, suite_path]
        proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)

        is_success = proc.returncode == 0
        results.append((suite, is_success, proc.stdout.strip() if is_success else (proc.stdout + proc.stderr).strip()))
        print(proc.stdout)
        if proc.stderr:
            print(proc.stderr)

    elapsed = time.time() - start_time
    print("=" * 65)
    print("                      RINGKASAN HASIL AUDIT                      ")
    print("=" * 65)

    all_passed = True
    for suite, success, output in results:
        status = "[LULUS]" if success else "[GAGAL]"
        print(f"  {status.ljust(9)} {suite}")
        if not success:
            all_passed = False

    print("-" * 65)
    print(f"Total Waktu: {elapsed:.2f} detik")
    if all_passed:
        print("[STATUS]: SEMUA PENGUJIAN LULUS DENGAN SUKSES! KODE SIAP DILUNCURKAN.")
        sys.exit(0)
    else:
        print("[STATUS]: ADA PENGUJIAN YANG GAGAL. PERBAIKI SEBELUM MELUNCURKAN KODE.")
        sys.exit(1)

if __name__ == "__main__":
    main()

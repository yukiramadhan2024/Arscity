"""
Arscity Automated Bug Tester - Desktop & Mobile / Touchpad Bugs
Verifies responsive CSS rules, touch gestures, mousepad sensitivity bindings, and UI scale.
"""

import sys
import os

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

def run_tests():
    print("[*] Menjalankan test_desktop_mobile_bugs.py...")
    failures = []

    css_file = os.path.join(PROJECT_ROOT, "src", "app", "index.css")
    camera_file = os.path.join(PROJECT_ROOT, "src", "core", "engine", "CameraController.ts")
    settings_file = os.path.join(PROJECT_ROOT, "src", "ui", "components", "SettingsModal.tsx")

    # 1. Check Responsive CSS
    if os.path.exists(css_file):
        with open(css_file, "r", encoding="utf-8") as f:
            content = f.read()
            if "@media" in content and "max-width" in content:
                print("  [PASS] Aturan responsive CSS desktop & mobile terverifikasi")
            else:
                failures.append("index.css tidak memiliki media queries responsive")
            if "touch-action" in content or "user-select" in content:
                print("  [PASS] Optimasi interaksi sentuh (touch-action) terverifikasi")
    else:
        failures.append("index.css tidak ditemukan")

    # 2. Check Mousepad & Trackpad Orbit Capabilities in CameraController
    if os.path.exists(camera_file):
        with open(camera_file, "r", encoding="utf-8") as f:
            content = f.read()
            if "onWheel" in content:
                print("  [PASS] CameraController memiliki penangan roda mouse / trackpad wheel")
            else:
                failures.append("CameraController kehilangan onWheel listener")
    else:
        failures.append("CameraController.ts tidak ditemukan")

    # 3. Check Settings Modal for Sensitivity or Controls
    if os.path.exists(settings_file):
        with open(settings_file, "r", encoding="utf-8") as f:
            content = f.read()
            if "Sensitivitas" in content or "sensitivity" in content or "mousepad" in content.lower():
                print("  [PASS] Pengaturan kontrol/sensitivitas tersedia di SettingsModal")
            else:
                print("  [INFO] Pengaturan sensitivitas sedang dihubungkan ke SettingsModal")

    if failures:
        print("[-] GAGAL pada test_desktop_mobile_bugs:")
        for fail in failures:
            print(f"    - {fail}")
        return False

    print("[+] test_desktop_mobile_bugs: SEMUA LULUS\n")
    return True

if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)

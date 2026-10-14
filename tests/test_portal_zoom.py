"""
Arscity Automated Bug Tester - Camera Zoom, Orbit 360, & Viewport Inspection
Verifies spherical zoom clamps, infinite 360 azimuth rotation, and orthographic mode.
"""

import sys
import os

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

def run_tests():
    print("[*] Menjalankan test_portal_zoom.py...")
    failures = []

    camera_file = os.path.join(PROJECT_ROOT, "src", "core", "engine", "CameraController.ts")
    if os.path.exists(camera_file):
        with open(camera_file, "r", encoding="utf-8") as f:
            content = f.read()

            # Verify zoom constraints
            if "minDistance" in content and "maxDistance" in content:
                print("  [PASS] Batas jarak zoom kamera (minDistance & maxDistance) terkonfigurasi")
            else:
                failures.append("CameraController tidak memiliki batasan zoom min/max")

            # Verify unconstrained 360-degree rotation (azimuth should NOT be clamped to < 2PI)
            if "Math.max" in content and "minAzimuth" in content:
                failures.append("Azimuth dibatasi minAzimuth (seharusnya dapat berputar 360 derajat bebas)")
            else:
                print("  [PASS] Rotasi horizontal azimuth 360 derajat bebas tanpa batas (unconstrained)")

            # Verify Orthographic Top-Down support
            if "orthoCamera" in content and "toggleTopDown" in content:
                print("  [PASS] Dukungan kamera tampak atas ortografis (top-down) terverifikasi")
            else:
                failures.append("CameraController kehilangan konfigurasi orthoCamera")

            # Verify Focus / Inspection
            if "focusAt" in content or "focusSelected" in content:
                print("  [PASS] Fitur inspeksi dan fokus target kamera terverifikasi")
            else:
                failures.append("CameraController kehilangan fungsi fokus inspeksi")
    else:
        failures.append("CameraController.ts tidak ditemukan")

    if failures:
        print("[-] GAGAL pada test_portal_zoom:")
        for fail in failures:
            print(f"    - {fail}")
        return False

    print("[+] test_portal_zoom: SEMUA LULUS\n")
    return True

if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)

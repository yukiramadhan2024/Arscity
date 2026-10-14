"""
Arscity Automated Bug Tester - Navbar & UI Header Synchronization
Verifies TopHeader, BottomToolbar, tools tabs, theme toggles, and state bindings.
"""

import sys
import os

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

def run_tests():
    print("[*] Menjalankan test_navbar_sync.py...")
    failures = []

    header_file = os.path.join(PROJECT_ROOT, "src", "ui", "components", "TopHeader.tsx")
    toolbar_file = os.path.join(PROJECT_ROOT, "src", "ui", "components", "BottomToolbar.tsx")
    store_file = os.path.join(PROJECT_ROOT, "src", "ui", "state", "useUIStore.ts")

    # 1. Check TopHeader
    if os.path.exists(header_file):
        with open(header_file, "r", encoding="utf-8") as f:
            content = f.read()
            # Confirm no bug tester button exists
            if "BugTesterModal" in content or "showBugTester" in content or "BugTester" in content:
                failures.append("TopHeader masih mereferensikan BugTester")
            else:
                print("  [PASS] TopHeader bersih dari tombol in-game Bug Tester")

            # Check necessary navbar elements
            expected_features = ["timeOfDay", "weather", "gridSnap", "setShowMissions", "setShowTutorial"]
            for feat in expected_features:
                if feat not in content:
                    failures.append(f"TopHeader kehilangan fitur navigasi: {feat}")
            print("  [PASS] TopHeader tersinkronisasi dengan state kontrol utama")
    else:
        failures.append("TopHeader.tsx tidak ditemukan")

    # 2. Check BottomToolbar
    if os.path.exists(toolbar_file):
        with open(toolbar_file, "r", encoding="utf-8") as f:
            content = f.read()
            expected_tools = ["select", "road", "build", "zone", "analyze"]
            for t in expected_tools:
                if f"'{t}'" not in content and f'"{t}"' not in content:
                    failures.append(f"BottomToolbar kehilangan alat: {t}")
            print("  [PASS] BottomToolbar memuat seluruh tab alat arsitektur")

            # Check Undo/Redo integration
            if "Undo2" in content and "Redo2" in content:
                print("  [PASS] Tombol Undo & Redo terpasang di toolbar navigasi")
            else:
                failures.append("BottomToolbar tidak memiliki tombol Undo/Redo")

            # Confirm system tools are moved out of BottomToolbar
            if "setShowSaveLoad" in content or "setShowSettings" in content or "setIsPhotoMode" in content:
                failures.append("BottomToolbar masih mengandung tombol sistem (harus dipisah ke samping)")
            else:
                print("  [PASS] BottomToolbar murni khusus untuk pembangunan kota (bebas dari utilitas sistem)")
    else:
        failures.append("BottomToolbar.tsx tidak ditemukan")

    # 3. Check SideUtilityDock separation & Settings gear icon
    side_dock_file = os.path.join(PROJECT_ROOT, "src", "ui", "components", "SideUtilityDock.tsx")
    settings_file = os.path.join(PROJECT_ROOT, "src", "ui", "components", "SettingsModal.tsx")
    if os.path.exists(side_dock_file):
        with open(side_dock_file, "r", encoding="utf-8") as f:
            content = f.read()
            if "HardDrive" in content and "Camera" in content and "Settings" in content:
                print("  [PASS] SideUtilityDock memuat Simpan/Muat, Mode Foto, dan Pengaturan dengan logo gerigi (Settings)")
            else:
                failures.append("SideUtilityDock kehilangan salah satu dari Simpan/Muat, Mode Foto, atau Settings")
    else:
        failures.append("SideUtilityDock.tsx tidak ditemukan")

    if os.path.exists(settings_file):
        with open(settings_file, "r", encoding="utf-8") as f:
            content = f.read()
            if "Settings" in content and "<Settings" in content:
                print("  [PASS] SettingsModal menggunakan logo gerigi standar (Settings)")
            else:
                failures.append("SettingsModal tidak menggunakan ikon gerigi Settings")
    else:
        failures.append("SettingsModal.tsx tidak ditemukan")

    # 4. Check State Store bindings
    if os.path.exists(store_file):
        with open(store_file, "r", encoding="utf-8") as f:
            content = f.read()
            if "canUndo" in content and "canRedo" in content and "setHistoryState" in content:
                print("  [PASS] useUIStore memiliki state history (canUndo, canRedo)")
            else:
                failures.append("useUIStore tidak memiliki definisi canUndo/canRedo")
    else:
        failures.append("useUIStore.ts tidak ditemukan")

    if failures:
        print("[-] GAGAL pada test_navbar_sync:")
        for fail in failures:
            print(f"    - {fail}")
        return False

    print("[+] test_navbar_sync: SEMUA LULUS\n")
    return True

if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)

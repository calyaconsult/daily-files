#!/usr/bin/env python3
"""Richtet das Repository «datei-archiv-browser» ein.

Legen Sie dieses Skript in denselben Ordner wie:
  index.html, script.js, README.md   (aus dieser Konversation)
  claude.css, daily-files.css, daily-files-gemini.css, files.json   (Ihre Originale)
und starten Sie:  python einrichten.py
"""
import shutil
import subprocess
from pathlib import Path

ZIEL = Path("datei-archiv-browser")

# Quelle -> Ziel (relativ zum Repository)
ZUORDNUNG = {
    "index.html": "index.html",
    "script.js": "js/script.js",
    "README.md": "README.md",
    "claude.css": "css/theme-claude.css",
    "daily-files.css": "css/theme-violett.css",
    "daily-files-gemini.css": "css/theme-gemini.css",
    "files.json": "data/files.json",
}

GITIGNORE = ".DS_Store\nThumbs.db\n*.log\n"

for quelle, ziel in ZUORDNUNG.items():
    q = Path(quelle)
    z = ZIEL / ziel
    if not q.exists():
        print(f"WARNUNG: {quelle} nicht gefunden - übersprungen")
        continue
    z.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(q, z)
    print(f"{quelle} -> {z}")

(ZIEL / ".gitignore").write_text(GITIGNORE, encoding="utf-8")

try:
    subprocess.run(["git", "init", "-b", "main"], cwd=ZIEL, check=True)
    subprocess.run(["git", "add", "."], cwd=ZIEL, check=True)
    subprocess.run(["git", "commit", "-m", "Erster Commit: Datei-Archiv-Browser"], cwd=ZIEL, check=True)
    print("\nGit-Repository erstellt. Auf GitHub veröffentlichen:")
    print("  cd datei-archiv-browser")
    print("  gh repo create calyaconsult/datei-archiv-browser --public --source=. --push")
except (OSError, subprocess.CalledProcessError) as fehler:
    print(f"\nGit-Schritt übersprungen ({fehler}). Ordner wurde trotzdem angelegt.")

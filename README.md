# Datei-Archiv-Browser

Eine kleine statische Webseite, die eine Dateiliste (`data/files.json`) einliest und **nach Tag und Dateiendung** (`.html`, `.md`, `.txt`) gruppiert darstellt – inklusive Statistik, Hinweis auf doppelte Dateinamen und JSON-Export.

## Struktur

```
datei-archiv-browser/
├── index.html            # Hauptseite (Deutsch)
├── js/
│   └── script.js         # Laden, Gruppieren und Darstellen der Daten
├── css/
│   ├── theme-claude.css  # Standard-Design
│   ├── theme-violett.css # Alternatives Design
│   └── theme-gemini.css  # Alternatives Design
├── data/
│   ├── files.json        # Dateiliste
│   └── tags.json         # Persistente Tag-Zuordnungen
├── scripts/
│   ├── get-file-info.ps1 # PowerShell-Skript zur Erzeugung von files.json & tags.json
│   └── repo-einrichten.py# Hilfsskript zum Einrichten des Repositories
├── .gitignore
└── README.md
```

## Lokal starten

Der Browser blockiert `fetch` auf `file://`-Adressen. Bitte daher einen kleinen Webserver verwenden:

```bash
python -m http.server 8000
```

Danach `http://localhost:8000` öffnen.

## Datenformat (`data/files.json`)

```json
[
  {
    "tag": "GITHUB",
    "path": "GitHub/calyaconsult.github.io/index.html",
    "name": "index.html",
    "extension": ".html",
    "lastMod": "2026-10-26T08:18:58",
    "sizeKB": 11.11
  }
]
```

Es werden nur Einträge mit den Endungen `.txt`, `.md` und `.html` und einem gültigen `lastMod`-Datum angezeigt.

## Konfiguration

Oben in `js/script.js`:

| Konstante            | Bedeutung                                                                                   |
|----------------------|---------------------------------------------------------------------------------------------|
| `ALLOWED_EXTENSIONS` | Angezeigte Dateiendungen                                                                    |
| `PROD_DIRECTORY`     | Regex für Produktionspfade (`.html`-Dateien darin werden ohne Link angezeigt)               |
| `LOCALE`             | Sprache für Datum und Zahlen (`de-CH`)                                                      |
| `DATA_URL`           | Pfad zur JSON-Datei                                                                         |
| `LINK_BASE`          | Basis für die Datei-Links (`/` = Serverwurzel)                                              |

**Hinweis zu GitHub Pages:** Als Projektseite (`https://<benutzer>.github.io/datei-archiv-browser/`) zeigt `LINK_BASE = '/'` auf die Wurzel von `<benutzer>.github.io`. Setzen Sie dann `LINK_BASE = '/datei-archiv-browser/'`.

## Design wechseln

In `index.html` die Zeile `<link rel="stylesheet" href="css/theme-claude.css">` auf `theme-violett.css` oder `theme-gemini.css` ändern.

## Skripte

Im Ordner `scripts/` befinden sich Skripte zur Automatisierung und Datenvorbereitung:

### `scripts/get-file-info.ps1`
PowerShell-Skript zum Scannen von Verzeichnissen und Generieren der Dateien `files.json` und `tags.json`.

* **Funktion**: Durchsucht rekursiv ein Basisverzeichnis nach Dateien (`.html`, `.txt`, `.md`), filtert nach Änderungsdatum (`CutOff`) und ignoriert bestimmte Pfade (z. B. `\HTML-Mirror\`). Vergibt Tags anhand von konfigurierbaren Regeln oder greift auf gespeicherte Tags aus `tags.json` zurück.
* **Parameter**:
  * `-BasePath`: Pfad zum durchsuchenden Verzeichnis (Standard: `C:\Users\<USER>\Documents`).
  * `-CutOff`: Stichtag für das Änderungsdatum (Standard: 1. Oktober des laufenden Jahres).
  * `-TagFile`: Pfad zur persistenten Tag-Datei (Standard: `tags.json` im Skriptordner).
  * `-OutFile`: Pfad zur Ausgabedatei (Standard: `files.json` im Skriptordner).

### `scripts/repo-einrichten.py`
Python-Hilfsskript zur initialen Strukturierung und Einrichtung des Repositories `datei-archiv-browser`.

* **Funktion**: Kopiert Quelldateien (`index.html`, `script.js`, Stylesheets, `files.json`, `README.md`) in die vorgegebene Zielordnerstruktur, legt eine `.gitignore`-Datei an und initialisiert optional ein Git-Repository mit einem ersten Commit.

## Veröffentlichen mit GitHub Pages

*Settings → Pages → Branch `main`, Ordner `/ (root)`*

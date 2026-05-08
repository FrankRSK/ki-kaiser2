# AGENTS.md - KI-Duell

## Projekt
Statisches Browser-Spiel (HTML/PHP/JS), keine Build-Tools, kein package.json.

## Architektur
- `index.html` - Einstiegspunkt, lädt `js/config.js`, `js/soundManager.js`, `js/game.js`
- `proxy.php` - Zentraler Backend-Proxy für externe APIs (Ollama, OpenAI, Anthropic, DeepSeek, TTS)
- `js/game.js` - Hauptlogik (`Game`-Klasse), verwaltet Spielzustand
- `js/config.js` - Konstanten (`GAME_CONFIG`), inkl. API-Endpoints, Modelle und Beschimpfungslisten
- `js/soundManager.js` - Audio-Feedback, Sounds in `assets/sounds/`
- `css/style.css` - Styling

## Voraussetzungen
- PHP-Server mit cURL-Extension (für `proxy.php`)
- Optional: Ollama auf `localhost:11434` (Default-Modell: `qwen2.5:7b`)
- Optional: TTS-Server starten: `/mnt/Daten/KI/qwen3-tts/venv/bin/python3 /mnt/Daten/KI/qwen3-tts/tts_server.py` (Port 8000)

## Wichtige Konventionen
- Kein Build-Step, keine Tests, kein Linter
- Spielzustand in `localStorage` (`kiDuellGameState`, `kiDuellSettings`)
- API-Keys werden clientseitig in `proxy.php` via POST-Body (`apiKey`) übergeben
- `proxy.php` vertraut keinem Input blind - prüft `endpoint` und `apiKey`
- Ollama-Modelle werden dynamisch via `proxy.php` (`ollama_models` Endpoint) geladen
- Sound-Effekte nutzen Web Audio API Fallback (MP3s in `assets/sounds/` optional)
- Lautstärke aller Soundeffekte: `audio.volume = 0.25` (damit TTS-Stimmen hörbar bleiben)

## UI-Struktur (`index.html`)
Drei Bereiche nebeneinander (CSS-Grid `1fr 320px 1fr`):
- **Links / Rechts**: Spieler-Sektion mit Ressourcen, Flottenstatus, Battleship-Grid
- **Mitte**: Steuerung (Start/Pause/Reset), Jahresanzeige, Marktpreise, Spiellog
- **Modals** (öffnen per Button in der Mitte):
  - `#settingsModal` — Spieler-Einstellungen + Audio-Skip (Button: ⚙ Einstellungen)
  - `#rulesModal` — Vollständiges Regelwerk als Tabellen (Button: ❓ Spielregeln)
  - `#endOverlay` — Spielende-Screen

## Sound-System (`js/soundManager.js`)
Jeder Event-Typ hat eine **Liste** von Sound-Dateien — beim Abspielen wird **zufällig einer** gewählt.
Neue Sounds einfach zur jeweiligen Array-Liste in `soundMap` hinzufügen.

| Event-Key       | Beschreibung                          |
|-----------------|---------------------------------------|
| `turn_start`    | Rundenbeginn                          |
| `economy`       | Wirtschaftliche Aktion (Münzen)       |
| `harvest`       | Ernte                                 |
| `famine`        | Hungersnot / Rebellion                |
| `fleet_buy`     | Flotte gekauft                        |
| `combat_cannon` | Kanonenschuss                         |
| `combat_splash` | Fehlschuss ins Wasser                 |
| `combat_hit`    | Treffer                               |
| `combat_sink`   | Schiff versenkt                       |

Sound-Quellen: `/mnt/Daten/Videos/Rohmaterial/Sounds/GDC/` und `.../Sound Effects library 1/`

## Spielmechanik-Übersicht

### Die Kernformel (analog „Kaiser")
> Mehr Korn → mehr Volk → kann mehr Land bewirtschaften → mehr Steuern/Korn → Flotte kaufen → Militärsieg

### Ressourcen und ihre Abhängigkeiten
- **Korn**: Saatgut + Ernährung + Flottenunterhalt. Ernte = `effFlaeche × ERNTE_PRO_LAND × Wetter`
- **Gold**: Steuern (pro Kopf) + Kornhandel + Landverkauf. Nie unter 0.
- **Bevölkerung**: wächst bei Ernährung ≥ `ERNAEHRUNG_WACHSTUM`×Bedarf, stirbt bei Hungersnot
- **Land**: begrenzt Bevölkerungs-Tragkapazität (`MAX_BEV_PRO_LAND=10`) und Erntepotenzial
- **Zufriedenheit**: sinkt bei Hunger und hohen Steuern; < `REBELLION_SCHWELLE` → Rebellion

### Ernte-Mechanik (Kaiser-Modell)
```
arbeiter      = bevoelkerung - flotten_besatzung
nutzbar_land  = min(land, floor(arbeiter × MAX_LAND_PRO_BEV))   // Arbeitskraft-begrenzt
eff_flaeche   = min(aussaat ÷ SAAT_PRO_LAND,  nutzbar_land)     // KI wählt Saatgutmenge
ernte         = eff_flaeche × ERNTE_PRO_LAND × wetter_faktor    // Wetter: 0.7–1.3 zufällig
```
- Flotten-Besatzung (`FLOTTE_BESATZUNG=10`) reduziert verfügbare Arbeiter
- Ernährungsminimum wird im Code **hart erzwungen** (KI kann nicht darunter gehen)
- Reihenfolge in `executeEconomy`: Ernährung → Aussaat → Steuern → Handel → Landmarkt → Flotte → Unterhalt

### Balance-Werte (in `js/config.js`)
| Konstante                 | Wert    | Hinweis                                        |
|---------------------------|---------|------------------------------------------------|
| `KORN_START`              | 250     | Startvorrat                                    |
| `GOLD_START`              | 100     | Startkapital                                   |
| `LAND_START`              | 40      | Startland (genug für 100 Bev × 5 Land/Person)  |
| `SAAT_PRO_LAND`           | 0.5     | Korn-Saatgutbedarf pro Landeinheit             |
| `ERNTE_PRO_LAND`          | 4.0     | Bruttoertrag Korn pro bestellter Fläche        |
| `WETTER_MIN/MAX`          | 0.7/1.3 | Ernte-Zufallsfaktor                            |
| `ERNAEHRUNG_PRO_KOPF`     | 1.2     | Korn-Grundbedarf pro Person/Runde              |
| `ERNAEHRUNG_WACHSTUM`     | 1.3×    | Ab diesem Vielfachen: Bevölkerungswachstum +5% |
| `ERNAEHRUNG_HUNGERSNOT`   | 0.6×    | Unter diesem Vielfachen: Hungersnot -12% Bev   |
| `MAX_LAND_PRO_BEV`        | 5       | 1 Person bewirtschaftet max. 5 Land            |
| `MAX_BEV_PRO_LAND`        | 10      | Tragkapazität: max. 10 Personen/Land           |
| `STEUERN_BASIS`           | 0.5     | Normaler Steuersatz Gold/Kopf                  |
| `STEUERN_MAX_PRO_KOPF`    | 2.0     | Maximum Gold/Kopf (darüber: -12 Zufriedenheit) |
| `HANDEL_KURS`             | 0.3     | Gold pro Korn beim Handel                      |
| `FLOTTE_GOLD_KOSTEN`      | 400     | ~4 Runden bei moderater Strategie erreichbar   |
| `FLOTTE_UNTERHALT_KORN`   | 20      | Korn/Runde Unterhalt                           |
| `FLOTTE_BESATZUNG`        | 10      | Arbeiter gebunden durch Flotte                 |
| `FLOTTE_VERFALL_SCHWELLE` | 2       | Jahre ohne Unterhalt → Schiff verfällt         |
| `FLOTTEN_DOMINANZ_SCHWELLE` | 5     | Jahre ohne Flotte (Gegner hat eine) → Niederlage |

### Flotten-Mechanik
- Kauf kostet `FLOTTE_GOLD_KOSTEN` Gold, platziert automatisch 5 Schiffe (Battleship-Grid 10×10)
- **Kampf nur möglich wenn BEIDE Spieler eine Flotte haben** — kein einseitiger Beschuss
- Flotten-Dominanz: Hat ein Spieler `FLOTTEN_DOMINANZ_SCHWELLE` Jahre lang allein eine Flotte,
  verliert der Gegner (geprüft in `_updateFlottenDominanz()`)
- KI-Prompt enthält gestaffelte Anreiz-Hinweise inkl. projiziertem Gold nach Steuern

### Rebellion / Herrscherwechsel
- Zufriedenheit < `REBELLION_SCHWELLE` (30%) → Ressourcenverlust jede Runde
- Zufriedenheit < `REBELLION_ABSETZUNG` (10%) für 2 aufeinanderfolgende Runden → neuer Herrscher,
  Name wechselt zufällig, Ressourcen auf 30-70% reduziert

### Sieg-Bedingungen (`checkWinConditions`)
1. Alle Schiffe des Gegners versenkt → Militärsieg
2. Wirtschaftlicher Kollaps (Bevölkerung ≤ 5, oder Gold=0 + Korn=0 + Bev≤5, oder 3 Rebellionsjahre)
3. Flotten-Dominanz nach `FLOTTEN_DOMINANZ_SCHWELLE` Jahren

## Grid-Darstellung (`css/style.css`)
- Zellgröße: `--cell-size: 24px`, Header: `--header-size: 18px` (per CSS-Variable anpassbar)
- Symbole in Zellen via `::after`-Pseudo-Element: ⛵ Schiff, 🔥 Treffer, 💧 Fehlschuss, 💀 versunken
- Animationen: `hitPulse` (Treffer), `sinkBlink` (Versenkung), `fleetBuyGlow` (Flottenkauf),
  `hitFlash` / `splashFlash` (temporäre JS-Klassen, gesetzt in `animateCell()` / `animateSink()`)

## Beschimpfungen (`js/config.js`)
Zwei Stufen, je nach `verbalAggression`-Einstellung (0–100):
- `BESCHIMPFUNGEN_MITTEL` (~30 Einträge): ab Aggressivität ≥ 50, historisch-herablassend
- `BESCHIMPFUNGEN_HOCH` (~50 Einträge): ab Aggressivität ≥ 80, explizit derb
Die KI wählt aus diesen Listen und kombiniert sie mit der historischen Rolle des Herrschers.

## API-Provider
Wählbar in UI: `ollama` (lokal), `openai`, `anthropic`, `deepseek`. Konfiguration in `js/config.js`.
Bei Ollama: Modell-Dropdown erscheint automatisch, Modelle werden von Ollama geladen.

## Gold-Mechanik (kein Bug)
Gold steigt durch Steuern × Bevölkerung + Korn-Handel. Nie unter 0 (Rebellion clampt auf 0).
Prompt-Limit für `handel` zeigt korrekt `korn - ernaehrung` (Aussaat wird ebenfalls abgezogen).
Bei großer Bevölkerung und viel Land kann 9999 Gold nach ~30 Runden erreicht werden —
verlangsamt durch `STEUERN_MAX_PRO_KOPF=2.0`, `HANDEL_KURS=0.3` und `ERNTE_PRO_LAND`-Flächen-Limit.

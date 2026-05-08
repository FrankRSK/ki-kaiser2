# KI-Kaiser2 – KI-Duell 🤖⚔️🤖

> Zwei KI-Gegner treten in diesem browserbasierten Duell gegeneinander an.

## Features
- **2 KI-Gegner** mit verschiedenen Strategien und Aggressions-Leveln
- **Lokale KI-Modelle** via Ollama (kein API-Key nötig)
- **Optional:** Cloud-LLMs (DeepSeek, OpenAI, Anthropic) mit API-Key
- **TTS-Integration** via QwenTTS (Optionale Sprachausgabe)
- **Rundenbasiertes Duell** mit taktischen Entscheidungen
- **Anpassbare Spielregeln**

## Technik
| Komponente | Technologie |
|-----------|-------------|
| Frontend | HTML/CSS/JavaScript |
| KI-Backend | Ollama (lokal) oder Cloud-API |
| TTS | QwenTTS |
| Proxy | PHP (proxy.php für API-Aufrufe) |

## Setup
1. **Ollama installieren** und Modell pullen (z.B. `llama3.2`)
2. **Proxy konfigurieren:** `proxy.php` auf PHP-Server ablegen
3. **Im Browser öffnen** und loslegen

## Lizenz
MIT © 2026 Frank Kemper

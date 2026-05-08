class Game {
  constructor() {
    this.state = this.getInitialState();
    this.currentPlayer = 1;
    this.currentYear = 1;
    this.isRunning = false;
    this.isProcessing = false;
    this.skipAudio = false;
    this.soundManager = new SoundManager();
    this.playerNames = { 1: 'Spieler 1', 2: 'Spieler 2' };
    // TTS-Stimmen: { 1: { type, speaker, ref_audio, ref_text }, 2: { ... } }
    this.playerVoices = { 1: null, 2: null };
    // Dynamische Marktpreise
    this.marktpreise = {
      land: GAME_CONFIG.LAND_PREIS_START,
      korn: GAME_CONFIG.KORN_PREIS_START
    };
    this.loadSettings();
  }

  // ─── NAMEN ────────────────────────────────────────────────────────────────
  assignRandomNames() {
    const shuffled = [...HERRSCHERNAMEN].sort(() => Math.random() - 0.5);
    this.playerNames[1] = shuffled[0];
    this.playerNames[2] = shuffled[1];
    this._updateNameHeaders();
  }

  assignNewNameForPlayer(playerNum) {
    // Wählt einen zufälligen Namen, der nicht bereits vergeben ist
    const other = playerNum === 1 ? 2 : 1;
    const usedName = this.playerNames[other];
    const available = HERRSCHERNAMEN.filter(n => n !== usedName);
    const newName = available[Math.floor(Math.random() * available.length)];
    this.playerNames[playerNum] = newName;
    this._updateNameHeaders();
    return newName;
  }

  _updateNameHeaders() {
    const h1 = document.querySelector('.player-header.p1');
    const h2 = document.querySelector('.player-header.p2');
    if (h1) h1.textContent = this.playerNames[1];
    if (h2) h2.textContent = this.playerNames[2];
  }

  playerName(num) {
    return this.playerNames[num] || `Spieler ${num}`;
  }

  // ─── STATE ────────────────────────────────────────────────────────────────
  getInitialState() {
    return {
      players: {
        1: this.createPlayerState(),
        2: this.createPlayerState()
      },
      settings: {
        player1: { strategicAggression: 50, verbalAggression: 50, apiProvider: 'ollama', apiKey: '', model: GAME_CONFIG.OLLAMA_MODEL },
        player2: { strategicAggression: 50, verbalAggression: 50, apiProvider: 'ollama', apiKey: '', model: GAME_CONFIG.OLLAMA_MODEL }
      }
    };
  }

  createPlayerState() {
    return {
      korn: GAME_CONFIG.KORN_START,
      gold: GAME_CONFIG.GOLD_START,
      bevoelkerung: GAME_CONFIG.BEVOELKERUNG_START,
      land: GAME_CONFIG.LAND_START,
      bevoelkerungZufriedenheit: 100,
      hatFlotte: false,
      schiffe: [],
      hitMap: [],
      feuerKarte: [],
      goldHistory: [],
      unterhaltRueckstand: 0,
      rebellionJahre: 0,        // aufeinanderfolgende Jahre unter Rebellions-Schwelle
      ohneFlotteJahre: 0,       // Jahre ohne eigene Flotte während Gegner eine hat
      gescheitert: false
    };
  }

  // ─── SETTINGS ─────────────────────────────────────────────────────────────
  loadSettings() {
    try {
      const saved = localStorage.getItem('kiDuellSettings');
      if (saved) {
        const parsed = JSON.parse(saved);
        this.state.settings = parsed.settings || this.state.settings;
        if (parsed.playerVoices) this.playerVoices = parsed.playerVoices;
      }
    } catch (e) {
      console.warn('Settings nicht geladen:', e);
    }
  }

  saveSettings() {
    try {
      localStorage.setItem('kiDuellSettings', JSON.stringify({
        settings: this.state.settings,
        playerVoices: this.playerVoices
      }));
    } catch (e) {
      console.warn('Settings nicht gespeichert:', e);
    }
  }

  saveGameState() {
    try {
      localStorage.setItem('kiDuellGameState', JSON.stringify({
        state: this.state,
        currentPlayer: this.currentPlayer,
        currentYear: this.currentYear,
        playerNames: this.playerNames,
        marktpreise: this.marktpreise
      }));
    } catch (e) {
      console.warn('Spielstand nicht gespeichert:', e);
    }
  }

  loadGameState() {
    try {
      const saved = localStorage.getItem('kiDuellGameState');
      if (saved) {
        const parsed = JSON.parse(saved);
        const currentSettings = this.state.settings;
        this.state = parsed.state;
        this.state.settings = currentSettings;
        this.currentPlayer = parsed.currentPlayer;
        this.currentYear = parsed.currentYear;
        if (parsed.playerNames) {
          this.playerNames = parsed.playerNames;
          this._updateNameHeaders();
        }
        if (parsed.marktpreise) this.marktpreise = parsed.marktpreise;
        return true;
      }
    } catch (e) {
      console.warn('Spielstand nicht geladen:', e);
    }
    return false;
  }

  clearGameState() {
    localStorage.removeItem('kiDuellGameState');
  }

  reset() {
    this.isRunning = false;
    this.currentPlayer = 1;
    this.currentYear = 1;
    this.playerNames = { 1: 'Spieler 1', 2: 'Spieler 2' };
    this.marktpreise = {
      land: GAME_CONFIG.LAND_PREIS_START,
      korn: GAME_CONFIG.KORN_PREIS_START
    };
    this.state = this.getInitialState();
    this.loadSettings();
    this.clearGameState();
    const h1 = document.querySelector('.player-header.p1');
    const h2 = document.querySelector('.player-header.p2');
    if (h1) h1.textContent = 'Spieler 1';
    if (h2) h2.textContent = 'Spieler 2';
    this.updateUI();
    this.log('Spiel zurückgesetzt. Bereit für neue Runde.');
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.isProcessing = false;
    this.currentYear = 1;
    this.currentPlayer = 1;
    this.assignRandomNames();
    this.log(`${this.playerName(1)} tritt gegen ${this.playerName(2)} an!`);
    this.log(`━━━ Jahr ${this.currentYear} beginnt ━━━`);
    this.log(`Marktpreise: Land=${this.marktpreise.land.toFixed(1)} Gold, Korn=${this.marktpreise.korn.toFixed(2)} Gold`);
    this.processTurn();
  }

  pause() {
    this.isRunning = false;
    this.log('Spiel pausiert.');
  }

  // ─── MARKTPREISE ──────────────────────────────────────────────────────────
  updateMarktpreise(landKaufMenge, landVerkaufMenge, kornKaufMenge, kornVerkaufMenge) {
    // Nachfrage treibt Preise hoch, Angebot drückt sie runter
    const landDelta = (landKaufMenge - landVerkaufMenge) * 0.3;
    const kornDelta = (kornKaufMenge - kornVerkaufMenge) * 0.05;

    // Zufällige Marktschwankung (±10%)
    const landRnd = (Math.random() - 0.5) * this.marktpreise.land * 0.10;
    const kornRnd = (Math.random() - 0.5) * this.marktpreise.korn * 0.10;

    this.marktpreise.land = this.clamp(
      this.marktpreise.land + landDelta + landRnd,
      GAME_CONFIG.LAND_PREIS_MIN, GAME_CONFIG.LAND_PREIS_MAX
    );
    this.marktpreise.korn = this.clamp(
      this.marktpreise.korn + kornDelta + kornRnd,
      GAME_CONFIG.KORN_PREIS_MIN, GAME_CONFIG.KORN_PREIS_MAX
    );
  }

  // ─── ZUGE ─────────────────────────────────────────────────────────────────
  async processTurn() {
    if (!this.isRunning || this.isProcessing) return;
    this.isProcessing = true;

    await this.soundManager.play('turn_start');
    await this.delay(GAME_CONFIG.TURN_DELAY_MS);

    const playerState = this.state.players[this.currentPlayer];
    const opponentNum = this.currentPlayer === 1 ? 2 : 1;
    const opponentState = this.state.players[opponentNum];

    if (playerState.gescheitert) {
      this.log(`${this.playerName(this.currentPlayer)} ist bereits ausgeschieden.`);
      this.nextTurn();
      return;
    }

    const prompt = this.buildPrompt(this.currentPlayer, playerState, opponentState);

    let kiResponse = null;
    let retries = 0;
    const settings = this.state.settings[`player${this.currentPlayer}`];

    while (retries < GAME_CONFIG.MAX_RETRIES && !kiResponse) {
      try {
        const rawResponse = await this.sendToOllama(prompt, settings);
        kiResponse = this.parseJSON(rawResponse, this.currentPlayer);
      } catch (e) {
        retries++;
        this.log(`Fehler bei ${this.playerName(this.currentPlayer)} (Versuch ${retries}/${GAME_CONFIG.MAX_RETRIES}): ${e.message}`);
        if (retries >= GAME_CONFIG.MAX_RETRIES) {
          kiResponse = this.getFallbackResponse(this.currentPlayer);
        }
      }
    }

    if (!kiResponse) {
      kiResponse = this.getFallbackResponse(this.currentPlayer);
    }

    this.executeEconomy(this.currentPlayer, kiResponse);
    this.executeCombat(this.currentPlayer, kiResponse, opponentNum);
    this.checkRebellion(this.currentPlayer);

    playerState.goldHistory.push(playerState.gold);

    await this.updateUI();
    this.saveGameState();

    if (kiResponse.dialog) {
      const ttsText = kiResponse.dialog.length > 150
        ? kiResponse.dialog.substring(0, 147) + '...'
        : kiResponse.dialog;
      await this.playTTS(ttsText, this.currentPlayer);
    }

    const p1 = this.state.players[1];
    const p2 = this.state.players[2];
    const winner = this.checkWinConditions();
    if (winner) {
      if (winner.winner !== 1) p2.gescheitert = true;
      if (winner.winner !== 2) p1.gescheitert = true;
      this.endGame(winner);
      return;
    }

    if (this.isCollapsed(playerState)) {
      playerState.gescheitert = true;
      this.log(`${this.playerName(this.currentPlayer)} ist kollabiert!`);
    }

    this.nextTurn();
  }

  nextTurn() {
    this.isProcessing = false;
    if (!this.isRunning) return;

    if (this.currentPlayer === 1) {
      this.currentPlayer = 2;
    } else {
      this.currentYear++;
      this.currentPlayer = 1;
      // Marktpreise jährlich aktualisieren (ohne konkreten Kauf/Verkauf = reine Schwankung)
      this.updateMarktpreise(0, 0, 0, 0);
      // Flotten-Dominanz-Zähler: beide Spieler jährlich prüfen
      this._updateFlottenDominanz();
      this.log(`━━━ Jahr ${this.currentYear} beginnt ━━━`);
      this.log(`Marktpreise: Land=${this.marktpreise.land.toFixed(1)} Gold, Korn=${this.marktpreise.korn.toFixed(2)} Gold`);
    }

    setTimeout(() => this.processTurn(), GAME_CONFIG.TURN_DELAY_MS);
  }

  // ─── FLOTTEN-DOMINANZ ────────────────────────────────────────────────────
  _updateFlottenDominanz() {
    const p1 = this.state.players[1];
    const p2 = this.state.players[2];

    // Spieler 1 ohne Flotte, Spieler 2 mit Flotte
    if (!p1.hatFlotte && p2.hatFlotte) {
      p1.ohneFlotteJahre = (p1.ohneFlotteJahre || 0) + 1;
      const verbleibend = GAME_CONFIG.FLOTTEN_DOMINANZ_SCHWELLE - p1.ohneFlotteJahre;
      if (p1.ohneFlotteJahre >= GAME_CONFIG.FLOTTEN_DOMINANZ_SCHWELLE) {
        // Niederlage wird in checkWinConditions ausgewertet – hier nur Log
        this.log(`*** ${this.playerName(1)} hat seit ${p1.ohneFlotteJahre} Jahren keine Flotte — ${GAME_CONFIG.FLOTTEN_DOMINANZ_SCHWELLE} Jahre sind die Grenze!`);
      } else {
        this.log(`⚠ ${this.playerName(1)}: Noch ${verbleibend} Jahr(e) ohne Flotte — dann Niederlage durch Flotten-Dominanz!`);
      }
    } else {
      p1.ohneFlotteJahre = 0;
    }

    // Spieler 2 ohne Flotte, Spieler 1 mit Flotte
    if (!p2.hatFlotte && p1.hatFlotte) {
      p2.ohneFlotteJahre = (p2.ohneFlotteJahre || 0) + 1;
      const verbleibend = GAME_CONFIG.FLOTTEN_DOMINANZ_SCHWELLE - p2.ohneFlotteJahre;
      if (p2.ohneFlotteJahre >= GAME_CONFIG.FLOTTEN_DOMINANZ_SCHWELLE) {
        this.log(`*** ${this.playerName(2)} hat seit ${p2.ohneFlotteJahre} Jahren keine Flotte — ${GAME_CONFIG.FLOTTEN_DOMINANZ_SCHWELLE} Jahre sind die Grenze!`);
      } else {
        this.log(`⚠ ${this.playerName(2)}: Noch ${verbleibend} Jahr(e) ohne Flotte — dann Niederlage durch Flotten-Dominanz!`);
      }
    } else {
      p2.ohneFlotteJahre = 0;
    }
  }

  // ─── REBELLIONS-LOGIK ─────────────────────────────────────────────────────
  checkRebellion(playerNum) {
    const player = this.state.players[playerNum];
    if (player.gescheitert) return;

    const zufriedenheit = player.bevoelkerungZufriedenheit;

    // Kritische Schwelle → Absetzung
    if (zufriedenheit <= GAME_CONFIG.REBELLION_ABSETZUNG) {
      player.rebellionJahre = (player.rebellionJahre || 0) + 1;

      if (player.rebellionJahre >= 2) {
        // Herrscher wird abgesetzt
        const alterName = this.playerName(playerNum);
        const neuerName = this.assignNewNameForPlayer(playerNum);
        this.log(`*** AUFSTAND! Das Volk von ${alterName} hat genug! Der Tyrann wird gestürzt!`);
        this.log(`*** Ein neuer Herrscher besteigt den Thron: ${neuerName}!`);
        this.soundManager.play('famine');

        // Ressourcen auf Minimalwerte setzen
        player.gold = Math.max(0, Math.floor(player.gold * 0.3));
        player.korn = Math.max(10, Math.floor(player.korn * 0.3));
        player.bevoelkerung = Math.max(GAME_CONFIG.BEVOELKERUNG_MINIMUM, Math.floor(player.bevoelkerung * 0.7));
        player.bevoelkerungZufriedenheit = 40; // Neuer Herrscher, etwas Hoffnung
        player.rebellionJahre = 0;

        this.log(`${neuerName} beginnt mit: Korn=${Math.round(player.korn)}, Gold=${Math.round(player.gold)}, Bevölkerung=${Math.round(player.bevoelkerung)}`);
        this._updateNameHeaders();
        return;
      }
    } else {
      player.rebellionJahre = 0;
    }

    // Rebellion-Schaden (unter Schwelle aber noch nicht abgesetzt)
    if (zufriedenheit < GAME_CONFIG.REBELLION_SCHWELLE) {
      const kornVerlust = GAME_CONFIG.REBELLION_KORN_KOSTEN;
      const goldVerlust = GAME_CONFIG.REBELLION_GOLD_KOSTEN;
      const bevVerlust = Math.round(player.bevoelkerung * GAME_CONFIG.REBELLION_BEV_VERLUST);

      player.korn = Math.max(0, player.korn - kornVerlust);
      player.gold = Math.max(0, player.gold - goldVerlust);
      player.bevoelkerung = Math.max(GAME_CONFIG.BEVOELKERUNG_MINIMUM, player.bevoelkerung - bevVerlust);

      this.soundManager.play('famine');
      this.log(`${this.playerName(playerNum)}: REBELLION! Unruhen kosten -${kornVerlust} Korn, -${goldVerlust} Gold, -${bevVerlust} Bevölkerung (Zufriedenheit: ${Math.round(zufriedenheit)}%)`);
    }
  }

  // ─── PROMPT ───────────────────────────────────────────────────────────────
  buildPrompt(playerNum, playerState, opponentState) {
    const settings = this.state.settings[`player${playerNum}`];
    const hitMapText = this.formatHitMap(playerState.hitMap);
    const feuerKarteText = this.formatFeuerKarte(playerState.feuerKarte);
    const opponentName = this.playerName(playerNum === 1 ? 2 : 1);
    const verbalAggression = settings.verbalAggression;

    // Verbale Aggressivitäts-Anweisung
    let verbalAnweisung = '';
    if (verbalAggression >= 80) {
      const beschimpfungen = BESCHIMPFUNGEN_HOCH.join('" / "');
      verbalAnweisung = `\nVERBALE AGGRESSIVITÄT IST EXTREM HOCH (${verbalAggression}/100): Dein Dialog MUSS echte, derbe Beschimpfungen enthalten! Nutze echte Kraftausdrücke ohne jede Zurückhaltung. Beispiele: "${beschimpfungen}". Kombiniere diese mit deiner historischen Rolle. KEINE weichen Formulierungen!`;
    } else if (verbalAggression >= 50) {
      const beschimpfungen = BESCHIMPFUNGEN_MITTEL.join('" / "');
      verbalAnweisung = `\nVerbale Aggressivität ist hoch (${verbalAggression}/100): Nutze scharfe Beleidigungen. Beispiele: "${beschimpfungen}"`;
    } else if (verbalAggression >= 25) {
      verbalAnweisung = `\nVerbale Aggressivität ist mittel (${verbalAggression}/100): Sprich herablassend und spöttisch zu deinem Gegner.`;
    } else {
      verbalAnweisung = `\nVerbale Aggressivität ist niedrig (${verbalAggression}/100): Sprich würdevoll und reserviert.`;
    }

    // Land & Korn Marktpreise
    const landMarktInfo = `\nAKTUELLE MARKTPREISE: Land kostet ${this.marktpreise.land.toFixed(1)} Gold/Einheit, Korn-Markt: ${this.marktpreise.korn.toFixed(2)} Gold/Korn.`;

    const systemPrompt = `Du bist der historische Herrscher "${this.playerName(playerNum)}" in einem Strategiespiel. Dein Gegner ist "${opponentName}".
Deine strategische Aggressivität beträgt ${settings.strategicAggression}/100.
Deine verbale Aggressivität beträgt ${verbalAggression}/100.
${verbalAnweisung}

WIRTSCHAFTSREGELN (alle Werte für diese Runde):
${(() => {
  const besatzung = playerState.hatFlotte ? GAME_CONFIG.FLOTTE_BESATZUNG : 0;
  const arbeiter  = Math.max(0, Math.round(playerState.bevoelkerung) - besatzung);
  const nutzbarLand = Math.min(Math.round(playerState.land||0), Math.floor(arbeiter * GAME_CONFIG.MAX_LAND_PRO_BEV));
  const maxSaat   = (nutzbarLand * GAME_CONFIG.SAAT_PRO_LAND).toFixed(0);
  const minEss    = Math.ceil(playerState.bevoelkerung * GAME_CONFIG.ERNAEHRUNG_PRO_KOPF);
  const minEssPfl = Math.ceil(minEss * GAME_CONFIG.ERNAEHRUNG_HUNGERSNOT);
  const maxSaatVollAussaat = nutzbarLand * GAME_CONFIG.SAAT_PRO_LAND;
  const maxHandel = Math.max(0, Math.round(playerState.korn) - minEssPfl - maxSaatVollAussaat);
  const maxBev    = Math.round((playerState.land||0) * GAME_CONFIG.MAX_BEV_PRO_LAND);
  return `- Nutzbare Fläche: ${nutzbarLand}/${Math.round(playerState.land||0)} Land (${arbeiter} Arbeiter × max.${GAME_CONFIG.MAX_LAND_PRO_BEV} Land/Person${besatzung>0?' — '+besatzung+' in Flottenbesatzung':''})
- Tragkapazität: max. ${maxBev} Personen auf ${Math.round(playerState.land||0)} Land
- steuern (0–${Math.round(playerState.bevoelkerung * GAME_CONFIG.STEUERN_MAX_PRO_KOPF)}): Gold von der Bevölkerung — IMMER setzen, du brauchst Gold!
- ernaehrung (PFLICHT min. ${minEssPfl}): Korn pro Runde für dein Volk
  → Unter ${minEssPfl} (60%): schwere Hungersnot -12% Bev!
  → ${minEssPfl}–${Math.ceil(minEss * 0.85)} (60–85%): leichte Hungersnot -6% Bev, -Zufriedenheit
  → ${Math.ceil(minEss * 0.85)}–${minEss} (85–100%): knapp, +1% Wachstum
  → ${minEss}–${Math.ceil(minEss * GAME_CONFIG.ERNAEHRUNG_WACHSTUM)} (100–130%): +2% Wachstum
  → Ab ${Math.ceil(minEss * GAME_CONFIG.ERNAEHRUNG_WACHSTUM)} (130%): +5% Wachstum + Zufriedenheit
- aussaat (0–${maxSaat}): Saatgut aus Korn-Vorrat → Ernte = Fläche × ${GAME_CONFIG.ERNTE_PRO_LAND} × Wetter(${GAME_CONFIG.WETTER_MIN}–${GAME_CONFIG.WETTER_MAX})
  Effektive Fläche = aussaat ÷ ${GAME_CONFIG.SAAT_PRO_LAND} Land (max. nutzbare Fläche)
- handel (0–${maxHandel}): Korn zu Gold (${GAME_CONFIG.HANDEL_KURS} Gold/Korn, erst nach Ernährung)
- kaufLand / verkaufLand: Marktpreis ${this.marktpreise.land.toFixed(1)} Gold/Einheit
- kaufFlotte: true für Flotte (${GAME_CONFIG.FLOTTE_GOLD_KOSTEN} Gold, ${GAME_CONFIG.FLOTTE_BESATZUNG} Besatzung, ${GAME_CONFIG.FLOTTE_UNTERHALT_KORN} Korn/Runde Unterhalt)
- angriff: Koordinate oder null (nur wenn BEIDE Spieler Flotten haben)
- dialog: max. 1 Satz, max. 120 Zeichen${verbalAggression >= 50 ? ' — MUSS Beleidigung enthalten!' : ''}`;
})()}

REIHENFOLGE: 1. ernaehrung setzen  2. aussaat setzen  3. steuern setzen  4. handel wenn Überschuss
${landMarktInfo}`;

    // Flottenanreiz: gestaffelt nach Dringlichkeit
    // Projiziertes Gold = aktuelles Gold + maximale Steuereinnahmen dieser Runde
    const maxSteuernDieserRunde = Math.round(playerState.bevoelkerung * GAME_CONFIG.STEUERN_MAX_PRO_KOPF);
    const projizierteGold = Math.round(playerState.gold) + maxSteuernDieserRunde;
    const opponentHatFlotte = this.state.players[playerNum === 1 ? 2 : 1].hatFlotte;
    let flotteKaufHinweis = '';
    if (!playerState.hatFlotte) {
      const goldFehlt = GAME_CONFIG.FLOTTE_GOLD_KOSTEN - Math.round(playerState.gold);
      const kannNachSteuernKaufen = projizierteGold >= GAME_CONFIG.FLOTTE_GOLD_KOSTEN;
      if (playerState.gold >= GAME_CONFIG.FLOTTE_GOLD_KOSTEN || kannNachSteuernKaufen) {
        if (opponentHatFlotte) {
          flotteKaufHinweis = `\n⚔ DRINGEND: Dein Gegner hat bereits eine Flotte! Du kannst dich NICHT wehren solange du keine Flotte hast. KAUFE SOFORT eine Flotte (kaufFlotte: true) — nach Steuern hast du ca. ${projizierteGold} Gold, Kosten: ${GAME_CONFIG.FLOTTE_GOLD_KOSTEN} Gold!`;
        } else {
          flotteKaufHinweis = `\n⚓ JETZT KAUFEN: Du kannst dir diese Runde eine Flotte leisten! Nach Steuern ca. ${projizierteGold} Gold, Kosten: ${GAME_CONFIG.FLOTTE_GOLD_KOSTEN} Gold. Eine Flotte ist der EINZIGE Weg zum Militärsieg. Setze kaufFlotte: true — der Kauf wird nach den Steuern ausgeführt.`;
        }
      } else if (goldFehlt <= 150) {
        flotteKaufHinweis = `\n⚓ Fast genug Gold für eine Flotte! Noch ca. ${Math.max(0, GAME_CONFIG.FLOTTE_GOLD_KOSTEN - projizierteGold)} Gold fehlen nach Steuern (Kosten: ${GAME_CONFIG.FLOTTE_GOLD_KOSTEN}). Nächste Runde kaufen!`;
      } else if (opponentHatFlotte) {
        flotteKaufHinweis = `\n⚠ GEFAHR: Dein Gegner hat eine Flotte, du nicht! Spare Gold für eine eigene Flotte (${GAME_CONFIG.FLOTTE_GOLD_KOSTEN} Gold) — aktuell nach Steuern ca. ${projizierteGold} Gold.`;
      } else {
        flotteKaufHinweis = `\n⚓ Ziel: Eine Flotte kostet ${GAME_CONFIG.FLOTTE_GOLD_KOSTEN} Gold — spare gezielt darauf hin. Du hast aktuell ${Math.round(playerState.gold)} Gold (nach Steuern ca. ${projizierteGold}).`;
      }
    }
    const flotteUnterhaltHinweis = playerState.hatFlotte
      ? `\nFlotten-Unterhalt: ${GAME_CONFIG.FLOTTE_UNTERHALT_KORN} Korn/Jahr (wird automatisch abgezogen). Nicht bezahlter Unterhalt beschädigt die Flotte!`
      : '';

    const rebellionWarnung = playerState.bevoelkerungZufriedenheit < GAME_CONFIG.REBELLION_SCHWELLE
      ? `\n⚠ WARNUNG: Dein Volk rebelliert bereits! Zufriedenheit: ${Math.round(playerState.bevoelkerungZufriedenheit)}%. Erhöhe Ernährung und senke Steuern sofort!`
      : (playerState.bevoelkerungZufriedenheit < 50
        ? `\n⚠ Zufriedenheit niedrig (${Math.round(playerState.bevoelkerungZufriedenheit)}%). Gefahr von Unruhen!`
        : '');

    const angriffMoeglich = playerState.hatFlotte && opponentState.hatFlotte;
    const besatzung = playerState.hatFlotte ? GAME_CONFIG.FLOTTE_BESATZUNG : 0;
    const arbeiter  = Math.max(0, Math.round(playerState.bevoelkerung) - besatzung);
    const nutzbarLand = Math.min(Math.round(playerState.land||0), Math.floor(arbeiter * GAME_CONFIG.MAX_LAND_PRO_BEV));
    const maxBev    = Math.round((playerState.land||0) * GAME_CONFIG.MAX_BEV_PRO_LAND);

    const userPrompt = `Jahr ${this.currentYear} — ${this.playerName(playerNum)}
Deine Lage:
  Korn: ${Math.round(playerState.korn)} | Gold: ${Math.round(playerState.gold)} | Bev: ${Math.round(playerState.bevoelkerung)}/${maxBev}(max)
  Land: ${Math.round(playerState.land||0)} (nutzbar: ${nutzbarLand}, Arbeiter: ${arbeiter}${besatzung>0?' inkl. '+besatzung+' Besatzung':''})
  Zufriedenheit: ${Math.round(playerState.bevoelkerungZufriedenheit)}%${rebellionWarnung}
  Flotte: ${playerState.hatFlotte ? `Ja — ${playerState.schiffe.filter(s=>!s.versenkt).length}/${playerState.schiffe.length} Schiffe` : 'Nein'}${playerState.unterhaltRueckstand > 0 ? ` (Unterhalt ${playerState.unterhaltRueckstand} J. rückständig!)` : ''}
${flotteUnterhaltHinweis}${flotteKaufHinweis}
Gegner (${opponentName}):
  Korn: ${Math.round(opponentState.korn)} | Gold: ${Math.round(opponentState.gold)} | Bev: ${Math.round(opponentState.bevoelkerung)} | Land: ${Math.round(opponentState.land||0)}
  Flotte: ${opponentState.hatFlotte ? 'Ja' : 'Nein'}
Angriff möglich: ${angriffMoeglich ? 'JA' : 'NEIN'}
Treffer/Fehlschüsse: ${hitMapText || '—'} | Schon beschossen: ${feuerKarteText || '—'}

Antworte NUR mit JSON: {"steuern":200,"aussaat":18,"ernaehrung":130,"handel":0,"kaufLand":0,"verkaufLand":0,"kaufFlotte":false,"angriff":null,"dialog":"Beispieltext"}
Beim Angriff: Setze "angriff" auf eine Koordinate (Buchstabe A–J + Zahl 1–10, z.B. "C3", "H7", "J10") oder null. Vermeide bereits beschossene Felder.`;

    return { system: systemPrompt, user: userPrompt };
  }

  formatHitMap(hitMap) {
    if (!hitMap || hitMap.length === 0) return '';
    const treffer = hitMap.filter(h => h.result === 'treffer').map(h => h.coord);
    const fehlschuss = hitMap.filter(h => h.result === 'fehlschuss').map(h => h.coord);
    let text = '';
    if (treffer.length) text += `Treffer: ${treffer.join(', ')} `;
    if (fehlschuss.length) text += `Fehlschuss: ${fehlschuss.join(', ')}`;
    return text;
  }

  formatFeuerKarte(feuerKarte) {
    return feuerKarte ? feuerKarte.join(', ') : '';
  }

  // ─── API-AUFRUF ───────────────────────────────────────────────────────────
  async sendToOllama(prompt, settings) {
    if (settings.apiProvider === 'ollama') {
      const response = await fetch(GAME_CONFIG.PROXY_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: 'ollama',
          model: settings.model || GAME_CONFIG.OLLAMA_MODEL,
          system: prompt.system,
          prompt: prompt.user
        })
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      return data.response || data.text || data.message || '';
    } else if (settings.apiProvider === 'openai' && settings.apiKey) {
      const response = await fetch(GAME_CONFIG.PROXY_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: 'openai',
          apiKey: settings.apiKey,
          model: 'gpt-3.5-turbo',
          system: prompt.system,
          prompt: prompt.user
        })
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      return data.choices?.[0]?.message?.content || '';
    } else if (settings.apiProvider === 'anthropic' && settings.apiKey) {
      const response = await fetch(GAME_CONFIG.PROXY_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: 'anthropic',
          apiKey: settings.apiKey,
          model: 'claude-3-haiku-20240307',
          system: prompt.system,
          prompt: prompt.user
        })
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      return data.content?.[0]?.text || '';
    } else if (settings.apiProvider === 'deepseek' && settings.apiKey) {
      const response = await fetch(GAME_CONFIG.PROXY_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: 'deepseek',
          apiKey: settings.apiKey,
          model: 'deepseek-chat',
          system: prompt.system,
          prompt: prompt.user
        })
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      return data.choices?.[0]?.message?.content || '';
    }
    throw new Error('Unbekannter API-Provider');
  }

  parseJSON(raw, playerNum) {
    if (!raw) return null;
    let cleaned = raw.trim();
    cleaned = cleaned.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace === -1 || lastBrace === -1) return null;
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
    return JSON.parse(cleaned);
  }

  getFallbackResponse(playerNum) {
    const player = this.state.players[playerNum];
    const minErnaehrung = Math.ceil(player.bevoelkerung * GAME_CONFIG.ERNAEHRUNG_PRO_KOPF);
    // Wachstumsniveau: 130% des Grundbedarfs, begrenzt durch verfügbares Korn
    const wachstumsErnaehrung = Math.min(
      Math.ceil(minErnaehrung * GAME_CONFIG.ERNAEHRUNG_WACHSTUM),
      player.korn
    );
    const ernaehrungFallback = Math.max(minErnaehrung, wachstumsErnaehrung);
    const aussaatFallback = Math.round(player.korn * 0.3);
    return {
      steuern: Math.round(player.bevoelkerung * 0.5),
      aussaat: aussaatFallback,
      ernaehrung: ernaehrungFallback,
      handel: Math.max(0, Math.round(player.korn - ernaehrungFallback - aussaatFallback)),
      kaufLand: 0,
      verkaufLand: 0,
      angriff: null,
      dialog: `[Automatischer Zug - ${this.playerName(playerNum)}]`
    };
  }

  // ─── WIRTSCHAFT (Kaiser-Modell) ───────────────────────────────────────────
  executeEconomy(playerNum, decision) {
    const player = this.state.players[playerNum];
    if (player.gescheitert) return;

    const bevVorRunde = player.bevoelkerung;
    const landVorRunde = player.land || 0;

    // ── 1. Nutzbare Fläche (Arbeitskraft-begrenzt) ──────────────────────────
    // Flotten-Besatzung bindet Arbeitskräfte
    const besatzung = player.hatFlotte ? GAME_CONFIG.FLOTTE_BESATZUNG : 0;
    const arbeiter  = Math.max(0, bevVorRunde - besatzung);
    const nutzbarLand = Math.min(landVorRunde, Math.floor(arbeiter * GAME_CONFIG.MAX_LAND_PRO_BEV));

    // ── 2. Steuern ──────────────────────────────────────────────────────────
    const steuern = this.clamp(
      decision.steuern || 0, 0,
      bevVorRunde * GAME_CONFIG.STEUERN_MAX_PRO_KOPF
    );

    // ── 3. Ernährung: Minimum hart erzwingen ────────────────────────────────
    const minEss        = Math.ceil(bevVorRunde * GAME_CONFIG.ERNAEHRUNG_PRO_KOPF);
    const minEssPflicht = Math.ceil(minEss * GAME_CONFIG.ERNAEHRUNG_HUNGERSNOT); // Absolutes Minimum
    // KI-Ernährungswunsch, mindestens Pflicht, maximal verfügbarer Korn
    const ernaehrung = this.clamp(
      Math.max(decision.ernaehrung || 0, minEssPflicht),
      minEssPflicht,
      player.korn
    );

    // ── 4. Aussaat: begrenzt durch Korn-Rest und nutzbare Fläche ────────────
    const kornNachEss  = Math.max(0, player.korn - ernaehrung);
    const maxSaatgut   = nutzbarLand * GAME_CONFIG.SAAT_PRO_LAND; // Flächen-Limit
    const kiAussaat    = this.clamp(decision.aussaat || 0, 0, Math.min(kornNachEss, maxSaatgut));
    const aussaat      = kiAussaat;

    // ── 5. Handel: nur was nach Saat und Ernährung übrig ist ────────────────
    const kornNachSaat = Math.max(0, kornNachEss - aussaat);
    const handel       = this.clamp(decision.handel || 0, 0, kornNachSaat);

    // ── 6. Ernte mit Wetterzufall ────────────────────────────────────────────
    const effFlaeche = aussaat > 0
      ? Math.min(aussaat / GAME_CONFIG.SAAT_PRO_LAND, nutzbarLand)
      : 0;
    const wetter = GAME_CONFIG.WETTER_MIN +
      Math.random() * (GAME_CONFIG.WETTER_MAX - GAME_CONFIG.WETTER_MIN);
    const ernte = Math.round(effFlaeche * GAME_CONFIG.ERNTE_PRO_LAND * wetter);

    // Wetter im Log festhalten
    const wetterText = wetter < 0.85 ? 'Schlechte Ernte' : wetter > 1.15 ? 'Reiche Ernte' : 'Normale Ernte';

    // ── 7. Ressourcen aktualisieren ─────────────────────────────────────────
    player.gold += steuern + handel * GAME_CONFIG.HANDEL_KURS;
    player.korn  = player.korn - ernaehrung - aussaat - handel + ernte;

    // ── 8. Landmarkt ────────────────────────────────────────────────────────
    const kaufLand    = Math.max(0, Math.floor(decision.kaufLand    || 0));
    const verkaufLand = Math.max(0, Math.floor(decision.verkaufLand || 0));
    let tatsaechlichKauf = 0, tatsaechlichVerkauf = 0;

    if (kaufLand > 0) {
      const maxKaufbar = Math.floor(player.gold / this.marktpreise.land);
      tatsaechlichKauf = Math.min(kaufLand, maxKaufbar, GAME_CONFIG.MAX_LAND - landVorRunde);
      if (tatsaechlichKauf > 0) {
        player.gold -= tatsaechlichKauf * this.marktpreise.land;
        player.land  = landVorRunde + tatsaechlichKauf;
        this.log(`${this.playerName(playerNum)}: +${tatsaechlichKauf} Land gekauft (${(tatsaechlichKauf * this.marktpreise.land).toFixed(0)} Gold, ${this.marktpreise.land.toFixed(1)}/Einheit)`);
      }
    }
    if (verkaufLand > 0) {
      tatsaechlichVerkauf = Math.min(verkaufLand, player.land || 0);
      if (tatsaechlichVerkauf > 0) {
        player.gold += tatsaechlichVerkauf * this.marktpreise.land;
        player.land  = (player.land || 0) - tatsaechlichVerkauf;
        this.log(`${this.playerName(playerNum)}: -${tatsaechlichVerkauf} Land verkauft (+${(tatsaechlichVerkauf * this.marktpreise.land).toFixed(0)} Gold)`);
      }
    }
    if (tatsaechlichKauf > 0 || tatsaechlichVerkauf > 0) {
      this.updateMarktpreise(tatsaechlichKauf, tatsaechlichVerkauf, 0, 0);
    }

    // ── 9. Bevölkerung & Zufriedenheit ──────────────────────────────────────
    // Graduelles Modell: Wachstumsrate skaliert proportional zur Ernährungsquote
    //   ernQuote < 0.6              → Schwere Hungersnot: -12% Bev, -20 Zufriedenheit
    //   0.6 ≤ ernQuote < 0.85      → Leichte Hungersnot: -6% Bev, -8 Zufriedenheit
    //   0.85 ≤ ernQuote < 1.0      → Knapp: minimales Wachstum (+1%), -2 Zufriedenheit
    //   1.0 ≤ ernQuote < 1.3       → Normal: moderates Wachstum (+2%), neutral
    //   ernQuote ≥ 1.3             → Überschuss: volles Wachstum (+5%), +5 Zufriedenheit
    const ernQuote = ernaehrung / minEss; // 1.0 = genau Bedarf gedeckt
    if (ernQuote < GAME_CONFIG.ERNAEHRUNG_HUNGERSNOT) {
      // Schwere Hungersnot
      const verlust = Math.round(bevVorRunde * GAME_CONFIG.BEV_HUNGERTOD_RATE);
      player.bevoelkerung = Math.max(GAME_CONFIG.BEVOELKERUNG_MINIMUM, bevVorRunde - verlust);
      player.bevoelkerungZufriedenheit = Math.max(0, player.bevoelkerungZufriedenheit - 20);
      this.soundManager.play('famine');
      this.log(`${this.playerName(playerNum)}: Hungersnot! -${verlust} Tote (Versorgung nur ${Math.round(ernQuote * 100)}% des Bedarfs)`);
    } else if (ernQuote < 0.85) {
      // Leichte Hungersnot: -6% Bev, -8 Zufriedenheit
      const verlust = Math.max(1, Math.round(bevVorRunde * 0.06));
      player.bevoelkerung = Math.max(GAME_CONFIG.BEVOELKERUNG_MINIMUM, bevVorRunde - verlust);
      player.bevoelkerungZufriedenheit = Math.max(0, player.bevoelkerungZufriedenheit - 8);
      this.log(`${this.playerName(playerNum)}: Unterversorgung! -${verlust} Einwohner (Versorgung ${Math.round(ernQuote * 100)}% des Bedarfs)`);
    } else {
      // Ausreichend oder gut versorgt → graduelles Wachstum
      let wachstumsRate, zufrBonus;
      if (ernQuote >= GAME_CONFIG.ERNAEHRUNG_WACHSTUM) {
        // Überschuss ≥ 130%: volles Wachstum
        wachstumsRate = GAME_CONFIG.BEV_WACHSTUM_RATE;      // 5%
        zufrBonus = 5;
      } else if (ernQuote >= 1.0) {
        // Grundbedarf gedeckt: moderates Wachstum
        wachstumsRate = 0.02;                                 // 2%
        zufrBonus = 0;
      } else {
        // Knapp (0.85–1.0): minimales Wachstum
        wachstumsRate = 0.01;                                 // 1%
        zufrBonus = -2;
      }
      const wachstum = Math.max(1, Math.round(bevVorRunde * wachstumsRate));
      const maxBev   = (player.land || 0) * GAME_CONFIG.MAX_BEV_PRO_LAND;
      player.bevoelkerung = maxBev > 0
        ? Math.min(maxBev, bevVorRunde + wachstum)
        : bevVorRunde + wachstum;
      player.bevoelkerungZufriedenheit = this.clamp(
        player.bevoelkerungZufriedenheit + zufrBonus, 0, 100
      );
    }

    // Hohe Steuern → Unzufriedenheit
    const steuerQuote = steuern / (bevVorRunde * GAME_CONFIG.STEUERN_MAX_PRO_KOPF);
    if (steuerQuote > 0.75) {
      player.bevoelkerungZufriedenheit = Math.max(0, player.bevoelkerungZufriedenheit - 12);
    } else if (steuerQuote < 0.3) {
      // Niedrige Steuern → leicht positiv
      player.bevoelkerungZufriedenheit = Math.min(100, player.bevoelkerungZufriedenheit + 2);
    }

    // ── 10. Flottenkauf ─────────────────────────────────────────────────────
    if (!player.hatFlotte && decision.kaufFlotte === true) {
      if (player.gold >= GAME_CONFIG.FLOTTE_GOLD_KOSTEN) {
        player.gold -= GAME_CONFIG.FLOTTE_GOLD_KOSTEN;
        player.hatFlotte = true;
        player.unterhaltRueckstand = 0;
        player.schiffe = this.placeShips();
        this.soundManager.play('fleet_buy');
        this.log(`${this.playerName(playerNum)} stellt eine Flotte auf! (-${GAME_CONFIG.FLOTTE_GOLD_KOSTEN} Gold, ${GAME_CONFIG.FLOTTE_BESATZUNG} Besatzung gebunden)`);
        setTimeout(() => this.animateFleetBuy(playerNum), 200);
      } else {
        this.log(`${this.playerName(playerNum)} will Flotte kaufen — fehlt noch ${GAME_CONFIG.FLOTTE_GOLD_KOSTEN - Math.round(player.gold)} Gold.`);
      }
    }

    // ── 11. Flottenunterhalt ────────────────────────────────────────────────
    if (player.hatFlotte) {
      if (player.korn >= GAME_CONFIG.FLOTTE_UNTERHALT_KORN) {
        player.korn -= GAME_CONFIG.FLOTTE_UNTERHALT_KORN;
        if (player.unterhaltRueckstand > 0) {
          this.log(`${this.playerName(playerNum)}: Flottenunterhalt bezahlt. Rückstand getilgt.`);
          player.unterhaltRueckstand = 0;
        }
      } else {
        player.korn = 0;
        player.unterhaltRueckstand = (player.unterhaltRueckstand || 0) + 1;
        this.log(`${this.playerName(playerNum)}: Flottenunterhalt nicht bezahlt! Rückstand: ${player.unterhaltRueckstand} Jahr(e).`);
        if (player.unterhaltRueckstand >= GAME_CONFIG.FLOTTE_VERFALL_SCHWELLE) {
          const intakt = player.schiffe.filter(s => !s.versenkt);
          if (intakt.length > 0) {
            const opfer = intakt[Math.floor(Math.random() * intakt.length)];
            opfer.versenkt = true;
            this.log(`${this.playerName(playerNum)}: ${opfer.name} durch Vernachlässigung verloren!`);
            if (player.schiffe.filter(s => !s.versenkt).length === 0) {
              player.hatFlotte = false;
              player.unterhaltRueckstand = 0;
              this.log(`${this.playerName(playerNum)}: Gesamte Flotte zerstört!`);
            }
          }
        }
      }
    }

    // ── 12. Clamps ──────────────────────────────────────────────────────────
    player.korn = this.clamp(player.korn, 0, GAME_CONFIG.MAX_KORN);
    player.gold = this.clamp(player.gold, 0, GAME_CONFIG.MAX_GOLD);
    player.land = this.clamp(player.land || 0, 0, GAME_CONFIG.MAX_LAND);

    if (aussaat > 0) this.soundManager.play('harvest');
    this.soundManager.play('economy');

    const maxBevAnzeige = (player.land || 0) * GAME_CONFIG.MAX_BEV_PRO_LAND;
    this.log(`${this.playerName(playerNum)}: Steuern=${Math.round(steuern)} | Saat=${Math.round(aussaat)} auf ${Math.round(effFlaeche)} Land | Ernte=${ernte} (${wetterText}) | Ern=${Math.round(ernaehrung)}/${minEss} | Handel=${Math.round(handel)} | Bev=${Math.round(player.bevoelkerung)}/${maxBevAnzeige} | NutzLand=${nutzbarLand}/${landVorRunde}`);
  }

  // ─── SCHIFFE ──────────────────────────────────────────────────────────────
  placeShips() {
    const ships = [];
    const occupied = new Set();

    for (const shipDef of GAME_CONFIG.SCHIFFE) {
      let placed = false;
      let attempts = 0;
      while (!placed && attempts < 1000) {
        attempts++;
        const horizontal = Math.random() > 0.5;
        const size = shipDef.size;
        let row, col;

        if (horizontal) {
          row = Math.floor(Math.random() * GAME_CONFIG.GRID_SIZE);
          col = Math.floor(Math.random() * (GAME_CONFIG.GRID_SIZE - size + 1));
        } else {
          row = Math.floor(Math.random() * (GAME_CONFIG.GRID_SIZE - size + 1));
          col = Math.floor(Math.random() * GAME_CONFIG.GRID_SIZE);
        }

        const coords = [];
        let canPlace = true;
        for (let i = 0; i < size; i++) {
          const r = horizontal ? row : row + i;
          const c = horizontal ? col + i : col;
          const key = `${r},${c}`;
          if (occupied.has(key)) { canPlace = false; break; }
          coords.push({ row: r, col: c, hit: false });
        }

        if (canPlace) {
          coords.forEach(c => {
            for (let dr = -1; dr <= 1; dr++) {
              for (let dc = -1; dc <= 1; dc++) {
                occupied.add(`${c.row + dr},${c.col + dc}`);
              }
            }
          });
          ships.push({ name: shipDef.name, coords, versenkt: false });
          placed = true;
        }
      }
    }
    return ships;
  }

  // ─── KAMPF ────────────────────────────────────────────────────────────────
  executeCombat(playerNum, decision, opponentNum) {
    const attacker = this.state.players[playerNum];
    const defender = this.state.players[opponentNum];

    if (!attacker.hatFlotte || !decision.angriff) return;

    // Ohne Flotte beim Verteidiger ist kein Seegefecht möglich
    if (!defender.hatFlotte) {
      this.log(`${this.playerName(playerNum)}: Angriff auf ${decision.angriff} gescheitert — Gegner hat keine Flotte!`);
      return;
    }

    let coord = decision.angriff.toUpperCase();
    if (!this.isValidCoord(coord)) {
      const fallback = this.findUnshotCoord(attacker.feuerKarte);
      if (!fallback) return;
      coord = fallback;
      decision.angriff = coord;
    }

    if (attacker.feuerKarte && attacker.feuerKarte.includes(coord)) {
      const newCoord = this.findUnshotCoord(attacker.feuerKarte);
      if (!newCoord) return;
      this.log(`${this.playerName(playerNum)}: Feld ${coord} bereits beschossen, wechsle zu ${newCoord}.`);
      coord = newCoord;
      decision.angriff = newCoord;
    }

    if (!attacker.feuerKarte) attacker.feuerKarte = [];
    attacker.feuerKarte.push(coord);

    const { row, col } = this.parseCoord(coord);
    let result = 'fehlschuss';
    let hitShip = null;

    for (const ship of defender.schiffe) {
      if (ship.versenkt) continue;
      for (const part of ship.coords) {
        if (part.row === row && part.col === col) {
          part.hit = true;
          result = 'treffer';
          hitShip = ship;
          break;
        }
      }
      if (result === 'treffer') break;
    }

    attacker.hitMap.push({ coord, result, year: this.currentYear });

    if (result === 'treffer') {
      this.soundManager.play('combat_cannon');
      setTimeout(() => this.soundManager.play('combat_hit'), 300);
      this.log(`${this.playerName(playerNum)} trifft ${coord}!`);
      // Trefferanimation auf der Verteidigerseite
      this.animateCell(opponentNum, coord, 'hit-flash', 800);

      if (hitShip && hitShip.coords.every(c => c.hit)) {
        hitShip.versenkt = true;
        this.soundManager.play('combat_sink');
        this.log(`${this.playerName(playerNum)} versenkt ${hitShip.name}!`);
        // Versenkungsanimation auf der Verteidigerseite
        setTimeout(() => this.animateSink(opponentNum, hitShip), 400);
      }
    } else {
      this.soundManager.play('combat_cannon');
      setTimeout(() => this.soundManager.play('combat_splash'), 200);
      this.log(`${this.playerName(playerNum)}: Fehlschuss auf ${coord}`);
      // Fehlschuss-Animation auf der Verteidigerseite
      this.animateCell(opponentNum, coord, 'splash-flash', 600);
    }
  }

  isValidCoord(coord) {
    return /^[A-J]([1-9]|10)$/.test(coord);
  }

  parseCoord(coord) {
    const col = coord.charCodeAt(0) - 65;
    const row = parseInt(coord.substring(1)) - 1;
    return { row, col };
  }

  coordToString(row, col) {
    return String.fromCharCode(65 + col) + (row + 1);
  }

  findUnshotCoord(feuerKarte) {
    const shot = new Set(feuerKarte || []);
    const frei = [];
    for (let r = 0; r < GAME_CONFIG.GRID_SIZE; r++) {
      for (let c = 0; c < GAME_CONFIG.GRID_SIZE; c++) {
        const coord = this.coordToString(r, c);
        if (!shot.has(coord)) frei.push(coord);
      }
    }
    if (frei.length === 0) return null;
    return frei[Math.floor(Math.random() * frei.length)];
  }

  // ─── SIEG ─────────────────────────────────────────────────────────────────
  checkWinConditions() {
    const p1 = this.state.players[1];
    const p2 = this.state.players[2];

    const p1Collapsed = this.isCollapsed(p1);
    const p2Collapsed = this.isCollapsed(p2);
    const p1AllShipsSunk = this.allShipsSunk(p1);
    const p2AllShipsSunk = this.allShipsSunk(p2);

    if (p1Collapsed && p2Collapsed) return { winner: 0, reason: 'Unentschieden - beide Spieler kollabiert' };
    if (p1AllShipsSunk && p2AllShipsSunk) return { winner: 0, reason: 'Unentschieden - beide Flotten vernichtet' };
    if (p2Collapsed || p2AllShipsSunk) return { winner: 1, reason: p2Collapsed ? 'Wirtschaftlicher Kollaps' : 'Militärsieg' };
    if (p1Collapsed || p1AllShipsSunk) return { winner: 2, reason: p1Collapsed ? 'Wirtschaftlicher Kollaps' : 'Militärsieg' };
    return null;
  }

  isCollapsed(player) {
    // Bevölkerung ausgestorben
    if (player.bevoelkerung <= GAME_CONFIG.BEVOELKERUNG_MINIMUM) return true;
    // Kein Gold UND kein Korn UND keine Bevölkerung über Minimum: wirtschaftlicher Totalausfall
    if (player.gold === 0 && player.korn === 0 && player.bevoelkerung <= 5) return true;
    // Zufriedenheit war 3 Runden in Folge auf absolutem Null: Staat zerfallen
    if ((player.rebellionJahre || 0) >= 3) return true;
    return false;
  }

  allShipsSunk(player) {
    if (!player.hatFlotte || player.schiffe.length === 0) return false;
    return player.schiffe.every(s => s.versenkt);
  }

  endGame(result) {
    this.isRunning = false;
    const p1 = this.state.players[1];
    const p2 = this.state.players[2];

    if (result.winner === 0) {
      this.log(`SPIELENDE: ${result.reason}`);
    } else {
      this.log(`SPIELENDE: ${this.playerName(result.winner)} gewinnt durch ${result.reason}!`);
    }

    this.log(`Jahre gespielt: ${this.currentYear}`);
    this.log(`${this.playerName(1)}: Korn=${Math.round(p1.korn)}, Gold=${Math.round(p1.gold)}, Bev=${Math.round(p1.bevoelkerung)}, Land=${Math.round(p1.land || 0)}`);
    this.log(`${this.playerName(2)}: Korn=${Math.round(p2.korn)}, Gold=${Math.round(p2.gold)}, Bev=${Math.round(p2.bevoelkerung)}, Land=${Math.round(p2.land || 0)}`);
    this.showEndScreen(result);
  }

  showEndScreen(result) {
    const overlay = document.getElementById('endOverlay');
    const winnerText = document.getElementById('endWinner');
    const reasonText = document.getElementById('endReason');
    const yearText = document.getElementById('endYear');

    if (result.winner === 0) {
      winnerText.textContent = 'Unentschieden!';
    } else {
      winnerText.textContent = `${this.playerName(result.winner)} gewinnt!`;
    }
    reasonText.textContent = result.reason;
    yearText.textContent = `Jahre gespielt: ${this.currentYear}`;
    overlay.style.display = 'flex';
  }

  // ─── TTS ──────────────────────────────────────────────────────────────────
  async playTTS(text, playerNum) {
    try {
      const voice = this.playerVoices[playerNum];
      let body;

      if (voice && voice.type === 'clone' && voice.ref_audio) {
        body = JSON.stringify({
          endpoint: 'tts',
          text: text,
          mode: 'clone',
          ref_audio: voice.ref_audio,
          ref_text: voice.ref_text || ''
        });
      } else if (voice && voice.type === 'preset' && voice.speaker) {
        body = JSON.stringify({
          endpoint: 'tts',
          text: text,
          mode: 'custom',
          speaker: voice.speaker
        });
      } else {
        // Standard: kein Voice-Setting → Preset 'aiden'
        body = JSON.stringify({ endpoint: 'tts', text: text });
      }

      const response = await fetch(GAME_CONFIG.PROXY_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body
      });

      if (!response.ok) {
        this.log(`TTS-Fehler: HTTP ${response.status}`);
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);

      return new Promise((resolve) => {
        const skipHandler = () => { audio.pause(); URL.revokeObjectURL(url); resolve(); };
        const skipBtn = document.getElementById('skipAudio');
        skipBtn.addEventListener('click', skipHandler, { once: true });

        audio.onended = () => { URL.revokeObjectURL(url); skipBtn.removeEventListener('click', skipHandler); resolve(); };
        audio.onerror = () => { URL.revokeObjectURL(url); resolve(); };
        audio.play().catch(() => resolve());

        setTimeout(() => {
          if (!audio.ended) { audio.pause(); URL.revokeObjectURL(url); resolve(); }
        }, GAME_CONFIG.AUDIO_TIMEOUT_MS);
      });
    } catch (e) {
      this.log(`TTS nicht verfügbar: ${e.message}`);
    }
  }

  // ─── UI ───────────────────────────────────────────────────────────────────
  clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

  log(message) {
    const logEl = document.getElementById('gameLog');
    if (!logEl) return;
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.textContent = `[Jahr ${this.currentYear}] ${message}`;
    logEl.prepend(entry);
  }

  updateUI() {
    this.updatePlayerUI(1);
    this.updatePlayerUI(2);
    this.updateYearDisplay();
  }

  updatePlayerUI(playerNum) {
    const player = this.state.players[playerNum];
    const prefix = `player${playerNum}`;

    const kornEl = document.getElementById(`${prefix}Korn`);
    const goldEl = document.getElementById(`${prefix}Gold`);
    const bevEl = document.getElementById(`${prefix}Bevoelkerung`);
    const zufriedenheitEl = document.getElementById(`${prefix}Zufriedenheit`);
    const flotteEl = document.getElementById(`${prefix}Flotte`);
    const landEl = document.getElementById(`${prefix}Land`);

    if (kornEl) kornEl.textContent = Math.round(player.korn);
    if (goldEl) goldEl.textContent = Math.round(player.gold);
    if (bevEl) bevEl.textContent = Math.round(player.bevoelkerung);
    if (zufriedenheitEl) {
      zufriedenheitEl.textContent = `${Math.round(player.bevoelkerungZufriedenheit)}%`;
      // Farbliche Warnung bei niedriger Zufriedenheit
      if (player.bevoelkerungZufriedenheit < GAME_CONFIG.REBELLION_ABSETZUNG) {
        zufriedenheitEl.style.color = '#ff1744';
      } else if (player.bevoelkerungZufriedenheit < GAME_CONFIG.REBELLION_SCHWELLE) {
        zufriedenheitEl.style.color = '#ff6d00';
      } else {
        zufriedenheitEl.style.color = '';
      }
    }
    if (flotteEl) flotteEl.textContent = player.hatFlotte ? `Ja (${player.schiffe.filter(s => !s.versenkt).length}/${player.schiffe.length})` : 'Nein';
    if (landEl) landEl.textContent = Math.round(player.land || 0);

    this.renderGrid(playerNum, player);
  }

  renderGrid(playerNum, player) {
    const gridEl = document.getElementById(`grid${playerNum}`);
    if (!gridEl) return;
    gridEl.innerHTML = '';

    const headerRow = document.createElement('div');
    headerRow.className = 'grid-header';
    headerRow.innerHTML = '<div class="grid-corner"></div>';
    for (let c = 0; c < GAME_CONFIG.GRID_SIZE; c++) {
      const colHeader = document.createElement('div');
      colHeader.className = 'grid-col-header';
      colHeader.textContent = String.fromCharCode(65 + c);
      headerRow.appendChild(colHeader);
    }
    gridEl.appendChild(headerRow);

    for (let r = 0; r < GAME_CONFIG.GRID_SIZE; r++) {
      const rowEl = document.createElement('div');
      rowEl.className = 'grid-row';

      const rowHeader = document.createElement('div');
      rowHeader.className = 'grid-row-header';
      rowHeader.textContent = r + 1;
      rowEl.appendChild(rowHeader);

      for (let c = 0; c < GAME_CONFIG.GRID_SIZE; c++) {
        const cell = document.createElement('div');
        cell.className = 'grid-cell';
        cell.dataset.row = r;
        cell.dataset.col = c;

        const isShip = player.hatFlotte && player.schiffe.some(s =>
          s.coords.some(coord => coord.row === r && coord.col === c)
        );
        // Versenkt-Status prüfen (für Farbe)
        const isSunkShipCell = player.schiffe.some(s =>
          s.versenkt && s.coords.some(coord => coord.row === r && coord.col === c)
        );
        const hit = player.schiffe.flatMap(s => s.coords)
          .find(coord => coord.row === r && coord.col === c && coord.hit);
        const shotAt = player.hitMap.find(h => {
          const parsed = this.parseCoord(h.coord);
          return parsed.row === r && parsed.col === c;
        });

        if (isShip && playerNum === 1) cell.classList.add('ship');
        else if (isShip && playerNum === 2) cell.classList.add('ship-p2');
        if (hit) cell.classList.add('hit');
        else if (shotAt) cell.classList.add('miss');
        if (isSunkShipCell) cell.classList.add('sunk-ship');

        rowEl.appendChild(cell);
      }
      gridEl.appendChild(rowEl);
    }
  }

  // Animiert eine einzelne Zelle im Grid eines Spielers kurz nach einem Ereignis
  animateCell(playerNum, coord, animClass, durationMs = 1500) {
    const { row, col } = this.parseCoord(coord);
    const gridEl = document.getElementById(`grid${playerNum}`);
    if (!gridEl) return;
    // +1 wegen header-row, +1 wegen row-header-Spalte
    const rows = gridEl.querySelectorAll('.grid-row');
    if (!rows[row]) return;
    const cells = rows[row].querySelectorAll('.grid-cell');
    if (!cells[col]) return;
    const cell = cells[col];
    cell.classList.add(animClass);
    setTimeout(() => cell.classList.remove(animClass), durationMs);
  }

  // Animiert alle Zellen eines versenkten Schiffes
  animateSink(playerNum, ship) {
    const gridEl = document.getElementById(`grid${playerNum}`);
    if (!gridEl) return;
    const rows = gridEl.querySelectorAll('.grid-row');
    ship.coords.forEach(({ row, col }) => {
      if (!rows[row]) return;
      const cells = rows[row].querySelectorAll('.grid-cell');
      if (!cells[col]) return;
      cells[col].classList.add('sinking');
      setTimeout(() => cells[col].classList.remove('sinking'), 1600);
    });
  }

  // Lässt das gesamte Grid eines Spielers kurz aufleuchten (Flottenkaum)
  animateFleetBuy(playerNum) {
    const gridEl = document.getElementById(`grid${playerNum}`);
    if (!gridEl) return;
    const cells = gridEl.querySelectorAll('.grid-cell');
    cells.forEach(cell => {
      cell.classList.add('fleet-bought');
      setTimeout(() => cell.classList.remove('fleet-bought'), 1400);
    });
  }

  updateYearDisplay() {
    const yearEl = document.getElementById('currentYear');
    if (yearEl) yearEl.textContent = this.currentYear;
    const turnEl = document.getElementById('currentTurn');
    if (turnEl) turnEl.textContent = this.currentPlayer;

    // Marktpreise anzeigen
    const landPreisEl = document.getElementById('marktLandPreis');
    const kornPreisEl = document.getElementById('marktKornPreis');
    if (landPreisEl) landPreisEl.textContent = this.marktpreise.land.toFixed(1);
    if (kornPreisEl) kornPreisEl.textContent = this.marktpreise.korn.toFixed(2);
  }

  updateSettingsUI() {
    const s1 = this.state.settings.player1;
    const s2 = this.state.settings.player2;

    ['player1', 'player2'].forEach((p, i) => {
      const s = i === 0 ? s1 : s2;
      const strat = document.getElementById(`${p}Strategic`);
      const verb  = document.getElementById(`${p}Verbal`);
      const stratL = document.getElementById(`${p}StrategicLabel`);
      const verbL  = document.getElementById(`${p}VerbalLabel`);
      const api    = document.getElementById(`${p}ApiProvider`);
      const key    = document.getElementById(`${p}ApiKey`);

      if (strat) strat.value = s.strategicAggression;
      if (verb)  verb.value  = s.verbalAggression;
      if (stratL) stratL.textContent = s.strategicAggression;
      if (verbL)  verbL.textContent  = s.verbalAggression;
      if (api)   api.value   = s.apiProvider;
      if (key)   key.value   = s.apiKey;
    });
  }

  saveSettingsFromUI() {
    this.state.settings.player1.strategicAggression = parseInt(document.getElementById('player1Strategic').value) || 50;
    this.state.settings.player1.verbalAggression    = parseInt(document.getElementById('player1Verbal').value) || 50;
    this.state.settings.player2.strategicAggression = parseInt(document.getElementById('player2Strategic').value) || 50;
    this.state.settings.player2.verbalAggression    = parseInt(document.getElementById('player2Verbal').value) || 50;

    this.state.settings.player1.apiProvider = document.getElementById('player1ApiProvider').value || 'ollama';
    this.state.settings.player1.apiKey      = document.getElementById('player1ApiKey').value || '';
    this.state.settings.player1.model       = document.getElementById('player1Model')?.value || GAME_CONFIG.OLLAMA_MODEL;
    this.state.settings.player2.apiProvider = document.getElementById('player2ApiProvider').value || 'ollama';
    this.state.settings.player2.apiKey      = document.getElementById('player2ApiKey').value || '';
    this.state.settings.player2.model       = document.getElementById('player2Model')?.value || GAME_CONFIG.OLLAMA_MODEL;

    // TTS-Stimmen aus UI lesen
    ['player1', 'player2'].forEach((p, i) => {
      const playerNum = i + 1;
      const voiceSelect = document.getElementById(`${p}VoiceSelect`);
      const voiceType   = document.getElementById(`${p}VoiceType`);
      if (voiceSelect && voiceType) {
        const selectedOpt = voiceSelect.options[voiceSelect.selectedIndex];
        if (selectedOpt && selectedOpt.value) {
          this.playerVoices[playerNum] = {
            type:      voiceType.value,
            speaker:   voiceType.value === 'preset' ? selectedOpt.value : '',
            ref_audio: voiceType.value === 'clone'  ? selectedOpt.dataset.path : '',
            ref_text:  voiceType.value === 'clone'  ? (selectedOpt.dataset.transcript || '') : ''
          };
        } else {
          this.playerVoices[playerNum] = null;
        }
      }
    });

    this.saveSettings();
  }

  toggleRawData() {
    const rawDataEl = document.getElementById('rawData');
    if (rawDataEl) rawDataEl.classList.toggle('visible');
  }
}

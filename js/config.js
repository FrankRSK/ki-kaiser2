const HERRSCHERNAMEN = [
  'Alexander der Große', 'Julius Caesar', 'Karl der Große', 'Napoleon Bonaparte',
  'Friedrich der Große', 'Dschingis Khan', 'Kleopatra VII.', 'Augustus Caesar',
  'Saladin', 'Richard Löwenherz', 'Katharina die Große', 'Ludwig XIV.',
  'Cyrus der Große', 'Ramses II.', 'Attila der Hunnenkönig', 'Hannibal Barkas',
  'Mehmed II.', 'Suleiman der Prächtige', 'Isabella I. von Kastilien', 'Karl V.',
  'Peter der Große', 'Maria Theresia', 'Temüjin', 'Tamurlane',
  'Harald Blauzahn', 'Wilhelm der Eroberer', 'Barbarossa', 'Heinrich VIII.',
  'Shaka Zulu', 'Ashoka der Große', 'Qin Shi Huang', 'Moctezuma II.',
  'Pachacutec', 'Tutanchamun', 'Nefertiti', 'Boudicca',
  'Vercingetorix', 'Arminius', 'Nero', 'Caligula',
  'Xerxes I.', 'Darius I.', 'Cleopatra Selene II.', 'Zenobia',
  'Ivanka die Schreckliche', 'Wladimir der Heilige', 'Stephan der Große', 'Skanderbeg',
  'Meji-Kaiser', 'Oda Nobunaga', 'Tokugawa Ieyasu', 'Sun Tzu',
  'Askia Mohammed', 'Mansa Musa', 'Sundiata Keita', 'Shekhar Suri'
];

// ─── BESCHIMPFUNGEN (nach Aggressions-Tier) ──────────────────────────────────
// Diese Listen werden dem KI-Prompt beigefügt, wenn verbalAggression > Schwellwert
const BESCHIMPFUNGEN_MITTEL = [
  // Klassisch-herablassend
  'Du erbärmlicher Versager!',
  'Elender Schwächling!',
  'Dümmer als Bohnenstro!',
  'Taugenichts!',
  'Du kläglicher Wicht!',
  'Armseliger Habenichts!',
  'Du blöder Tor!',
  'Feiger Hasenfuß!',
  // Historisch-martialisch
  'Niederträchtiger Memme!',
  'Erbärmlicher Knappe ohne Rückgrat!',
  'Du jammervoller Wicht ohne Ehre!',
  'Elender Schurke und Feigling!',
  'Du bist so dumm, dein eigenes Volk schämt sich!',
  'Wurm! Kriech zurück in dein Loch!',
  'Du lächerlicher Möchtegern-Herrscher!',
  'Dein Reich ist so klein wie dein Verstand!',
  'Unfähiger Nichtsnutz auf dem Thron!',
  'Du regierst wie ein schlaftrunkener Bauer!',
  'Schäm dich, du blamierst deine Vorfahren!',
  'Weichherziger Versager, den kein Krieger fürchtet!',
  'Du Narr auf einem Thron aus Stroh!',
  'Dein Name wird als Warnung in die Geschichte eingehen!',
  'Ein blinder Esel würde besser regieren als du!',
  'Du hast die Weisheit einer Weinbergschnecke!',
  'Dein Volk hungert und du planst Feste — Schande!',
  'Wer hat dir erlaubt, einen Thron zu berühren?',
  'Du bist das schwächste Glied in deiner eigenen Blutlinie!',
  'Kneif die Augen zu, Feigling, damit du meinen Sieg nicht sehen musst!',
  'Selbst deine Feinde gähnen, wenn sie an dich denken!',
  // Neu – spöttisch und herablassend
  'Deine Strategie ist so durchsichtig wie dünnes Pergament!',
  'Selbst ein Schreiber im dritten Jahr würde dich auslachen!',
  'Du führst dein Volk in den Abgrund und merkst es nicht einmal!',
  'Hat man dir den Verstand gestohlen oder warst du von Geburt an so?',
  'Ich habe Feldhasen gesehen, die mutiger kämpfen als du!',
  'Dein Thron wackelt — genauso wie dein Geist!',
  'Hast du deinen Ratgeber erschlagen oder hört er einfach nicht mehr zu?',
  'Dein Heer würde lieber desertieren als unter dir zu dienen!',
  'Mit solchen Entscheidungen wärst du nicht mal Dorfvorsteher!',
  'Deine Vorfahren weinen in ihren Gräbern über dich!',
  'Du zitterst schon bei meinem Anblick — gut so!',
  'Was für ein kümmerliches Spektakel du abgibst!',
  'Dein Reich ist eine Beleidigung für die Geographie!',
  'Ich sehe in dir keinen Herrscher — nur einen gut gekleideten Narren!',
  'Deine Kassen sind leer und dein Kopf leerer!',
  'Selbst die Ratten verlassen dein sinkendes Reich!',
  'Du regierst, als hättest du die Augen verbunden und rückwärts gedacht!',
  'Kein Lied wird von dir gesungen — nur Klagelieder!',
  'Deine Beschlüsse sind Katastrophen, nur langsamer!',
  'Was nützt dir ein Thron, wenn du nicht weißt, wie man darauf sitzt?',
  'Du bist das beste Argument dafür, Könige zu wählen statt zu erben!',
  'Selbst der dümmste Söldner würde das Land besser verwalten!',
  'Ich könnte mit verbundenen Augen besser regieren als du hellwach!',
  'Deine Entscheidungen sind Geschenke an mich — danke!',
  'Die Geschichte wird dich in einer Fußnote begraben!',
  'Dein größter Sieg war es, heute Morgen aufzustehen!',
  'Du bist der Beweis, dass Macht nicht Verstand verleiht!',
  'Hätte dein Volk die Wahl, es würde sich einen anderen Herrn suchen!',
  'Ich mitleide mit deinen Untergebenen — wirklich!',
  'Wenn Versagen eine Kunst wäre, du wärst ein Meister!',
];

const BESCHIMPFUNGEN_HOCH = [
  // Original
  'Du gottverdammter Vollidiot!',
  'Verfluchtes Mistvieh!',
  'Du dreckiger Hurensohn!',
  'Scher dich zur Hölle, du Wichser!',
  'Elender Bastard!',
  'Du scheißbeschissener Trottel!',
  'Verrotteter Drecksack!',
  'Du mieses Arschloch!',
  'Verdammte Scheiße, was bist du dumm!',
  'Du erbärmlicher Wichser!',
  'Hau ab, du Vollpfosten!',
  'Du gottverdammter Depp!',
  'Mistkerl ohne Ehre!',
  'Dreckschwein!',
  'Du elender Feigling und Verräter!',
  // Erweitert – derb und direkt
  'Du hirnloser Hohlkopf, der sich Herrscher nennt!',
  'Verrecke in deinem eigenen Dreck, du Widerling!',
  'Du bist so beschissen schlecht, dass selbst deine Mutter flüchtet!',
  'Ich kotze auf deinen Thron, du erbärmliche Wurst!',
  'Du verdammter Trottelkönig ohne Verstand und ohne Eier!',
  'Scheiß auf deine Strategie, du gehirnloser Vollidiot!',
  'Du bist das größte Arschloch diesseits der Weltmeere!',
  'Verpiss dich, du elender Nieten-Herrscher!',
  'Du Wichser auf dem Thron, dein Volk lacht über dich!',
  'Halt die Fresse und stirb endlich, du Stück Dreck!',
  'Du dreckiger Lump ohne Knochen im Leib!',
  'Ich zermalme dich wie den Mist, den du bist!',
  'Du bist so dumm, du würdest dein eigenes Korn anzünden!',
  'Verfluchter Bastard, dein Blut ist so dünn wie dein Verstand!',
  'Du elende Ratte, ich werde dich vernichten!',
  'Dein Reich ist ein Witz und du der schlechteste Teil davon!',
  'Du mieses kleines Würstchen auf einem Holzthron!',
  'Scheiß auf deine Götter, die haben dich längst aufgegeben!',
  'Du bist nichts weiter als Dreck unter meinen Stiefeln!',
  'Ich werde dein Reich dem Erdboden gleichmachen, du Schwachkopf!',
  'Du gottverlassener Versager, dein Name wird vergessen sein!',
  'Kastrierter Kriegsherr! Nicht mal dein Schwert zittert mehr!',
  'Du faulender Kadaver auf dem Thron!',
  'Wichser! Dein ganzes Leben ist eine einzige Niederlage!',
  'Du hirnverbrannter Idiot, stirb endlich in Würde!',
  'Dein Gehirn sitzt zwischen deinen Pobacken, du Volltrottel!',
  'Du beschissenes Stück Fleisch ohne Würde oder Verstand!',
  'Ich scheiße auf dein Erbe und pisse auf dein Grab!',
  'Du bist so ekelhaft, nicht mal Geier würden dich fressen!',
  'Verrotteter Trottel! Dein Volk betet für deinen Tod!',
  'Du Vollhorst, dein einziger Erfolg war, nicht sofort zu verlieren!',
  'Ich werde deine Schiffe versenken wie den Müll, der du bist!',
  'Du feiges Schwein, lauf — meine Flotte kommt für dich!',
  'Du bist so inkompetent, ein Kleinkind würde dich überragen!',
  'Gottverdammter Idiot, das war die letzte Chance die du hattest!',
  'Du Sack! Jeder Zug von dir beweist, dass du nicht dazugehörst!',
  'Elender Lump — krieche in deinen Palast und beweine dein Versagen!',
  // Neu – roh und direkt
  'Du stinkender Haufen Pech auf zwei Beinen!',
  'Dein Taktikverstand ist so scharf wie ein nasser Lappen!',
  'Scheiß auf deine Flotte — sie sinkt genauso wie dein Verstand!',
  'Du bist so eine Niete, nicht mal deine Mutter würde auf dich wetten!',
  'Hau endlich ab, du versifftes Stück Versagen!',
  'Ich fresse dein Reich zum Frühstück und scheiß es bis Mittag aus!',
  'Dein Blut ist so kalt wie dein toter Verstand!',
  'Du kotzbrechender Widerling auf einem Scheißthron!',
  'Ich hab mehr Respekt vor dem Dreck unter meinen Nägeln als vor dir!',
  'Du elender Waschlappen — nicht mal dein Hund würde dir folgen!',
  'Dein Name ist schon jetzt ein Fluch in meinen Landen!',
  'Ich werde dich vernichten so gründlich, dass kein Stein mehr steht!',
  'Du armseliger Volltrottel, stirb endlich damit ein besserer nachkommt!',
  'Schäm dich bis in den Tod, du mieser Versager!',
  'Dein Reichsende kommt — und ich werde dabei lachen!',
  'Du bist das, was rauskommt, wenn Unfähigkeit sich selbst regiert!',
  'Kein Gott, kein Krieger, kein Bauer würde für dich kämpfen!',
  'Du Widerling — sogar Ratten haben mehr Würde als du!',
  'Ich pisse auf deinen Thron und lache über dein Versagen!',
  'Du bist so tief gesunken, dass selbst der Abgrund dich ausspuckt!',
];

const GAME_CONFIG = {
  // ── Startwerte ────────────────────────────────────────────────────────────
  KORN_START: 250,              // Ausreichend für Ernährung + erste Aussaat
  GOLD_START: 100,              // Flotte ab Runde 3 erreichbar bei guter Strategie
  BEVOELKERUNG_START: 100,
  LAND_START: 40,               // 40 Land → genug für 100 Bev (je 5 Land/Person max)

  // ── Erntekreislauf (Kaiser-Modell) ────────────────────────────────────────
  // Formel: eff_flaeche = min(aussaat / SAAT_PRO_LAND, nutzbar_land)
  //         ernte       = eff_flaeche × ERNTE_PRO_LAND × wetter_faktor
  SAAT_PRO_LAND: 0.5,           // Korn-Saatgutbedarf pro bestellter Landeinheit
  ERNTE_PRO_LAND: 4.0,          // Bruttoertrag Korn pro bestellter Landeinheit
  WETTER_MIN: 0.7,              // Schlechtes Wetterjahr: 70% Ernte
  WETTER_MAX: 1.3,              // Gutes Wetterjahr: 130% Ernte

  // ── Bevölkerung & Ernährung ───────────────────────────────────────────────
  ERNAEHRUNG_PRO_KOPF: 1.2,     // Korn pro Person pro Runde (Grundbedarf)
  ERNAEHRUNG_WACHSTUM: 1.3,     // Ab diesem Vielfachen des Grundbedarfs: Bevölkerungswachstum
  ERNAEHRUNG_HUNGERSNOT: 0.6,   // Unter diesem Vielfachen: Hungersnot
  BEV_WACHSTUM_RATE: 0.05,      // +5% Bevölkerung bei guter Versorgung
  BEV_HUNGERTOD_RATE: 0.12,     // -12% Bevölkerung bei schwerer Hungersnot

  // ── Land-Bevölkerungs-Kopplung ────────────────────────────────────────────
  MAX_LAND_PRO_BEV: 5,          // 1 Person bewirtschaftet max. 5 Landeinheiten
  MAX_BEV_PRO_LAND: 10,         // Tragkapazität: max. 10 Personen pro Landeinheit
  // → nutzbar_land = min(land, floor(bev × MAX_LAND_PRO_BEV))
  // → max_bev      = land × MAX_BEV_PRO_LAND

  // ── Finanzen ──────────────────────────────────────────────────────────────
  STEUERN_BASIS: 0.5,           // Gold pro Kopf bei normaler Besteuerung
  STEUERN_MAX_PRO_KOPF: 2.0,    // Maximale Steuer/Kopf (darüber: starker Zufriedenheitsverlust)
  HANDEL_KURS: 0.3,             // Gold pro Korn beim Kornhandel

  // ── Flotte ────────────────────────────────────────────────────────────────
  FLOTTE_GOLD_KOSTEN: 400,      // Erreichbar nach ~4 Runden bei guter Strategie
  FLOTTE_UNTERHALT_KORN: 20,    // Erhöht: Flotte bindet mehr Ressourcen
  FLOTTE_BESATZUNG: 10,         // Personen gebunden durch Flotte (weniger Arbeitskraft)
  FLOTTE_VERFALL_SCHWELLE: 2,
  FLOTTEN_DOMINANZ_SCHWELLE: 5,

  // ── Landmarkt ─────────────────────────────────────────────────────────────
  LAND_PREIS_START: 12,
  LAND_PREIS_MIN: 4,
  LAND_PREIS_MAX: 50,
  KORN_PREIS_START: 1,
  KORN_PREIS_MIN: 0.2,
  KORN_PREIS_MAX: 5,

  // ── Rebellion ─────────────────────────────────────────────────────────────
  REBELLION_SCHWELLE: 30,
  REBELLION_ABSETZUNG: 10,
  REBELLION_KORN_KOSTEN: 25,
  REBELLION_GOLD_KOSTEN: 20,
  REBELLION_BEV_VERLUST: 0.08,

  // ── Limits ────────────────────────────────────────────────────────────────
  MAX_KORN: 9999,
  MAX_GOLD: 9999,
  MAX_LAND: 500,
  BEVOELKERUNG_MINIMUM: 5,
  // (ERNTE_FAKTOR, LAND_BONUS_ERNTE, BEVOELKERUNG_VERLUST/WACHSTUM_SCHWELLE entfernt → neues Modell)
  SCHIFFE: [
    { name: 'Schlachtschiff', size: 5 },
    { name: 'Kreuzer', size: 4 },
    { name: 'Zerstörer', size: 3 },
    { name: 'U-Boot', size: 3 },
    { name: 'Patrouillenboot', size: 2 }
  ],
  GRID_SIZE: 10,
  OLLAMA_API: 'http://localhost:11434/api/generate',
  OLLAMA_MODEL: 'qwen2.5:7b',
  TTS_VOICES_DIR: '/var/www/html/tts/audio/voices',
  TTS_ENDPOINT: 'http://localhost:8000/generate', // qwen3-tts Modell unter /mnt/Daten/KI/qwen3-tts
  PROXY_ENDPOINT: 'proxy.php',
  MAX_RETRIES: 3,
  TURN_DELAY_MS: 500,
  AUDIO_TIMEOUT_MS: 30000
};

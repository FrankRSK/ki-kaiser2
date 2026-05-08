class SoundManager {
  constructor() {
    this.audioContext = null;
    // Mehrere Sounds pro Event – einer wird zufällig gewählt
    this.soundMap = {
      'turn_start':     ['ui_turn_start.mp3', 'ui_turn_start2.mp3', 'ui_turn_start3.mp3'],
      'economy':        ['econ_coins.mp3', 'econ_coins2.wav', 'econ_coins3.wav', 'econ_coins4.wav'],
      'harvest':        ['econ_harvest.wav', 'econ_harvest2.wav'],
      'famine':         ['econ_famine.wav', 'econ_famine2.mp3', 'econ_famine3.mp3', 'econ_famine4.mp3', 'econ_famine5.wav'],
      'fleet_buy':      ['fleet_buy.mp3', 'fleet_buy2.wav', 'fleet_buy3.wav'],
      'combat_cannon':  ['combat_cannon.mp3', 'combat_cannon2.mp3', 'combat_cannon3.mp3', 'combat_cannon4.mp3', 'combat_cannon5.mp3'],
      'combat_splash':  ['combat_splash.wav', 'combat_splash2.mp3', 'combat_splash3.mp3', 'combat_splash4.mp3'],
      'combat_hit':     ['combat_hit.wav', 'combat_hit2.mp3', 'combat_hit3.mp3', 'combat_hit4.mp3'],
      'combat_sink':    ['combat_sink.wav', 'combat_sink2.mp3', 'combat_sink3.mp3', 'combat_sink4.mp3'],
    };
  }

  init() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  // Wählt zufällig einen der verfügbaren Dateinamen für einen Event-Typ
  _pickRandom(type) {
    const list = this.soundMap[type];
    if (!list || list.length === 0) return null;
    return list[Math.floor(Math.random() * list.length)];
  }

  async play(type) {
    this.init();
    const fileName = this._pickRandom(type);
    if (!fileName) return;

    const audioPath = `assets/sounds/${fileName}`;

    try {
      const audio = new Audio(audioPath);
      audio.volume = 0.10;   // Lautstärke gedämpft damit TTS-Stimmen hörbar bleiben
      await audio.play();
    } catch (e) {
      this.playFallback(type);
    }
  }

  playFallback(type) {
    if (!this.audioContext) return;

    switch (type) {
      case 'turn_start':
        this.playSine(880, 0.15, 'sine', 0.3);
        break;
      case 'economy':
        this.playToneWithDecay(1200, 0.3, 0.3);
        break;
      case 'harvest':
        this.playBandpassNoise(600, 0.4, 0.2);
        break;
      case 'famine':
        this.playChord([220, 261], 0.6, 0.25);
        break;
      case 'fleet_buy':
        this.playSine(110, 0.8, 'sine', 0.3);
        break;
      case 'combat_cannon':
        this.playImpactNoise(80, 0.2, 0.4);
        break;
      case 'combat_splash':
        this.playWhiteNoise(0.3, 0.2);
        break;
      case 'combat_hit':
        this.playChord([400, 800], 0.25, 0.3);
        break;
      case 'combat_sink':
        this.playSink();
        break;
    }
  }

  playSine(freq, duration, type = 'sine', volume = 0.2) {
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);
    osc.connect(gain);
    gain.connect(this.audioContext.destination);
    osc.start();
    osc.stop(this.audioContext.currentTime + duration);
  }

  playToneWithDecay(freq, duration, volume = 0.2) {
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);
    osc.connect(gain);
    gain.connect(this.audioContext.destination);
    osc.start();
    osc.stop(this.audioContext.currentTime + duration);
  }

  playBandpassNoise(centerFreq, duration, volume = 0.2) {
    const bufferSize = this.audioContext.sampleRate * duration;
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.5;
    }
    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = centerFreq;
    filter.Q.value = 1;
    const gain = this.audioContext.createGain();
    gain.gain.setValueAtTime(volume, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.audioContext.destination);
    source.start();
  }

  playChord(freqs, duration, volume = 0.2) {
    const gain = this.audioContext.createGain();
    gain.gain.setValueAtTime(volume / freqs.length, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);
    gain.connect(this.audioContext.destination);
    freqs.forEach(freq => {
      const osc = this.audioContext.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.connect(gain);
      osc.start();
      osc.stop(this.audioContext.currentTime + duration);
    });
  }

  playImpactNoise(freq, duration, volume = 0.3) {
    const bufferSize = this.audioContext.sampleRate * duration;
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1);
    }
    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = freq * 4;
    const gain = this.audioContext.createGain();
    gain.gain.setValueAtTime(volume, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.audioContext.destination);
    source.start();
    this.playSine(freq, duration, 'square', volume * 0.5);
  }

  playWhiteNoise(duration, volume = 0.2) {
    const bufferSize = this.audioContext.sampleRate * duration;
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1);
    }
    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1000;
    const gain = this.audioContext.createGain();
    gain.gain.setValueAtTime(volume, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.audioContext.destination);
    source.start();
  }

  playSink() {
    this.playChord([400, 800], 0.2, 0.3);
    setTimeout(() => {
      this.playSine(80, 0.6, 'sine', 0.3);
    }, 200);
  }
}

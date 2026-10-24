/**
 * Procedural Web Audio API Sound Engine for Asylum Horror
 * Zero external mp3 dependencies, completely synthesized real-time audio.
 */

class SoundManager {
  private ctx: AudioContext | null = null;
  private isInitialized = false;
  private masterGain: GainNode | null = null;
  private ambientGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;

  // Ambient nodes
  private ambientOsc1: OscillatorNode | null = null;
  private ambientOsc2: OscillatorNode | null = null;
  private ambientNoiseSource: AudioBufferSourceNode | null = null;

  // Heartbeat loop state
  private heartbeatInterval: number | null = null;
  private currentHeartRate = 60; // BPM

  // Breathing state
  private isBreathingLoopActive = false;
  private breathTimeout: number | null = null;

  // Monster state
  private monsterPanner: PannerNode | null = null;
  private monsterGain: GainNode | null = null;
  private nextMonsterGrowlTime = 0;

  constructor() {
    // Lazy initialize on first interaction
  }

  public init() {
    if (this.isInitialized) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.85, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.ambientGain = this.ctx.createGain();
      this.ambientGain.gain.setValueAtTime(0.5, this.ctx.currentTime);
      this.ambientGain.connect(this.masterGain);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(0.8, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      this.isInitialized = true;
      this.startAmbient();
      this.startHeartbeatLoop();
    } catch (e) {
      console.warn('Web Audio not supported or blocked:', e);
    }
  }

  public resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMasterVolume(val: number) {
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(Math.max(0, Math.min(1, val)), this.ctx.currentTime, 0.05);
    }
  }

  // --- AMBIENT HORROR SOUNDSCAPE ---
  private startAmbient() {
    if (!this.ctx || !this.ambientGain) return;

    // Sub-bass dark asylum rumble
    this.ambientOsc1 = this.ctx.createOscillator();
    this.ambientOsc1.type = 'sawtooth';
    this.ambientOsc1.frequency.setValueAtTime(46.25, this.ctx.currentTime); // Low F#

    const filter1 = this.ctx.createBiquadFilter();
    filter1.type = 'lowpass';
    filter1.frequency.setValueAtTime(110, this.ctx.currentTime);
    filter1.Q.setValueAtTime(4.0, this.ctx.currentTime);

    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.08, this.ctx.currentTime);
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(30, this.ctx.currentTime);
    lfo.connect(lfoGain);
    lfoGain.connect(filter1.frequency);
    lfo.start();

    this.ambientOsc1.connect(filter1);
    filter1.connect(this.ambientGain);
    this.ambientOsc1.start();

    // Secondary eerie harmonic drone
    this.ambientOsc2 = this.ctx.createOscillator();
    this.ambientOsc2.type = 'sine';
    this.ambientOsc2.frequency.setValueAtTime(92.5, this.ctx.currentTime); // Octave up
    const filter2 = this.ctx.createBiquadFilter();
    filter2.type = 'bandpass';
    filter2.frequency.setValueAtTime(180, this.ctx.currentTime);
    filter2.Q.setValueAtTime(2.0, this.ctx.currentTime);

    const osc2Gain = this.ctx.createGain();
    osc2Gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    this.ambientOsc2.connect(filter2);
    filter2.connect(osc2Gain);
    osc2Gain.connect(this.ambientGain);
    this.ambientOsc2.start();

    // Procedural wind / hospital ventilation white noise buffer
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    this.ambientNoiseSource = this.ctx.createBufferSource();
    this.ambientNoiseSource.buffer = noiseBuffer;
    this.ambientNoiseSource.loop = true;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(320, this.ctx.currentTime);
    noiseFilter.Q.setValueAtTime(6.0, this.ctx.currentTime);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.04, this.ctx.currentTime);

    this.ambientNoiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.ambientGain);
    this.ambientNoiseSource.start();

    // Occasional procedural distant metal creak or drop
    this.scheduleDistantScare();
  }

  private scheduleDistantScare() {
    const delay = 15000 + Math.random() * 20000;
    setTimeout(() => {
      this.playDistantClang();
      this.scheduleDistantScare();
    }, delay);
  }

  public playDistantClang() {
    if (!this.ctx || !this.ambientGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const pan = this.ctx.createStereoPanner();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(280 + Math.random() * 140, t);
    osc.frequency.exponentialRampToValueAtTime(70, t + 1.2);

    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 2.5);

    pan.pan.setValueAtTime((Math.random() - 0.5) * 1.6, t);

    osc.connect(gain);
    gain.connect(pan);
    pan.connect(this.ambientGain);

    osc.start(t);
    osc.stop(t + 2.6);
  }

  // --- DYNAMIC HEARTBEAT ---
  private startHeartbeatLoop() {
    const tick = () => {
      if (this.currentHeartRate > 50) {
        this.playSingleHeartbeat();
      }
      const intervalMs = (60 / Math.max(50, this.currentHeartRate)) * 1000;
      this.heartbeatInterval = window.setTimeout(tick, intervalMs);
    };
    tick();
  }

  public updateFear(fearLevel: number) {
    // fearLevel: 0 to 100
    this.currentHeartRate = 60 + (fearLevel / 100) * 110; // 60 to 170 BPM
  }

  private playSingleHeartbeat() {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;

    const intensity = Math.min(1.0, (this.currentHeartRate - 50) / 100);
    const vol = 0.15 + intensity * 0.45;

    // First thump ("lub")
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(75 + intensity * 20, t);
    osc1.frequency.exponentialRampToValueAtTime(32, t + 0.12);

    gain1.gain.setValueAtTime(vol, t);
    gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

    osc1.connect(gain1);
    gain1.connect(this.sfxGain);
    osc1.start(t);
    osc1.stop(t + 0.15);

    // Second thump ("dub")
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    const t2 = t + 0.16;
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(65 + intensity * 15, t2);
    osc2.frequency.exponentialRampToValueAtTime(28, t2 + 0.15);

    gain2.gain.setValueAtTime(vol * 0.75, t2);
    gain2.gain.exponentialRampToValueAtTime(0.001, t2 + 0.17);

    osc2.connect(gain2);
    gain2.connect(this.sfxGain);
    osc2.start(t2);
    osc2.stop(t2 + 0.18);
  }

  // --- MONSTER SOUNDS WITH STEREO SPATIAL PANNING ---
  public updateMonsterAudio(distance: number, relativeAngle: number, state: string) {
    if (!this.ctx || !this.sfxGain) return;

    const now = Date.now();
    // Growl interval gets shorter when chasing
    const growlInterval = state === 'CHASE' ? 2500 : 5000;

    if (distance < 20 && now > this.nextMonsterGrowlTime) {
      this.nextMonsterGrowlTime = now + growlInterval + Math.random() * 2000;
      this.playMonsterRoar(distance, relativeAngle, state === 'CHASE');
    }
  }

  public playMonsterRoar(distance: number, relativeAngle: number, aggressive = false) {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;

    const pan = Math.sin(relativeAngle); // -1 left, +1 right
    const panner = this.ctx.createStereoPanner();
    panner.pan.setValueAtTime(Math.max(-0.9, Math.min(0.9, pan)), t);

    // Volume drops with distance (0 to 22 meters)
    const distFactor = Math.max(0, 1 - distance / 22);
    const volume = (aggressive ? 0.6 : 0.35) * (distFactor * distFactor);

    if (volume < 0.02) return;

    // Deep guttural groan / screech
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = aggressive ? 'sawtooth' : 'triangle';
    const baseFreq = aggressive ? 130 : 85;
    osc.frequency.setValueAtTime(baseFreq, t);
    osc.frequency.linearRampToValueAtTime(baseFreq * 1.5, t + 0.3);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.6, t + 1.2);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(aggressive ? 850 : 420, t);
    filter.Q.setValueAtTime(5, t);

    oscGain.gain.setValueAtTime(0.01, t);
    oscGain.gain.linearRampToValueAtTime(volume, t + 0.2);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 1.3);

    // Distortion / rasp
    const raspOsc = this.ctx.createOscillator();
    raspOsc.type = 'square';
    raspOsc.frequency.setValueAtTime(aggressive ? 38 : 24, t);
    const raspGain = this.ctx.createGain();
    raspGain.gain.setValueAtTime(50, t);
    raspOsc.connect(raspGain);
    raspGain.connect(osc.frequency);
    raspOsc.start(t);
    raspOsc.stop(t + 1.3);

    osc.connect(filter);
    filter.connect(oscGain);
    oscGain.connect(panner);
    panner.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 1.4);
  }

  // --- FOOTSTEPS ---
  public playFootstep(isSprinting: boolean, isCrouching: boolean) {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    // Asylum linoleum / tile footstep
    const vol = isCrouching ? 0.08 : isSprinting ? 0.35 : 0.18;
    const freq = isSprinting ? 120 : 90;

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.07);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(isSprinting ? 600 : 350, t);

    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.1);
  }

  // --- MONSTER HEAVY STEP ---
  public playMonsterStep(distance: number, relativeAngle: number) {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;

    const pan = Math.sin(relativeAngle);
    const panner = this.ctx.createStereoPanner();
    panner.pan.setValueAtTime(Math.max(-0.9, Math.min(0.9, pan)), t);

    const distFactor = Math.max(0, 1 - distance / 25);
    const vol = 0.5 * (distFactor * distFactor);
    if (vol < 0.01) return;

    // Heavy thud
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(70, t);
    osc.frequency.exponentialRampToValueAtTime(25, t + 0.2);

    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

    osc.connect(gain);
    gain.connect(panner);
    panner.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.23);

    // Chain scrape
    const chainOsc = this.ctx.createOscillator();
    const chainGain = this.ctx.createGain();
    chainOsc.type = 'sawtooth';
    chainOsc.frequency.setValueAtTime(1400 + Math.random() * 300, t + 0.05);
    chainOsc.frequency.exponentialRampToValueAtTime(500, t + 0.18);

    chainGain.gain.setValueAtTime(vol * 0.2, t + 0.05);
    chainGain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

    chainOsc.connect(chainGain);
    chainGain.connect(panner);
    chainOsc.start(t + 0.05);
    chainOsc.stop(t + 0.21);
  }

  // --- LOCKER INTERACTION ---
  public playLockerEnter() {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;

    // Metallic creak then clack shut
    const creakOsc = this.ctx.createOscillator();
    const creakGain = this.ctx.createGain();
    creakOsc.type = 'sawtooth';
    creakOsc.frequency.setValueAtTime(450, t);
    creakOsc.frequency.linearRampToValueAtTime(750, t + 0.2);
    creakOsc.frequency.exponentialRampToValueAtTime(200, t + 0.45);

    creakGain.gain.setValueAtTime(0.2, t);
    creakGain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);

    creakOsc.connect(creakGain);
    creakGain.connect(this.sfxGain);
    creakOsc.start(t);
    creakOsc.stop(t + 0.45);

    // Heavy slam latch
    const slamOsc = this.ctx.createOscillator();
    const slamGain = this.ctx.createGain();
    slamOsc.type = 'triangle';
    slamOsc.frequency.setValueAtTime(120, t + 0.45);
    slamOsc.frequency.exponentialRampToValueAtTime(35, t + 0.65);

    slamGain.gain.setValueAtTime(0.4, t + 0.45);
    slamGain.gain.exponentialRampToValueAtTime(0.001, t + 0.7);

    slamOsc.connect(slamGain);
    slamGain.connect(this.sfxGain);
    slamOsc.start(t + 0.45);
    slamOsc.stop(t + 0.72);
  }

  public playLockerExit() {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, t);
    osc.frequency.linearRampToValueAtTime(550, t + 0.25);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.36);
  }

  // --- FLASHLIGHT CLICK ---
  public playFlashlightClick(state: boolean) {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(state ? 1800 : 1200, t);
    osc.frequency.exponentialRampToValueAtTime(state ? 900 : 600, t + 0.04);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.06);
  }

  // --- ITEM PICKUP (BATTERY / KEY / SYRINGE) ---
  public playItemPickup(type: string) {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;

    if (type === 'battery') {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, t);
      osc.frequency.setValueAtTime(880, t + 0.08);

      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.22);
    } else if (type === 'key') {
      // Key jingle
      [1200, 1600, 2100].forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t + idx * 0.05);

        gain.gain.setValueAtTime(0.18, t + idx * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.05 + 0.12);

        osc.connect(gain);
        gain.connect(this.sfxGain!);
        osc.start(t + idx * 0.05);
        osc.stop(t + idx * 0.05 + 0.14);
      });
    } else {
      // Syringe / generic
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, t);
      osc.frequency.exponentialRampToValueAtTime(640, t + 0.15);

      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.26);
    }
  }

  // --- DOOR UNLOCK ---
  public playDoorUnlock() {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(300, t);
    osc.frequency.setValueAtTime(600, t + 0.1);
    osc.frequency.setValueAtTime(450, t + 0.2);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.37);
  }

  // --- JUMPSCARE / STINGER WHEN SPOTTED ---
  public playSpottedStinger() {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;

    // Dissonant screeching horror chord
    const freqs = [311.13, 329.63, 440, 466.16, 622.25]; // D#, E, A, Bb, Eb (tritones & minor seconds)
    freqs.forEach((freq) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.linearRampToValueAtTime(freq * 1.05, t + 0.6);

      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);

      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(t);
      osc.stop(t + 1.25);
    });
  }

  // --- GASPING / HEAVY BREATHING ---
  public playHeavyBreath() {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;

    // White noise filtered breath
    const bufferSize = this.ctx.sampleRate * 0.6;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(450, t);
    filter.frequency.linearRampToValueAtTime(700, t + 0.25);
    filter.frequency.linearRampToValueAtTime(350, t + 0.55);
    filter.Q.setValueAtTime(3.0, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.01, t);
    gain.gain.linearRampToValueAtTime(0.15, t + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.58);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    noise.start(t);
    noise.stop(t + 0.6);
  }

  public cleanup() {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    if (this.ctx) {
      try {
        this.ctx.close();
      } catch (e) {
        // ignore
      }
    }
    this.isInitialized = false;
  }
}

export const soundManager = new SoundManager();

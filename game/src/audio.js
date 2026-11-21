// audio.js — every sound is synthesized with WebAudio; there are no audio files.
// The context is created lazily and unlocked on the first key press or click,
// which is what browser autoplay policies require.

export function createAudio() {
  let ctx = null;
  let master = null;
  let muted = false;
  let padNodes = null;
  let stepFlip = false;

  function unlock() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.5;
    master.connect(ctx.destination);
    startPad();
  }

  function tone(freqA, freqB, dur, type, vol, when = 0) {
    if (!ctx || muted) return;
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqA, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(30, freqB), t0 + dur);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  function noiseBurst(dur, vol, freq, when = 0) {
    if (!ctx || muted) return;
    const t0 = ctx.currentTime + when;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = freq;
    const gain = ctx.createGain();
    gain.gain.value = vol;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(t0);
  }

  // A very quiet two-oscillator pad that sits under the whole heist.
  function startPad() {
    if (!ctx || padNodes) return;
    const gain = ctx.createGain();
    gain.gain.value = 0.035;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    const oscA = ctx.createOscillator();
    oscA.type = 'sine';
    oscA.frequency.value = 110;
    const oscB = ctx.createOscillator();
    oscB.type = 'sine';
    oscB.frequency.value = 164.8;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.012;
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);
    oscA.connect(filter);
    oscB.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    oscA.start();
    oscB.start();
    lfo.start();
    padNodes = { oscA, oscB, lfo, gain };
  }

  return {
    unlock,
    get muted() { return muted; },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
    footstep(running) {
      stepFlip = !stepFlip;
      noiseBurst(running ? 0.07 : 0.05, running ? 0.10 : 0.05, stepFlip ? 700 : 520);
    },
    pickup() {
      tone(880, 880, 0.09, 'sine', 0.16);
      tone(1318, 1318, 0.14, 'sine', 0.14, 0.07);
    },
    loot() {
      tone(660, 660, 0.07, 'triangle', 0.14);
      tone(990, 990, 0.1, 'triangle', 0.12, 0.05);
    },
    tick() {
      tone(1560, 1400, 0.04, 'square', 0.05);
    },
    alert() {
      tone(220, 440, 0.16, 'sawtooth', 0.16);
      tone(440, 587, 0.2, 'sawtooth', 0.12, 0.1);
    },
    complete() {
      tone(523, 523, 0.12, 'triangle', 0.15);
      tone(659, 659, 0.12, 'triangle', 0.15, 0.1);
      tone(784, 784, 0.2, 'triangle', 0.15, 0.2);
    },
    win() {
      const notes = [523, 659, 784, 1046, 784, 1046];
      notes.forEach((n, i) => tone(n, n, 0.16, 'triangle', 0.15, i * 0.11));
    },
    lose() {
      tone(392, 392, 0.16, 'sawtooth', 0.12);
      tone(330, 330, 0.16, 'sawtooth', 0.12, 0.14);
      tone(262, 196, 0.34, 'sawtooth', 0.13, 0.28);
    },
  };
}

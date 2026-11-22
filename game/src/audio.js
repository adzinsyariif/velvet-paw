// audio.js — a heist scored entirely by oscillators. No audio files exist:
// every footstep, chime and alarm is synthesised with WebAudio at the moment
// it is heard. The context stays locked until the player's first key press
// or click, which is exactly what browser autoplay policies demand.

export function createAudio() {
  let context = null;
  let masterBus = null;
  let padVoices = null;
  let isMuted = false;
  let leftFootNext = false;

  // Bring the context to life (or wake it) and start the room tone.
  function unlock() {
    if (context) {
      if (context.state === 'suspended') context.resume();
      return;
    }
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return;
    context = new AudioCtor();
    masterBus = context.createGain();
    masterBus.gain.value = isMuted ? 0 : 0.5;
    masterBus.connect(context.destination);
    startRoomPad();
  }

  // One pitched voice: a glide from freqFrom to freqTo under a quick-attack,
  // exponential-decay envelope. Nearly every sound in the game is this.
  function voice(freqFrom, freqTo, seconds, wave, volume, delay = 0) {
    if (!context || isMuted) return;
    const start = context.currentTime + delay;
    const osc = context.createOscillator();
    const envelope = context.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(freqFrom, start);
    osc.frequency.exponentialRampToValueAtTime(Math.max(30, freqTo), start + seconds);
    envelope.gain.setValueAtTime(0, start);
    envelope.gain.linearRampToValueAtTime(volume, start + 0.012);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
    osc.connect(envelope);
    envelope.connect(masterBus);
    osc.start(start);
    osc.stop(start + seconds + 0.05);
  }

  // One noise voice: a buffer of white noise decaying linearly, low-passed.
  // Footsteps are this and nothing else — the filter pitch sells the surface.
  function noiseVoice(seconds, volume, filterFreq, delay = 0) {
    if (!context || isMuted) return;
    const start = context.currentTime + delay;
    const sampleCount = Math.max(1, Math.floor(context.sampleRate * seconds));
    const buffer = context.createBuffer(1, sampleCount, context.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let i = 0; i < sampleCount; i++) {
      samples[i] = (Math.random() * 2 - 1) * (1 - i / sampleCount);
    }
    const source = context.createBufferSource();
    source.buffer = buffer;
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    const gain = context.createGain();
    gain.gain.value = volume;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(masterBus);
    source.start(start);
  }

  // The room itself: two detuned sines breathing through a dark filter,
  // quiet enough to forget — until it stops.
  function startRoomPad() {
    if (!context || padVoices) return;
    const padGain = context.createGain();
    padGain.gain.value = 0.035;
    const padFilter = context.createBiquadFilter();
    padFilter.type = 'lowpass';
    padFilter.frequency.value = 420;

    const root = context.createOscillator();
    root.type = 'sine';
    root.frequency.value = 110;
    const fifth = context.createOscillator();
    fifth.type = 'sine';
    fifth.frequency.value = 164.8;

    const breath = context.createOscillator();
    breath.frequency.value = 0.07;
    const breathDepth = context.createGain();
    breathDepth.gain.value = 0.012;
    breath.connect(breathDepth);
    breathDepth.connect(padGain.gain);

    root.connect(padFilter);
    fifth.connect(padFilter);
    padFilter.connect(padGain);
    padGain.connect(masterBus);
    root.start();
    fifth.start();
    breath.start();
    padVoices = { root, fifth, breath, padGain };
  }

  // A phrase is a list of [note, seconds, wave, volume, delay] voices rung
  // in sequence — the game's whole vocabulary of chimes and alarms.
  function playPhrase(notes) {
    for (const [freq, seconds, wave, volume, delay] of notes) {
      voice(freq, freq, seconds, wave, volume, delay);
    }
  }

  return {
    unlock,

    get muted() {
      return isMuted;
    },

    toggleMute() {
      isMuted = !isMuted;
      if (masterBus) masterBus.gain.value = isMuted ? 0 : 0.5;
      return isMuted;
    },

    // Alternating feet, left slightly brighter than right. Running is
    // louder and duller — more paw, more marble.
    footstep(running) {
      leftFootNext = !leftFootNext;
      const pitch = leftFootNext ? 700 : 520;
      if (running) noiseVoice(0.07, 0.1, pitch);
      else noiseVoice(0.05, 0.05, pitch);
    },

    pickup() {
      playPhrase([
        [880, 0.09, 'sine', 0.16, 0],
        [1318, 0.14, 'sine', 0.14, 0.07],
      ]);
    },

    loot() {
      playPhrase([
        [660, 0.07, 'triangle', 0.14, 0],
        [990, 0.1, 'triangle', 0.12, 0.05],
      ]);
    },

    // The rising suspicion tick a guard makes while his meter fills.
    tick() {
      voice(1560, 1400, 0.04, 'square', 0.05);
    },

    // Two rising glides — the sound of a quiet night going wrong.
    alert() {
      voice(220, 440, 0.16, 'sawtooth', 0.16);
      voice(440, 587, 0.2, 'sawtooth', 0.12, 0.1);
    },

    complete() {
      playPhrase([
        [523, 0.12, 'triangle', 0.15, 0],
        [659, 0.12, 'triangle', 0.15, 0.1],
        [784, 0.2, 'triangle', 0.15, 0.2],
      ]);
    },

    win() {
      const melody = [523, 659, 784, 1046, 784, 1046];
      melody.forEach((note, i) => voice(note, note, 0.16, 'triangle', 0.15, i * 0.11));
    },

    lose() {
      playPhrase([
        [392, 0.16, 'sawtooth', 0.12, 0],
        [330, 0.16, 'sawtooth', 0.12, 0.14],
      ]);
      voice(262, 196, 0.34, 'sawtooth', 0.13, 0.28);
    },
  };
}

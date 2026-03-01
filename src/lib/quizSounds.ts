/**
 * Quiz sound effects using Web Audio API (no external files needed)
 */

let audioContext: AudioContext | null = null;

const getAudioContext = (): AudioContext | null => {
  if (typeof window === "undefined") return null;
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }
  return audioContext;
};

const playTone = (frequency: number, duration: number, type: OscillatorType = "sine") => {
  const ctx = getAudioContext();
  if (!ctx) return;

  const doPlay = () => {
    try {
      const osc = ctx!.createOscillator();
      const gain = ctx!.createGain();
      osc.connect(gain);
      gain.connect(ctx!.destination);
      osc.frequency.value = frequency;
      osc.type = type;
      gain.gain.setValueAtTime(0.15, ctx!.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx!.currentTime + duration);
      osc.start(ctx!.currentTime);
      osc.stop(ctx!.currentTime + duration);
    } catch {
      // Ignore if audio fails
    }
  };

  if (ctx.state === "suspended") {
    ctx.resume().then(doPlay).catch(() => {});
  } else {
    doPlay();
  }
};

/** Play when answer is correct */
export const playCorrect = () => {
  playTone(523, 0.15);
  setTimeout(() => playTone(659, 0.15), 80);
};

/** Play when answer is wrong */
export const playWrong = () => {
  playTone(200, 0.25, "square");
};

/** Play when quiz is completed */
export const playComplete = () => {
  const ctx = getAudioContext();
  if (!ctx) return;

  const notes = [523, 659, 784, 1047];
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(freq, 0.2), i * 120);
  });
};

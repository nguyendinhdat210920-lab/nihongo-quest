/**
 * Text-to-speech for flashcards - supports Japanese (ja-JP) and fallback
 */

const hasJapanese = (text: string) =>
  /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text);

const getVoice = (lang: string): SpeechSynthesisVoice | undefined => {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return undefined;
  const voices = window.speechSynthesis.getVoices();
  const pattern = lang === "ja-JP" ? /ja[-_]?JP/i : new RegExp(lang.replace("-", "[-_]?"));
  return voices.find((v) => pattern.test(v.lang)) ?? voices[0];
};

let voicesLoaded = false;
const loadVoices = (cb: () => void) => {
  if (voicesLoaded) return cb();
  const synth = window.speechSynthesis;
  const doLoad = () => {
    synth.getVoices();
    voicesLoaded = true;
    cb();
  };
  if (synth.getVoices().length) doLoad();
  else synth.addEventListener("voiceschanged", doLoad, { once: true });
};

/** Speak text - auto-detects Japanese for ja-JP voice */
export const speakText = (text: string, e?: React.MouseEvent) => {
  e?.stopPropagation();
  if (!text?.trim() || typeof window === "undefined" || !("speechSynthesis" in window)) return;

  const synth = window.speechSynthesis;
  synth.cancel();

  loadVoices(() => {
    const lang = hasJapanese(text) ? "ja-JP" : "en-US";
    const voice = getVoice(lang) ?? getVoice("en") ?? undefined;
    const utterance = new SpeechSynthesisUtterance(text.trim());
    utterance.rate = 0.9;
    utterance.volume = 1;
    if (voice) utterance.voice = voice;
    if (lang) utterance.lang = lang;
    synth.speak(utterance);
  });
};

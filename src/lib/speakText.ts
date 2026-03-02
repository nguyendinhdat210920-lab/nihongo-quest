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

/** Lấy phần đọc (trong ngoặc) để TTS chỉ đọc 1 lần. Kanji để dưới, không đọc. */
export const getReadingForSpeech = (text: string): string => {
  const m = text.match(/[（(]([^）)]+)[）)]\s*$/);
  return m ? m[1].trim() : text.replace(/[（(][^）)]*[）)]/g, "").replace(/～/g, "").trim() || text.trim();
};

/** Tách front thành: reading (chính, đọc) + kanji (phụ, hiển thị dưới) */
export const parseFrontDisplay = (text: string): { reading: string; kanji: string | null } => {
  const match = text.match(/(.+?)[（(]([^）)]+)[）)]\s*$/);
  if (match) {
    const kanjiRaw = match[1].replace(/[（(][^）)]*[）)]/g, "").replace(/～/g, "").trim();
    return { reading: match[2].trim(), kanji: kanjiRaw || null };
  }
  return { reading: text.trim(), kanji: null };
};

/** Speak text - chỉ đọc phần reading (hiragana), không đọc kanji */
export const speakText = (text: string, e?: React.MouseEvent) => {
  e?.stopPropagation();
  if (!text?.trim() || typeof window === "undefined" || !("speechSynthesis" in window)) return;

  const synth = window.speechSynthesis;
  synth.cancel();

  const toSpeak = getReadingForSpeech(text);

  loadVoices(() => {
    const lang = hasJapanese(text) ? "ja-JP" : "en-US";
    const voice = getVoice(lang) ?? getVoice("en") ?? undefined;
    const utterance = new SpeechSynthesisUtterance(toSpeak);
    utterance.rate = 0.9;
    utterance.volume = 1;
    if (voice) utterance.voice = voice;
    if (lang) utterance.lang = lang;
    synth.speak(utterance);
  });
};

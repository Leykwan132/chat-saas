export const GEMINI_LIVE_VOICES = [
  'Achernar',
  'Achird',
  'Algenib',
  'Algieba',
  'Alnilam',
  'Aoede',
  'Autonoe',
  'Callirrhoe',
  'Charon',
  'Despina',
  'Enceladus',
  'Erinome',
  'Fenrir',
  'Gacrux',
  'Iapetus',
  'Kore',
  'Laomedeia',
  'Leda',
  'Orus',
  'Pulcherrima',
  'Puck',
  'Rasalgethi',
  'Sadachbia',
  'Sadaltager',
  'Schedar',
  'Sulafat',
  'Umbriel',
  'Vindemiatrix',
  'Zephyr',
  'Zubenelgenubi',
] as const;

export const DEFAULT_GEMINI_LIVE_VOICE = 'Puck';

export type GeminiLiveVoice = (typeof GEMINI_LIVE_VOICES)[number];

export function isGeminiLiveVoice(value: string): value is GeminiLiveVoice {
  return (GEMINI_LIVE_VOICES as readonly string[]).includes(value);
}

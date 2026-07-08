export type LandingTickerTextSegment =
  | {
    kind: 'text';
    text: string;
  }
  | {
    decimalPlaces: number;
    kind: 'number';
    raw: string;
    value: number;
  };

const numberPattern = /-?\d[\d,]*(?:\.\d+)?/g;

export function splitTickerText(value: string): LandingTickerTextSegment[] {
  const segments: LandingTickerTextSegment[] = [];
  let cursor = 0;

  for (const match of value.matchAll(numberPattern)) {
    const raw = match[0];
    const index = match.index ?? 0;

    if (index > cursor) {
      segments.push({ kind: 'text', text: value.slice(cursor, index) });
    }

    segments.push({
      decimalPlaces: raw.includes('.') ? raw.split('.')[1].length : 0,
      kind: 'number',
      raw,
      value: Number(raw.replace(/,/g, '')),
    });
    cursor = index + raw.length;
  }

  if (cursor < value.length) {
    segments.push({ kind: 'text', text: value.slice(cursor) });
  }

  return segments.length > 0 ? segments : [{ kind: 'text', text: value }];
}

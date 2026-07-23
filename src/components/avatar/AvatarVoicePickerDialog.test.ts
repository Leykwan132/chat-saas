import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./AvatarVoicePickerDialog.tsx', import.meta.url), 'utf8');

describe('Avatar voice picker dialog', () => {
  it('selects rows separately from one-at-a-time previews', () => {
    expect(source).toContain('<Dialog');
    expect(source).toContain('Choose a voice');
    expect(source).toContain('voice.language === languageCode');
    expect(source).toContain('api.avatarEmbed.previewVoice');
    expect(source).toContain('controller.toggle(voice.id');
    expect(source).toContain('controller.stop()');
    expect(source).toContain('<Pause');
    expect(source).toContain('<Play');
    expect(source).toContain('event.stopPropagation()');
    expect(source).toContain('No voices available');
  });

  it('initializes the preview controller without reading a ref during render', () => {
    expect(source).toContain('useState(() => new VoicePreviewController');
    expect(source).not.toContain('controllerRef.current');
  });

  it('keeps the select button transparent while the voice row owns the hover background', () => {
    expect(source).toContain("hover:bg-transparent dark:hover:bg-transparent");
  });
});

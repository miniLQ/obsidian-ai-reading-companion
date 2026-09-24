import { describe, expect, test } from 'vitest';
import { DEFAULT_SETTINGS, normalizeSettings } from '../src/settings';

describe('settings', () => {
  test('creates a default OpenAI-compatible profile', () => {
    const settings = normalizeSettings(null);
    expect(settings.enabled).toBe(false);
    expect(settings.profiles[0]).toMatchObject({
      id: 'default',
      providerId: 'openai-compatible',
      baseUrl: 'https://api.openai.com/v1',
    });
  });

  test('clamps numeric generation settings', () => {
    const settings = normalizeSettings({
      ...DEFAULT_SETTINGS,
      profiles: [{ ...DEFAULT_SETTINGS.profiles[0], temperature: 9, maxTokens: -20 }],
    });
    expect(settings.profiles[0].temperature).toBe(2);
    expect(settings.profiles[0].maxTokens).toBe(256);
  });
});

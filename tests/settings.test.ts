import { describe, expect, test } from 'vitest';
import { DEFAULT_QUICK_PROMPTS } from '../src/prompts';
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

  test('loads built-in quick prompts by default', () => {
    const settings = normalizeSettings(null);
    expect(settings.quickPrompts.map(prompt => prompt.label)).toEqual(DEFAULT_QUICK_PROMPTS.map(prompt => prompt.label));
  });

  test('preserves customized quick prompts', () => {
    const settings = normalizeSettings({
      ...DEFAULT_SETTINGS,
      quickPrompts: [{ id: 'custom', label: '我的提示词', icon: 'sparkles', prompt: '按我的方式总结', enabled: false }],
    });
    expect(settings.quickPrompts).toEqual([{ id: 'custom', label: '我的提示词', icon: 'sparkles', prompt: '按我的方式总结', enabled: false }]);
  });

  test('preserves an empty quick prompt list after user deletes all prompts', () => {
    const settings = normalizeSettings({ ...DEFAULT_SETTINGS, quickPrompts: [] });
    expect(settings.quickPrompts).toEqual([]);
  });
});

import { describe, expect, test } from 'vitest';
import { buildChatRequest, listModelNames, normalizeBaseUrl } from '../src/ai-client';
import type { AiModelConfig } from '../src/settings';

const config: AiModelConfig = {
  id: 'default',
  name: 'Default',
  providerId: 'openai-compatible',
  apiKey: 'sk-test',
  baseUrl: 'https://example.com/v1/',
  model: 'reader-model',
  temperature: 0.2,
  maxTokens: 800,
};

describe('ai-client', () => {
  test('normalizes provider base urls without duplicate slashes', () => {
    expect(normalizeBaseUrl('https://example.com/v1/')).toBe('https://example.com/v1');
    expect(normalizeBaseUrl(' https://example.com/// ')).toBe('https://example.com');
  });

  test('builds an OpenAI-compatible chat request from model config', () => {
    const request = buildChatRequest(config, [{ role: 'user', content: 'hello' }]);
    expect(request.url).toBe('https://example.com/v1/chat/completions');
    expect(request.headers.Authorization).toBe('Bearer sk-test');
    expect(JSON.parse(request.body!)).toMatchObject({
      model: 'reader-model',
      messages: [{ role: 'user', content: 'hello' }],
      temperature: 0.2,
      max_tokens: 800,
    });
  });

  test('parses model names from OpenAI-compatible model responses', () => {
    expect(listModelNames({ data: [{ id: 'alpha' }, { id: 'beta' }, { object: 'model' }] })).toEqual(['alpha', 'beta']);
  });
});

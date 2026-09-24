import { describe, expect, test } from 'vitest';
import { buildMarkdownContext, contextOrFallback, promptWithContext } from '../src/context';

describe('context', () => {
  test('uses selected text before the full note when selection exists', () => {
    const context = buildMarkdownContext({
      path: 'Articles/Long Read.md',
      content: 'full note',
      selection: ' selected passage ',
      maxChars: 100,
    });
    expect(context.title).toBe('Long Read');
    expect(context.kind).toBe('selection');
    expect(context.content).toBe('selected passage');
  });

  test('truncates long note context from the start and marks it', () => {
    const context = buildMarkdownContext({
      path: 'Daily.md',
      content: 'a'.repeat(12),
      selection: '',
      maxChars: 5,
    });
    expect(context.content).toBe('aaaaa');
    expect(context.truncated).toBe(true);
  });

  test('builds a grounded reading prompt with source metadata', () => {
    const prompt = promptWithContext('总结要点', {
      kind: 'note',
      title: 'Example',
      path: 'Example.md',
      content: 'Body',
      truncated: false,
    });
    expect(prompt).toContain('总结要点');
    expect(prompt).toContain('Example.md');
    expect(prompt).toContain('Body');
  });

  test('falls back to the last readable context when the active view has no context', () => {
    const previous = buildMarkdownContext({
      path: 'Articles/Readable.md',
      content: 'cached note',
      selection: '',
      maxChars: 100,
    });
    expect(contextOrFallback(null, previous)).toBe(previous);
  });
});

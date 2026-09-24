export type ReadingContextKind = 'note' | 'selection' | 'rss-reader';

export interface ReadingContext {
  kind: ReadingContextKind;
  title: string;
  path: string;
  content: string;
  truncated: boolean;
}

export interface MarkdownContextInput {
  path: string;
  content: string;
  selection?: string;
  maxChars: number;
}

function basename(path: string): string {
  return path.split('/').pop()?.replace(/\.md$/i, '') || 'Untitled';
}

function trimContext(value: string, maxChars: number): { content: string; truncated: boolean } {
  const normalized = value.replace(/\r\n/g, '\n').trim();
  if (normalized.length <= maxChars) return { content: normalized, truncated: false };
  return { content: normalized.slice(0, maxChars).trimEnd(), truncated: true };
}

export function buildMarkdownContext(input: MarkdownContextInput): ReadingContext {
  const selection = input.selection?.trim();
  const source = selection || input.content;
  const trimmed = trimContext(source, input.maxChars);
  return {
    kind: selection ? 'selection' : 'note',
    title: basename(input.path),
    path: input.path,
    content: trimmed.content,
    truncated: trimmed.truncated,
  };
}

export function buildReaderContext(title: string, body: string, maxChars: number): ReadingContext | null {
  const trimmed = trimContext(body, maxChars);
  if (!trimmed.content) return null;
  return {
    kind: 'rss-reader',
    title: title.trim() || 'Qiaomu AI RSS',
    path: 'qiaomu-ai-rss-reader',
    content: trimmed.content,
    truncated: trimmed.truncated,
  };
}

export function promptWithContext(instruction: string, context: ReadingContext): string {
  const scope = context.kind === 'selection' ? '当前选中文本' : context.kind === 'rss-reader' ? '当前 RSS 文章' : '当前笔记';
  const truncated = context.truncated ? '\n\n注意：上下文因为过长已被截断，请基于可见内容回答。' : '';
  return [
    `请作为 Obsidian 里的 AI 伴读助手完成任务：${instruction.trim()}`,
    `上下文类型：${scope}`,
    `标题：${context.title}`,
    `路径：${context.path}`,
    `${truncated}`,
    '---',
    context.content,
  ].join('\n');
}

interface WorkspaceLike {
  workspace: {
    activeLeaf?: {
      view?: {
        getViewType?: () => string;
        containerEl?: HTMLElement;
        file?: { path: string } | null;
        editor?: { getValue: () => string; getSelection: () => string };
      };
    } | null;
  };
}

export function extractActiveContext(app: WorkspaceLike, maxChars: number): ReadingContext | null {
  const view = app.workspace.activeLeaf?.view;
  if (view?.file?.path && view.editor) {
    return buildMarkdownContext({
      path: view.file.path,
      content: view.editor.getValue(),
      selection: view.editor.getSelection(),
      maxChars,
    });
  }
  const root = view?.containerEl;
  if (view?.getViewType?.() === 'qiaomu-ai-rss-reader' && root) {
    const article = root.querySelector<HTMLElement>('.qrs-article');
    const title = article?.querySelector('h1')?.textContent || 'Qiaomu AI RSS';
    const body = article?.querySelector<HTMLElement>('.qrs-prose')?.innerText || '';
    return buildReaderContext(title, body, maxChars);
  }
  return null;
}

export function contextOrFallback(current: ReadingContext | null, fallback: ReadingContext | null): ReadingContext | null {
  return current ?? fallback;
}

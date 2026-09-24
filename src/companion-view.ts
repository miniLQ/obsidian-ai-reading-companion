import { ItemView, MarkdownRenderer, Notice, setIcon, type WorkspaceLeaf } from 'obsidian';
import type AiReadingCompanionPlugin from './main';

export const AI_COMPANION_VIEW_TYPE = 'ai-reading-companion-view';

type TranscriptMessage = { role: 'user' | 'assistant'; content: string };

const quickPrompts = [
  { label: '总结要点', icon: 'list-checks', prompt: '请用清晰的项目符号总结核心要点，并保留关键事实。' },
  { label: '结构解析', icon: 'network', prompt: '请解析这篇内容的结构、论证路径和段落之间的关系。' },
  { label: '生成思维导图', icon: 'git-branch', prompt: '请生成 Mermaid mindmap 代码块，层级不要超过 4 层。' },
  { label: '提炼金句', icon: 'quote', prompt: '请提炼值得摘录的关键句，并说明每句为什么重要。' },
  { label: '术语解释', icon: 'book-open', prompt: '请列出文中重要术语，并用简洁中文解释。' },
  { label: '批判性问题', icon: 'message-circle-question', prompt: '请提出 5 个有助于深入理解或质疑本文的批判性问题。' },
];

export default class CompanionView extends ItemView {
  private transcript!: HTMLElement;
  private input!: HTMLTextAreaElement;
  private contextBadge!: HTMLElement;
  private messages: TranscriptMessage[] = [];
  private busy = false;

  constructor(leaf: WorkspaceLeaf, private plugin: AiReadingCompanionPlugin) {
    super(leaf);
  }

  getViewType() { return AI_COMPANION_VIEW_TYPE; }
  getDisplayText() { return 'AI 伴读'; }
  getIcon() { return 'sparkles'; }

  onOpen(): Promise<void> {
    this.contentEl.addClass('arc-root');
    this.render();
    this.registerEvent(this.app.workspace.on('active-leaf-change', () => this.refreshContextBadge()));
    return Promise.resolve();
  }

  private render() {
    this.contentEl.empty();
    const header = this.contentEl.createDiv('arc-header');
    const mark = header.createDiv('arc-mark');
    setIcon(mark, 'sparkles');
    const copy = header.createDiv();
    copy.createEl('h2', { text: 'AI 伴读' });
    this.contextBadge = copy.createDiv('arc-context');
    this.refreshContextBadge();

    this.transcript = this.contentEl.createDiv('arc-transcript');
    this.renderTranscript();

    const composer = this.contentEl.createDiv('arc-composer');
    this.renderQuickPrompts(composer);
    this.input = composer.createEl('textarea', { attr: { rows: '3', placeholder: '围绕当前笔记或文章提问...' } });
    this.input.onkeydown = event => {
      if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        void this.submit(this.input.value);
      }
    };
    const actions = composer.createDiv('arc-composer-actions');
    const clear = actions.createEl('button', { text: '清空', attr: { type: 'button' } });
    clear.onclick = () => { this.messages = []; this.renderTranscript(); };
    const send = actions.createEl('button', { text: '发送', cls: 'mod-cta', attr: { type: 'button' } });
    send.onclick = () => { void this.submit(this.input.value); };
  }

  private renderQuickPrompts(container: HTMLElement) {
    const tools = container.createDiv('arc-quick');
    for (const item of quickPrompts) {
      const button = tools.createEl('button', { attr: { type: 'button', title: item.label } });
      setIcon(button, item.icon);
      button.createSpan({ text: item.label });
      button.onclick = () => { void this.submit(item.prompt); };
    }
  }

  private refreshContextBadge() {
    if (!this.contextBadge) return;
    const context = this.plugin.currentContext();
    if (!context) {
      this.contextBadge.setText('未检测到可伴读内容');
      return;
    }
    const label = context.kind === 'selection' ? '选中文本' : context.kind === 'rss-reader' ? 'RSS 文章' : '当前笔记';
    this.contextBadge.setText(`${label} · ${context.title}${context.truncated ? ' · 已截断' : ''}`);
  }

  private renderTranscript() {
    if (!this.transcript) return;
    this.transcript.empty();
    if (!this.messages.length) {
      const empty = this.transcript.createDiv('arc-empty');
      empty.createEl('strong', { text: '打开一篇笔记或 RSS 文章后开始伴读' });
      empty.createEl('p', { text: '上方按钮会带上当前内容作为上下文，也可以直接输入自己的问题。' });
      return;
    }
    for (const message of this.messages) {
      const item = this.transcript.createDiv(`arc-message arc-${message.role}`);
      item.createDiv('arc-role').setText(message.role === 'user' ? '你' : 'AI');
      const body = item.createDiv('arc-message-body');
      if (message.role === 'assistant') {
        void MarkdownRenderer.render(this.app, message.content, body, '', this);
        const tools = item.createDiv('arc-message-tools');
        const copy = tools.createEl('button', { text: '复制', attr: { type: 'button' } });
        copy.onclick = () => {
          void navigator.clipboard.writeText(message.content).then(() => new Notice('已复制 AI 回答。'));
        };
        const insert = tools.createEl('button', { text: '插入当前笔记', attr: { type: 'button' } });
        insert.onclick = () => { void this.plugin.insertIntoCurrentNote(message.content); };
      } else {
        body.setText(message.content);
      }
    }
    this.transcript.scrollTop = this.transcript.scrollHeight;
  }

  private async submit(raw: string) {
    const prompt = raw.trim();
    if (!prompt || this.busy) return;
    this.busy = true;
    this.input.value = '';
    this.messages.push({ role: 'user', content: prompt });
    this.renderTranscript();
    try {
      const answer = await this.plugin.ask(prompt);
      this.messages.push({ role: 'assistant', content: answer });
    } catch (error) {
      new Notice(error instanceof Error ? error.message : 'AI 伴读请求失败。');
      this.messages.push({ role: 'assistant', content: `请求失败：${error instanceof Error ? error.message : '未知错误'}` });
    } finally {
      this.busy = false;
      this.renderTranscript();
      this.refreshContextBadge();
    }
  }
}

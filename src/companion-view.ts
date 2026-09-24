import { ItemView, MarkdownRenderer, Notice, setIcon, type WorkspaceLeaf } from 'obsidian';
import type AiReadingCompanionPlugin from './main';
import { dragViewport, fitViewport, zoomViewport, type ViewportState } from './viewport';

export const AI_COMPANION_VIEW_TYPE = 'ai-reading-companion-view';

type TranscriptMessage = { role: 'user' | 'assistant'; content: string };

export default class CompanionView extends ItemView {
  private transcript!: HTMLElement;
  private input!: HTMLTextAreaElement;
  private contextBadge!: HTMLElement;
  private quickContainer?: HTMLElement;
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
    this.quickContainer = tools;
    for (const item of this.plugin.quickPrompts()) {
      const button = tools.createEl('button', { attr: { type: 'button', title: item.label } });
      setIcon(button, item.icon);
      button.createSpan({ text: item.label });
      button.onclick = () => { void this.submit(item.prompt); };
    }
  }

  refreshQuickPrompts() {
    if (!this.quickContainer?.parentElement) return;
    const parent = this.quickContainer.parentElement;
    this.quickContainer.remove();
    const tools = parent.createDiv('arc-quick');
    parent.insertBefore(tools, this.input);
    this.quickContainer = tools;
    for (const item of this.plugin.quickPrompts()) {
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
        void MarkdownRenderer.render(this.app, message.content, body, '', this)
          .then(() => this.scheduleMindMapEnhancement(body));
        const tools = item.createDiv('arc-message-tools');
        const copy = tools.createEl('button', { text: '复制', attr: { type: 'button' } });
        copy.onclick = () => {
          void navigator.clipboard.writeText(message.content).then(() => new Notice('已复制 AI 回答。'));
        };
      } else {
        const normalized = message.content.replace(/\n/g, '  \n');
        void MarkdownRenderer.render(this.app, normalized, body, '', this)
          .then(() => this.scheduleMindMapEnhancement(body));
      }
    }
    this.transcript.scrollTop = this.transcript.scrollHeight;
  }

  private scheduleMindMapEnhancement(root: HTMLElement) {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => this.enhanceMindMaps(root));
    });
  }

  private enhanceMindMaps(root: HTMLElement) {
    for (const mermaid of Array.from(root.querySelectorAll<HTMLElement>('.mermaid'))) {
      if (mermaid.closest('.arc-mindmap-viewer')) continue;
      const svg = mermaid.querySelector<SVGSVGElement>('svg');
      if (!svg) continue;
      this.wrapMindMap(mermaid, svg);
    }
  }

  private wrapMindMap(mermaid: HTMLElement, svg: SVGSVGElement) {
    const viewer = mermaid.createDiv('arc-mindmap-viewer');
    const toolbar = viewer.createDiv('arc-mindmap-toolbar');
    const hint = toolbar.createSpan({ text: '滚轮缩放 · 拖拽移动' });
    hint.addClass('arc-mindmap-hint');
    const zoomOut = toolbar.createEl('button', { text: '−', attr: { type: 'button', title: '缩小' } });
    const reset = toolbar.createEl('button', { text: '复位', attr: { type: 'button', title: '复位' } });
    const zoomIn = toolbar.createEl('button', { text: '+', attr: { type: 'button', title: '放大' } });
    const canvas = viewer.createDiv('arc-mindmap-canvas');
    const stage = canvas.createDiv('arc-mindmap-stage');
    stage.appendChild(svg);
    mermaid.appendChild(viewer);

    const bounds = this.mindMapBounds(svg);
    svg.setAttribute('width', String(bounds.width));
    svg.setAttribute('height', String(bounds.height));
    svg.style.width = `${bounds.width}px`;
    svg.style.height = `${bounds.height}px`;
    svg.style.maxWidth = 'none';
    stage.style.width = `${bounds.width}px`;
    stage.style.height = `${bounds.height}px`;
    svg.setAttribute('preserveAspectRatio', 'xMinYMin meet');

    let state = this.initialMindMapState(bounds, canvas);
    const apply = () => {
      stage.style.transform = `translate(${state.x}px, ${state.y}px) scale(${state.scale})`;
    };
    apply();

    const zoomAt = (factor: number, x = canvas.clientWidth / 2, y = canvas.clientHeight / 2) => {
      state = zoomViewport(state, factor, { x, y });
      apply();
    };
    zoomOut.onclick = () => zoomAt(0.82);
    zoomIn.onclick = () => zoomAt(1.18);
    reset.onclick = () => { state = this.initialMindMapState(bounds, canvas); apply(); };
    canvas.ondblclick = () => { state = this.initialMindMapState(bounds, canvas); apply(); };
    canvas.onwheel = event => {
      event.preventDefault();
      const rect = canvas.getBoundingClientRect();
      zoomAt(event.deltaY < 0 ? 1.12 : 0.88, event.clientX - rect.left, event.clientY - rect.top);
    };

    let drag: { id: number; x: number; y: number } | null = null;
    canvas.onpointerdown = event => {
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY };
      canvas.setPointerCapture(event.pointerId);
      canvas.addClass('is-dragging');
    };
    canvas.onpointermove = event => {
      if (!drag || drag.id !== event.pointerId) return;
      state = dragViewport(state, event.clientX - drag.x, event.clientY - drag.y);
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY };
      apply();
    };
    const stopDrag = (event: PointerEvent) => {
      if (!drag || drag.id !== event.pointerId) return;
      drag = null;
      canvas.releasePointerCapture(event.pointerId);
      canvas.removeClass('is-dragging');
    };
    canvas.onpointerup = stopDrag;
    canvas.onpointercancel = stopDrag;
  }

  private mindMapBounds(svg: SVGSVGElement): { width: number; height: number } {
    const box = svg.viewBox.baseVal;
    if (box?.width && box?.height) return { width: box.width, height: box.height };
    const rect = svg.getBoundingClientRect();
    return { width: rect.width || 900, height: rect.height || 520 };
  }

  private initialMindMapState(bounds: { width: number; height: number }, canvas: HTMLElement): ViewportState {
    return fitViewport(bounds, { width: canvas.clientWidth || 720, height: canvas.clientHeight || 420 });
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

import { ItemView, MarkdownRenderer, Notice, setIcon, type WorkspaceLeaf } from 'obsidian';
import type AiReadingCompanionPlugin from './main';

export const AI_COMPANION_VIEW_TYPE = 'ai-reading-companion-view';

type TranscriptMessage = { role: 'user' | 'assistant'; content: string };

const quickPrompts = [
  // ===== 第一组：读懂 =====
  {
    label: '总结要点',
    icon: 'list-checks',
    prompt: '用不超过 7 条项目符号总结核心要点。每条先写结论，结论加粗并用双引号，再换行后用「依据：」开头写一句话说明。\n要求：保留关键事实、数据、人名和出处；用有序编号标记每一条；如果原文有明确的主旨句，优先引用；如果原文信息不足，请明确说“原文未提及”，不要编造；依据字段不要加编号。'
  },
  {
    label: '结构解析',
    icon: 'network',
    prompt: '解析这篇内容的结构。请按以下格式输出：\n1. 整体结构类型（如总分、递进、对比、问题—解决等）\n2. 每个部分的核心功能（用一句话）\n3. 段落之间的逻辑关系（因果/并列/转折/递进）\n4. 作者的论证路径：从哪个前提出发？经过哪些步骤？得出什么结论？\n5. 请引用原文中的过渡句或关键词作为依据。\n输出前先判断内容类型（论述/叙事/说明/评论），并根据类型调整侧重点。'
  },
  {
    label: '生成思维导图',
    icon: 'git-branch',
    prompt: '生成 Mermaid mindmap 代码块，层级不超过 4 层。要求：\n1. 根节点为文章标题或核心主题\n2. 第一层为 3—5 个主要分支\n3. 每个分支下只保留最关键的 2—3 个子节点\n4. 节点文字尽量短，不超过 12 个字\n5. 不要添加原文中没有的内容'
  },
  {
    label: '术语解释',
    icon: 'book-open',
    prompt: '列出文中出现的 5—10 个重要术语或概念。请严格按以下格式输出，术语用有序编号，字段用固定标签加冒号，字段之间换行，不要给字段加编号：\n\n1. **术语**：xxx\n**文中含义**：xxx\n**一句话理解**：xxx\n**相关概念**：xxx\n**特殊用法**：xxx\n\n2. **术语**：xxx\n**文中含义**：xxx\n**一句话理解**：xxx\n**相关概念**：xxx\n**特殊用法**：xxx\n\n（以此类推）\n\n要求：\n- 每个术语之间空一行\n- 字段标题统一用「文中含义 / 一句话理解 / 相关概念 / 特殊用法」，不要写成「2. 文中含义」\n- 结合上下文解释，不要只给词典定义\n- 一句话理解用大白话或类比\n- 如果原文信息不足，请明确说“原文未提及”，不要编造'
  },

  // ===== 第二组：内化 =====
  {
    label: '提炼金句',
    icon: 'quote',
    prompt: '提炼 5—8 句值得摘录的关键句。请严格按以下格式输出，金句用有序编号，字段用固定标签加冒号，字段之间换行，不要给字段加编号：\n\n1. **原句**：“xxx”\n**为什么重要**：xxx\n**可迁移场景**：xxx\n\n2. **原句**：“xxx”\n**为什么重要**：xxx\n**可迁移场景**：xxx\n\n（以此类推）\n\n要求：\n- 每个金句之间空一行\n- 字段标题统一用「为什么重要 / 可迁移场景」，不要写成「2. 为什么重要」\n- 优先选择有洞察力、可独立传播、能引发思考的句子\n- 如果原文信息不足，请明确说“原文未提及”，不要编造'
  },
  {
    label: '与我对话',
    icon: 'messages-square',
    prompt: '基于当前内容，提出 3 个能让我把内容与自身经验、已有知识或当前问题连接起来的问题。每个问题要具体、开放，不要问“你有什么感想”这类空泛问题。每个问题后附一句“为什么问这个”，说明它想帮我打通什么。'
  },
  {
    label: '批判性问题',
    icon: 'message-circle-question',
    prompt: '提出 5 个有助于深入理解或质疑本文的批判性问题。要求：\n1. 至少 1 个针对前提假设\n2. 至少 1 个针对证据充分性\n3. 至少 1 个针对论证逻辑\n4. 至少 1 个针对替代解释或反例\n5. 至少 1 个针对现实应用或边界条件\n每个问题后附一句“追问方向”，说明可以从哪个角度继续思考。'
  },
  {
    label: '一句话带走',
    icon: 'sparkles',
    prompt: '用一句话概括这篇内容最值得记住的东西。要求：不超过 40 字，必须包含核心结论，尽量口语化，能直接复述给别人听。如果原文信息不足，请明确说“原文未提及”，不要编造。'
  },
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
        const normalized = message.content.replace(/\n/g, '  \n');
        void MarkdownRenderer.render(this.app, normalized, body, '', this);
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

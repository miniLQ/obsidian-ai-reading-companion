import { MarkdownView, Notice, Plugin, PluginSettingTab, requestUrl, Setting, type App } from 'obsidian';
import { fetchModelNames, sendChat, type ChatMessage, type HttpRequest } from './ai-client';
import CompanionView, { AI_COMPANION_VIEW_TYPE } from './companion-view';
import { contextOrFallback, extractActiveContext, promptWithContext, type ReadingContext } from './context';
import { activeProfile, DEFAULT_SETTINGS, normalizeSettings, type AiReadingCompanionSettings, type AiModelConfig } from './settings';

export default class AiReadingCompanionPlugin extends Plugin {
  settings: AiReadingCompanionSettings = DEFAULT_SETTINGS;
  private lastReadableContext: ReadingContext | null = null;

  async onload() {
    this.settings = normalizeSettings(await this.loadData());
    this.registerView(AI_COMPANION_VIEW_TYPE, leaf => new CompanionView(leaf, this));
    this.addRibbonIcon('sparkles', '打开 AI 伴读', () => { void this.openCompanion(); });
    this.addCommand({ id: 'open-ai-reading-companion', name: '打开 AI 伴读', callback: () => { void this.openCompanion(); } });
    this.addCommand({ id: 'summarize-current-context', name: 'AI 伴读：总结当前内容', callback: () => {
      void this.openCompanion().then(() => this.ask('请总结当前内容的核心要点。').then(answer => new Notice(answer.slice(0, 140))));
    } });
    this.addSettingTab(new AiReadingCompanionSettingTab(this.app, this));
    this.registerEvent(this.app.workspace.on('active-leaf-change', () => { this.captureCurrentContext(); }));
    this.app.workspace.onLayoutReady(() => { this.captureCurrentContext(); });
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  currentContext() {
    const current = this.captureCurrentContext();
    return contextOrFallback(current, this.lastReadableContext);
  }

  private captureCurrentContext(): ReadingContext | null {
    const current = extractActiveContext(this.app, this.settings.contextMaxChars);
    if (current) this.lastReadableContext = current;
    return current;
  }

  async openCompanion() {
    let leaf = this.app.workspace.getLeavesOfType(AI_COMPANION_VIEW_TYPE)[0];
    if (!leaf) {
      leaf = this.app.workspace.getRightLeaf(false) ?? this.app.workspace.getLeaf('tab');
      await leaf.setViewState({ type: AI_COMPANION_VIEW_TYPE, active: true });
    }
    await leaf.loadIfDeferred();
    await this.app.workspace.revealLeaf(leaf);
  }

  async ask(instruction: string): Promise<string> {
    if (!this.settings.enabled) throw new Error('请先在设置中启用 AI 伴读。');
    const profile = activeProfile(this.settings);
    const context = this.currentContext();
    if (!context) throw new Error('请先打开一篇 Markdown 笔记或 Qiaomu RSS 文章。');
    const messages: ChatMessage[] = [
      { role: 'system', content: '你是 Obsidian 里的 AI 伴读助手。回答要准确、结构清晰，默认使用中文。不要编造上下文中不存在的事实。' },
      { role: 'user', content: promptWithContext(instruction, context) },
    ];
    return sendChat(profile, messages, request => this.request(request));
  }

  async listModels(profile: AiModelConfig): Promise<string[]> {
    return fetchModelNames(profile, request => this.request(request));
  }

  async testConnection(profile: AiModelConfig): Promise<string> {
    return sendChat(profile, [
      { role: 'system', content: '你只需要用中文简短回答连接状态。' },
      { role: 'user', content: '请回复“连接成功”。' },
    ], request => this.request(request));
  }

  async insertIntoCurrentNote(content: string) {
    const markdown = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!markdown) throw new Error('请先打开一个 Markdown 笔记。');
    markdown.editor.replaceSelection(`\n\n${content.trim()}\n`);
    new Notice('已插入当前笔记。');
  }

  private async request(request: HttpRequest) {
    const response = await requestUrl({
      url: request.url,
      method: request.method,
      headers: request.headers,
      body: request.body,
      throw: false,
    });
    return { status: response.status, json: response.json, text: response.text };
  }
}

class AiReadingCompanionSettingTab extends PluginSettingTab {
  private section = '模型';
  private modelOptions: string[] = [];

  constructor(app: App, private plugin: AiReadingCompanionPlugin) {
    super(app, plugin);
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.addClass('arc-settings');
    const header = new Setting(containerEl).setName('AI 伴读');
    header.settingEl.addClass('arc-settings-header');
    const nav = header.settingEl.createDiv({ cls: 'arc-settings-tabs', attr: { role: 'tablist' } });
    for (const section of ['模型', '伴读', '关于']) {
      const button = nav.createEl('button', {
        text: section,
        attr: { role: 'tab', 'aria-selected': String(section === this.section), type: 'button' },
      });
      button.onclick = () => { this.section = section; this.display(); };
    }
    if (this.section === '模型') this.renderModelSettings(containerEl);
    if (this.section === '伴读') this.renderCompanionSettings(containerEl);
    if (this.section === '关于') this.renderAbout(containerEl);
  }

  private profile(): AiModelConfig {
    return activeProfile(this.plugin.settings);
  }

  private async saveProfile(next: AiModelConfig) {
    const index = this.plugin.settings.profiles.findIndex(profile => profile.id === this.plugin.settings.activeProfileId);
    this.plugin.settings.profiles[index >= 0 ? index : 0] = next;
    this.plugin.settings = normalizeSettings(this.plugin.settings);
    await this.plugin.saveSettings();
  }

  private renderModelSettings(containerEl: HTMLElement) {
    const profile = this.profile();
    new Setting(containerEl).setName('配置名称').addText(text => text
      .setValue(profile.name)
      .onChange(value => { void this.saveProfile({ ...this.profile(), name: value }); }));
    new Setting(containerEl).setName('Provider ID').setDesc('第一版使用 OpenAI-compatible 协议；该字段作为供应商标识保留。').addText(text => text
      .setPlaceholder('openai-compatible')
      .setValue(profile.providerId)
      .onChange(value => { void this.saveProfile({ ...this.profile(), providerId: value }); }));
    new Setting(containerEl).setName('API Key').setDesc('会保存在当前库的插件数据中，Obsidian 不会加密该字段。').addText(text => {
      text.inputEl.type = 'password';
      text.setPlaceholder('sk-...')
        .setValue(profile.apiKey)
        .onChange(value => { void this.saveProfile({ ...this.profile(), apiKey: value }); });
    });
    new Setting(containerEl).setName('Base URL').addText(text => text
      .setPlaceholder('https://api.openai.com/v1')
      .setValue(profile.baseUrl)
      .onChange(value => { void this.saveProfile({ ...this.profile(), baseUrl: value }); }));
    new Setting(containerEl).setName('Model Name').addText(text => text
      .setPlaceholder('gpt-4o-mini')
      .setValue(profile.model)
      .onChange(value => { void this.saveProfile({ ...this.profile(), model: value }); }));
    if (this.modelOptions.length) {
      new Setting(containerEl).setName('已获取模型').addDropdown(drop => {
        for (const model of this.modelOptions) drop.addOption(model, model);
        drop.setValue(profile.model);
        drop.onChange(value => { void this.saveProfile({ ...this.profile(), model: value }).then(() => this.display()); });
      });
    }
    new Setting(containerEl).setName('Temperature').addText(text => {
      text.inputEl.type = 'number';
      text.inputEl.min = '0'; text.inputEl.max = '2'; text.inputEl.step = '0.1';
      text.setValue(String(profile.temperature)).onChange(value => { void this.saveProfile({ ...this.profile(), temperature: Number(value) }); });
    });
    new Setting(containerEl).setName('Max Tokens').addText(text => {
      text.inputEl.type = 'number';
      text.inputEl.min = '256'; text.inputEl.step = '256';
      text.setValue(String(profile.maxTokens)).onChange(value => { void this.saveProfile({ ...this.profile(), maxTokens: Number(value) }); });
    });
    new Setting(containerEl).setName('连接').setDesc('获取模型会读取 /models；测试连接会发送一次极短对话。')
      .addButton(button => button.setButtonText('获取模型').onClick(async () => {
        try {
          this.modelOptions = await this.plugin.listModels(this.profile());
          new Notice(this.modelOptions.length ? `获取到 ${this.modelOptions.length} 个模型。` : '服务未返回模型列表。');
          this.display();
        } catch (error) { new Notice(error instanceof Error ? error.message : '获取模型失败。'); }
      }))
      .addButton(button => button.setButtonText('测试连接').onClick(async () => {
        try {
          const answer = await this.plugin.testConnection(this.profile());
          new Notice(answer || '连接成功。');
        } catch (error) { new Notice(error instanceof Error ? error.message : '测试连接失败。'); }
      }))
      .addButton(button => button.setButtonText('保存').setCta().onClick(async () => {
        await this.plugin.saveSettings();
        new Notice('AI 伴读配置已保存。');
      }));
  }

  private renderCompanionSettings(containerEl: HTMLElement) {
    new Setting(containerEl).setName('启用 AI 伴读').setDesc('启用后可打开右侧栏对当前笔记、选中文本或 Qiaomu RSS 文章进行伴读。').addToggle(toggle => toggle
      .setValue(this.plugin.settings.enabled)
      .onChange(async value => {
        this.plugin.settings.enabled = value;
        await this.plugin.saveSettings();
        if (value) await this.plugin.openCompanion();
      }));
    new Setting(containerEl).setName('上下文最大字符数').setDesc('长文会从开头截断，避免超过模型上下文限制。').addText(text => {
      text.inputEl.type = 'number';
      text.inputEl.min = '1000'; text.inputEl.max = '60000'; text.inputEl.step = '1000';
      text.setValue(String(this.plugin.settings.contextMaxChars)).onChange(async value => {
        this.plugin.settings.contextMaxChars = Number(value);
        this.plugin.settings = normalizeSettings(this.plugin.settings);
        await this.plugin.saveSettings();
      });
    });
  }

  private renderAbout(containerEl: HTMLElement) {
    new Setting(containerEl).setName('适用范围').setDesc('AI 伴读默认读取当前 Markdown 笔记或选中文本；当活动视图是 Qiaomu AI RSS 阅读器时，会读取当前文章正文。');
    new Setting(containerEl).setName('隐私提示').setDesc('只有点击发送或快捷伴读按钮时，当前上下文才会发送到你配置的模型服务。API Key 存储在本地插件数据中。');
  }
}

# AI Reading Companion

AI Reading Companion is an Obsidian plugin that adds an AI-powered reading side panel for the current note, selected text, and Qiaomu AI RSS articles.

It is designed for reading workflows: summarize, analyze structure, generate interactive mind maps, extract quotes, explain terms, ask critical questions, and customize your own quick prompts.

## Features

- AI chat side panel in Obsidian.
- Uses the current Markdown note, selected text, or active Qiaomu AI RSS article as context.
- OpenAI-compatible model configuration.
- Model list fetching and connection testing.
- Customizable quick prompts:
  - Add, edit, delete, enable, disable, reorder.
  - Restore one prompt or all built-in defaults.
- Interactive Mermaid mind map viewer:
  - Drag to pan.
  - Mouse wheel to zoom around the pointer.
  - Zoom in, zoom out, and reset controls.
- Copy AI answers as Markdown.

## Installation

Download or build the plugin, then copy these files into your vault:

```text
.obsidian/plugins/ai-reading-companion/
  main.js
  manifest.json
  styles.css
```

Restart Obsidian or reload plugins, then enable **AI Reading Companion** in Community Plugins.

## Model Configuration

Open the plugin settings and configure a model profile:

- Provider ID: currently intended for OpenAI-compatible providers.
- API Key.
- Base URL, for example `https://api.openai.com/v1`.
- Model Name.
- Temperature.
- Max Tokens.

Use **Fetch Models** to load model names when your provider supports `/models`, and **Test Connection** to verify the chat endpoint.

> API keys are stored in the current vault's local plugin data. Obsidian does not encrypt this field.

## Usage

1. Open a Markdown note, select text, or open an article in Qiaomu AI RSS.
2. Open the AI Reading Companion side panel.
3. Click a quick prompt or type your own question.
4. Copy the AI response when needed.

The plugin only sends context to your configured model provider when you click a quick prompt or send a message.

## Quick Prompts

Built-in quick prompts include:

- Summary.
- Structure analysis.
- Interactive tree-style mind map.
- Quote extraction.
- Term explanation.
- Critical questions.
- Self-dialogue questions.
- One-sentence takeaway.

You can edit all prompts from **Settings -> AI Reading Companion -> Prompts**.

## Qiaomu AI RSS Integration

When the active Obsidian view is `qiaomu-ai-rss-reader`, the plugin reads the current article title and body from the reader view and uses it as AI context.

No direct dependency on Qiaomu AI RSS is required. If the RSS plugin is not installed, AI Reading Companion still works with normal Markdown notes.

## Development

Install dependencies:

```bash
npm install
```

Run tests:

```bash
npm test
```

Build:

```bash
npm run build
```

Run the full check:

```bash
npm run check
```

## Links

- Project: https://github.com/miniLQ/obsidian-ai-reading-companion
- Issues: https://github.com/miniLQ/obsidian-ai-reading-companion/issues
- Author homepage: https://www.iliuqi.com

## License

MIT

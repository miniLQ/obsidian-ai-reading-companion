import type { AiModelConfig } from './settings';

export type ChatRole = 'system' | 'user' | 'assistant';
export interface ChatMessage { role: ChatRole; content: string }

export interface HttpRequest {
  url: string;
  method: 'GET' | 'POST';
  headers: Record<string, string>;
  body?: string;
}

export interface HttpResponse {
  status: number;
  json?: unknown;
  text?: string;
}

export type HttpRequester = (request: HttpRequest) => Promise<HttpResponse>;

export function normalizeBaseUrl(value: string): string {
  const trimmed = value.trim().replace(/\/+$/g, '');
  if (!trimmed) throw new Error('请填写 Base URL。');
  return trimmed;
}

function providerUrl(config: AiModelConfig, path: string): string {
  return `${normalizeBaseUrl(config.baseUrl)}${path}`;
}

function headers(config: AiModelConfig): Record<string, string> {
  if (!config.apiKey.trim()) throw new Error('请先填写 API Key。');
  return {
    Authorization: `Bearer ${config.apiKey.trim()}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
}

export function buildChatRequest(config: AiModelConfig, messages: ChatMessage[]): HttpRequest {
  return {
    url: providerUrl(config, '/chat/completions'),
    method: 'POST',
    headers: headers(config),
    body: JSON.stringify({
      model: config.model,
      messages,
      temperature: config.temperature,
      max_tokens: config.maxTokens,
    }),
  };
}

export function buildModelsRequest(config: AiModelConfig): HttpRequest {
  return { url: providerUrl(config, '/models'), method: 'GET', headers: headers(config) };
}

export function listModelNames(payload: unknown): string[] {
  if (!payload || typeof payload !== 'object' || !Array.isArray((payload as { data?: unknown }).data)) return [];
  return (payload as { data: unknown[] }).data
    .map(item => item && typeof item === 'object' ? (item as { id?: unknown }).id : undefined)
    .filter((id): id is string => typeof id === 'string' && id.trim().length > 0);
}

function responsePayload(response: HttpResponse): unknown {
  if (response.json !== undefined) return response.json;
  if (!response.text) return null;
  try { return JSON.parse(response.text); }
  catch { return response.text; }
}

function errorMessage(response: HttpResponse): string {
  const payload = responsePayload(response);
  if (payload && typeof payload === 'object') {
    const message = (payload as { error?: { message?: unknown }, message?: unknown }).error?.message
      ?? (payload as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  return `模型服务返回 ${response.status}`;
}

export async function fetchModelNames(config: AiModelConfig, requester: HttpRequester): Promise<string[]> {
  const response = await requester(buildModelsRequest(config));
  if (response.status < 200 || response.status >= 300) throw new Error(errorMessage(response));
  return listModelNames(responsePayload(response));
}

export async function sendChat(config: AiModelConfig, messages: ChatMessage[], requester: HttpRequester): Promise<string> {
  const response = await requester(buildChatRequest(config, messages));
  if (response.status < 200 || response.status >= 300) throw new Error(errorMessage(response));
  const payload = responsePayload(response);
  const content = payload && typeof payload === 'object'
    ? (payload as { choices?: Array<{ message?: { content?: unknown } }> }).choices?.[0]?.message?.content
    : undefined;
  if (typeof content !== 'string' || !content.trim()) throw new Error('模型没有返回可读内容。');
  return content.trim();
}

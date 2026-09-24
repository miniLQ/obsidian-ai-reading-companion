import { z } from 'zod';
import { cloneDefaultQuickPrompts, type QuickPrompt } from './prompts';

export const aiModelConfigSchema = z.object({
  id: z.string().min(1).catch('default'),
  name: z.string().max(80).catch('Default'),
  providerId: z.string().max(80).catch('openai-compatible'),
  apiKey: z.string().catch(''),
  baseUrl: z.string().catch('https://api.openai.com/v1'),
  model: z.string().catch('gpt-4o-mini'),
  temperature: z.number().catch(0.3),
  maxTokens: z.number().int().catch(1200),
});

export type AiModelConfig = z.infer<typeof aiModelConfigSchema>;

const quickPromptSchema = z.object({
  id: z.string().min(1).catch('custom'),
  label: z.string().max(80).catch('提示词'),
  icon: z.string().max(80).catch('sparkles'),
  prompt: z.string().catch(''),
  enabled: z.boolean().catch(true),
});

export interface AiReadingCompanionSettings {
  enabled: boolean;
  activeProfileId: string;
  profiles: AiModelConfig[];
  quickPrompts: QuickPrompt[];
  contextMaxChars: number;
}

const defaultProfile: AiModelConfig = {
  id: 'default',
  name: 'Default',
  providerId: 'openai-compatible',
  apiKey: '',
  baseUrl: 'https://api.openai.com/v1',
  model: 'gpt-4o-mini',
  temperature: 0.3,
  maxTokens: 1200,
};

export const DEFAULT_SETTINGS: AiReadingCompanionSettings = {
  enabled: false,
  activeProfileId: 'default',
  profiles: [defaultProfile],
  quickPrompts: cloneDefaultQuickPrompts(),
  contextMaxChars: 12000,
};

const settingsSchema = z.object({
  enabled: z.boolean().catch(false),
  activeProfileId: z.string().catch('default'),
  profiles: z.array(aiModelConfigSchema).catch([defaultProfile]),
  quickPrompts: z.array(quickPromptSchema).optional(),
  contextMaxChars: z.number().int().catch(12000),
});

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalizeProfile(profile: AiModelConfig, index: number): AiModelConfig {
  const id = profile.id.trim() || `profile-${index + 1}`;
  return {
    ...profile,
    id,
    name: profile.name.trim() || id,
    providerId: profile.providerId.trim() || 'openai-compatible',
    apiKey: profile.apiKey.trim(),
    baseUrl: profile.baseUrl.trim() || 'https://api.openai.com/v1',
    model: profile.model.trim() || 'gpt-4o-mini',
    temperature: clamp(profile.temperature, 0, 2),
    maxTokens: clamp(profile.maxTokens, 256, 128000),
  };
}

function normalizeQuickPrompt(prompt: z.infer<typeof quickPromptSchema>, index: number): QuickPrompt {
  const id = prompt.id.trim() || `custom-${index + 1}`;
  return {
    id,
    label: prompt.label.trim() || '提示词',
    icon: prompt.icon.trim() || 'sparkles',
    prompt: prompt.prompt.trim(),
    enabled: prompt.enabled,
  };
}

export function normalizeSettings(data: unknown): AiReadingCompanionSettings {
  const parsed = settingsSchema.parse(data ?? DEFAULT_SETTINGS);
  const profiles = (parsed.profiles.length ? parsed.profiles : [defaultProfile]).map(normalizeProfile);
  const quickPrompts = (parsed.quickPrompts ?? cloneDefaultQuickPrompts()).map(normalizeQuickPrompt);
  const activeProfileId = profiles.some(profile => profile.id === parsed.activeProfileId)
    ? parsed.activeProfileId
    : profiles[0].id;
  return {
    enabled: parsed.enabled,
    activeProfileId,
    profiles,
    quickPrompts,
    contextMaxChars: clamp(parsed.contextMaxChars, 1000, 60000),
  };
}

export function activeProfile(settings: AiReadingCompanionSettings): AiModelConfig {
  return settings.profiles.find(profile => profile.id === settings.activeProfileId) ?? settings.profiles[0];
}

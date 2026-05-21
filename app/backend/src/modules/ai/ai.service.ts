import { Injectable, Logger } from '@nestjs/common';
import { LlmClient } from './ai.client';
import { buildSystemPrompt, buildUserMessage, RETRY_SYSTEM_HINT } from './ai.prompt';
import { validateReading, FALLBACK_READING } from './ai.schema';
import { AiInputPayload, AiReading } from './ai.types';
import { scanReadingPayload } from '../../common/forbidden-words';
import {
  QUESTION_SYSTEM_PROMPT,
  QUESTION_RETRY_HINT,
  buildQuestionUserMessage,
  inferYaoImage,
  QuestionPromptInput,
} from './ai.question.prompt';
import { validateQuestion, cleanQuestionOutput } from './question.validator';
import { pickFallbackQuestion, QuestionType } from './question.fallback';

export interface AiServiceOutcome {
  reading: AiReading;
  source: 'llm' | 'llm-retry' | 'fallback';
  rawText?: string;
  errors?: string[];
}

export interface AiQuestionOutcome {
  question: string;
  type: QuestionType;
  source: 'llm' | 'llm-retry-1' | 'llm-retry-2' | 'fallback';
  attempts: number;
  errors?: string[];
}

function readKnobs() {
  return {
    tone: process.env.LLM_TONE || '温和平实，像一位冷静的朋友',
    depth: process.env.LLM_DEPTH || '适中，每条提示 1 到 2 句',
    temperature: Number(process.env.LLM_TEMPERATURE) || 0.7,
    maxTokens: Number(process.env.LLM_MAX_TOKENS) || 1800,
    timeoutMs: Number(process.env.LLM_TIMEOUT_MS) || 20000,
  };
}

export function stripJsonFence(raw: string): string {
  if (!raw) return raw;
  const trimmed = raw.trim();
  // ```json ... ``` 或 ``` ... ```
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenceMatch) return fenceMatch[1].trim();
  return trimmed;
}

export function parseReading(raw: string): { ok: true; value: AiReading } | { ok: false; reason: string } {
  const cleaned = stripJsonFence(raw);
  try {
    const parsed = JSON.parse(cleaned);
    if (!validateReading(parsed)) {
      const msg = (validateReading.errors || []).map((e) => `${e.instancePath} ${e.message}`).join('; ');
      return { ok: false, reason: `schema invalid: ${msg}` };
    }
    return { ok: true, value: parsed as AiReading };
  } catch (err: any) {
    return { ok: false, reason: `JSON parse failed: ${err?.message || String(err)}` };
  }
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  constructor(private readonly llm: LlmClient) {}

  async generateReading(input: AiInputPayload): Promise<AiServiceOutcome> {
    const knobs = readKnobs();
    const systemPrompt = buildSystemPrompt({ tone: knobs.tone, depth: knobs.depth });
    const userMessage = buildUserMessage(input);
    const errors: string[] = [];

    if (!this.llm.isConfigured) {
      this.logger.warn('LLM 未配置，直接返回兜底解读');
      return { reading: FALLBACK_READING, source: 'fallback', errors: ['llm not configured'] };
    }

    // 第一次调用
    const first = await this.llm.call({
      systemPrompt,
      userMessage,
      temperature: knobs.temperature,
      maxTokens: knobs.maxTokens,
      timeoutMs: knobs.timeoutMs,
    });

    const firstOutcome = this.evaluate(first.rawText, first.ok ? undefined : first.error);
    if (firstOutcome.ok) {
      return { reading: firstOutcome.value, source: 'llm', rawText: first.rawText };
    }
    errors.push(`first: ${firstOutcome.reason}`);
    this.logger.warn(`AI 首次输出不合格：${firstOutcome.reason}`);

    // 一次重试
    const retry = await this.llm.call({
      systemPrompt,
      userMessage,
      extraSystem: RETRY_SYSTEM_HINT,
      temperature: knobs.temperature,
      maxTokens: knobs.maxTokens,
      timeoutMs: knobs.timeoutMs,
    });
    const retryOutcome = this.evaluate(retry.rawText, retry.ok ? undefined : retry.error);
    if (retryOutcome.ok) {
      return { reading: retryOutcome.value, source: 'llm-retry', rawText: retry.rawText, errors };
    }
    errors.push(`retry: ${retryOutcome.reason}`);
    this.logger.warn(`AI 重试仍不合格，走兜底：${retryOutcome.reason}`);

    return { reading: FALLBACK_READING, source: 'fallback', rawText: retry.rawText, errors };
  }

  private evaluate(
    rawText: string,
    callError?: string,
  ): { ok: true; value: AiReading } | { ok: false; reason: string } {
    if (callError) return { ok: false, reason: callError };
    if (!rawText) return { ok: false, reason: 'empty response' };
    const parsed = parseReading(rawText);
    if (!parsed.ok) return parsed;
    const scan = scanReadingPayload(parsed.value as unknown as Record<string, unknown>);
    if (!scan.ok) return { ok: false, reason: `forbidden words: ${scan.hits.join(',')}` };
    return parsed;
  }

  /**
   * 生成追问问题 —— 三层保险（PRD section 3.5）：
   *   1) 强约束 prompt
   *   2) 后置校验（长度 / 禁词 / 疑问句）
   *   3) 最多重试 2 次；仍不通过 → fallback 兜底库
   *
   * 注意：单层 prompt 不可靠，兜底是合规要求，不是可选项。
   */
  async generateQuestion(input: QuestionPromptInput): Promise<AiQuestionOutcome> {
    const errors: string[] = [];
    const payload: QuestionPromptInput = {
      ...input,
      yaoImage: input.yaoImage || inferYaoImage(input.benGuaName),
    };

    if (!this.llm.isConfigured) {
      this.logger.warn('LLM 未配置，追问直接走兜底库');
      const fb = pickFallbackQuestion(payload.topic);
      return {
        question: fb.question.text,
        type: fb.type,
        source: 'fallback',
        attempts: 0,
        errors: ['llm not configured'],
      };
    }

    const knobs = {
      // 追问用稍高温度，鼓励多样性
      temperature: Number(process.env.LLM_QUESTION_TEMPERATURE) || 0.85,
      maxTokens: 120,
      timeoutMs: Number(process.env.LLM_TIMEOUT_MS) || 20000,
    };

    const systemPrompt = QUESTION_SYSTEM_PROMPT;
    const userMessage = buildQuestionUserMessage(payload);

    // 单次调用 + 校验，封装成内部函数
    const tryOnce = async (
      attempt: number,
      withRetryHint: boolean,
    ): Promise<{ ok: true; q: string } | { ok: false; reason: string }> => {
      const res = await this.llm.call({
        systemPrompt,
        userMessage,
        extraSystem: withRetryHint ? QUESTION_RETRY_HINT : undefined,
        temperature: knobs.temperature,
        maxTokens: knobs.maxTokens,
        timeoutMs: knobs.timeoutMs,
        responseFormat: 'text',
      });
      if (!res.ok) return { ok: false, reason: `call#${attempt}: ${res.error}` };

      const cleaned = cleanQuestionOutput(res.rawText);
      const v = validateQuestion(cleaned);
      if (!v.ok) {
        return { ok: false, reason: `call#${attempt} validation: ${v.reason}; raw="${cleaned}"` };
      }
      return { ok: true, q: cleaned };
    };

    // 首次
    const first = await tryOnce(1, false);
    if (first.ok) {
      return { question: first.q, type: 'fallback', source: 'llm', attempts: 1 };
      // 注：type 暂时统一标记为 fallback（含义：未来由 AI 自分类后再细化）；
      // 这里保留 source 字段区分来源（llm / fallback）
    }
    errors.push(first.reason);
    this.logger.warn(`追问首次不合格：${first.reason}`);

    // 重试 1
    const retry1 = await tryOnce(2, true);
    if (retry1.ok) {
      return { question: retry1.q, type: 'fallback', source: 'llm-retry-1', attempts: 2, errors };
    }
    errors.push(retry1.reason);
    this.logger.warn(`追问重试1不合格：${retry1.reason}`);

    // 重试 2
    const retry2 = await tryOnce(3, true);
    if (retry2.ok) {
      return { question: retry2.q, type: 'fallback', source: 'llm-retry-2', attempts: 3, errors };
    }
    errors.push(retry2.reason);
    this.logger.warn(`追问重试2仍不合格，走兜底：${retry2.reason}`);

    // 兜底
    const fb = pickFallbackQuestion(payload.topic);
    return {
      question: fb.question.text,
      type: fb.type,
      source: 'fallback',
      attempts: 3,
      errors,
    };
  }
}

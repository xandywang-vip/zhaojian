import { Injectable, Logger } from '@nestjs/common';
import { LlmClient } from './ai.client';
import { buildSystemPrompt, buildUserMessage, RETRY_SYSTEM_HINT } from './ai.prompt';
import { validateReading, FALLBACK_READING } from './ai.schema';
import { AiInputPayload, AiReading } from './ai.types';
import { scanReadingPayload } from '../../common/forbidden-words';
import {
  buildQuestionSystemPrompt,
  buildQuestionUserMessage,
  QUESTION_RETRY_SYSTEM_HINT,
  QuestionInputPayload,
  parseQuestionOutput,
  validateQuestion,
} from './ai.question.prompt';
import { pickFallbackQuestion, QuestionType } from './question.fallback';

/** 中文角度标注 → 英文 QuestionType */
const ANGLE_TO_TYPE: Record<string, QuestionType> = {
  '空间型': 'spatial',
  '动力型': 'dynamic',
  '因果型': 'causal',
};

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
  async generateQuestion(input: QuestionInputPayload): Promise<AiQuestionOutcome> {
    const errors: string[] = [];

    if (!this.llm.isConfigured) {
      this.logger.warn('LLM 未配置，追问直接走兜底库');
      const fb = pickFallbackQuestion(input.topic);
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

    const systemPrompt = buildQuestionSystemPrompt();
    const userMessage = buildQuestionUserMessage(input);

    // 单次调用 + 解析 + 校验
    const tryOnce = async (
      attempt: number,
      withRetryHint: boolean,
    ): Promise<
      | { ok: true; q: string; type: QuestionType | null }
      | { ok: false; reason: string }
    > => {
      const res = await this.llm.call({
        systemPrompt,
        userMessage,
        extraSystem: withRetryHint ? QUESTION_RETRY_SYSTEM_HINT : undefined,
        temperature: knobs.temperature,
        maxTokens: knobs.maxTokens,
        timeoutMs: knobs.timeoutMs,
        responseFormat: 'text',
      });
      if (!res.ok) return { ok: false, reason: `call#${attempt}: ${res.error}` };

      const parsed = parseQuestionOutput(res.rawText);
      if (!parsed) {
        return { ok: false, reason: `call#${attempt}: bad format (expected 2 lines)` };
      }
      const v = validateQuestion(parsed.question);
      if (!v.ok) {
        return {
          ok: false,
          reason: `call#${attempt} validation: ${v.reason}; raw="${parsed.question}"; angle=${parsed.angle}`,
        };
      }
      return { ok: true, q: parsed.question, type: ANGLE_TO_TYPE[parsed.angle] ?? null };
    };

    // 首次
    const first = await tryOnce(1, false);
    if (first.ok) {
      return {
        question: first.q,
        type: first.type ?? 'fallback',
        source: 'llm',
        attempts: 1,
      };
    }
    errors.push(first.reason);
    this.logger.warn(`追问首次不合格：${first.reason}`);

    // 重试 1
    const retry1 = await tryOnce(2, true);
    if (retry1.ok) {
      return {
        question: retry1.q,
        type: retry1.type ?? 'fallback',
        source: 'llm-retry-1',
        attempts: 2,
        errors,
      };
    }
    errors.push(retry1.reason);
    this.logger.warn(`追问重试1不合格：${retry1.reason}`);

    // 重试 2
    const retry2 = await tryOnce(3, true);
    if (retry2.ok) {
      return {
        question: retry2.q,
        type: retry2.type ?? 'fallback',
        source: 'llm-retry-2',
        attempts: 3,
        errors,
      };
    }
    errors.push(retry2.reason);
    this.logger.warn(`追问重试2仍不合格，走兜底：${retry2.reason}`);

    // 兜底
    const fb = pickFallbackQuestion(input.topic);
    return {
      question: fb.question.text,
      type: fb.type,
      source: 'fallback',
      attempts: 3,
      errors,
    };
  }
}

import { Injectable, Logger } from '@nestjs/common';

export interface LlmCallOptions {
  systemPrompt: string;
  userMessage: string;
  extraSystem?: string;
  temperature: number;
  maxTokens: number;
  timeoutMs: number;
  /** 'json' 强制 JSON 对象（解读用）；'text' 普通文本（追问用）。默认 'json'。 */
  responseFormat?: 'json' | 'text';
}

export interface LlmCallResult {
  ok: boolean;
  rawText: string;
  error?: string;
}

@Injectable()
export class LlmClient {
  private readonly logger = new Logger(LlmClient.name);

  get isConfigured(): boolean {
    return Boolean(process.env.LLM_API_KEY && process.env.LLM_API_BASE);
  }

  async call(opts: LlmCallOptions): Promise<LlmCallResult> {
    if (!this.isConfigured) {
      return { ok: false, rawText: '', error: 'LLM not configured (set LLM_API_BASE / LLM_API_KEY)' };
    }

    const base = (process.env.LLM_API_BASE || '').replace(/\/+$/, '');
    const url = `${base}/v1/chat/completions`;
    const model = process.env.LLM_MODEL || 'deepseek-chat';

    const messages: Array<{ role: 'system' | 'user'; content: string }> = [
      { role: 'system', content: opts.systemPrompt },
    ];
    if (opts.extraSystem) {
      messages.push({ role: 'system', content: opts.extraSystem });
    }
    messages.push({ role: 'user', content: opts.userMessage });

    const wantText = opts.responseFormat === 'text';
    const body: Record<string, unknown> = {
      model,
      messages,
      temperature: opts.temperature,
      max_tokens: opts.maxTokens,
    };
    if (!wantText) {
      body.response_format = { type: 'json_object' as const };
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), opts.timeoutMs);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.LLM_API_KEY}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        return { ok: false, rawText: '', error: `HTTP ${res.status}: ${text.slice(0, 200)}` };
      }
      const data: any = await res.json();
      const content: string = data?.choices?.[0]?.message?.content ?? '';
      return { ok: true, rawText: content };
    } catch (err: any) {
      const message = err?.name === 'AbortError' ? 'timeout' : err?.message || String(err);
      this.logger.warn(`LLM call failed: ${message}`);
      return { ok: false, rawText: '', error: message };
    } finally {
      clearTimeout(timer);
    }
  }
}

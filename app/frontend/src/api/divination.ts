import type { CastBody, PublicDivination, WallCard, WallFullCard, WallListResponse } from './types';

// ── 匿名设备 ID（localStorage 持久化，跨 session 稳定）────────────────────────
const DEVICE_ID_KEY = 'yijian_device_id';
function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-Device-ID':  getDeviceId(),
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    let message = `请求失败 ${res.status}`;
    try {
      const parsed = JSON.parse(text);
      if (parsed?.message) message = String(parsed.message);
    } catch {
      if (text) message = text.slice(0, 160);
    }
    throw new Error(message);
  }
  return (await res.json()) as T;
}

export function castDivination(body: CastBody): Promise<PublicDivination> {
  return request<PublicDivination>('/divination/cast', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function getDivination(id: string): Promise<PublicDivination> {
  return request<PublicDivination>(`/divination/${id}`);
}

export function listHistory(): Promise<PublicDivination[]> {
  return request<PublicDivination[]>('/divination/history');
}

export function sendFeedback(id: string, value: 'up' | 'down'): Promise<PublicDivination> {
  return request<PublicDivination>(`/divination/${id}/feedback`, {
    method: 'POST',
    body: JSON.stringify({ value }),
  });
}

export function checkCrisis(text: string): Promise<{ risk: boolean }> {
  return request<{ risk: boolean }>('/divination/crisis-check', {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
}

/** 生成（或获取已有的）追问问题。返回更新后的记录。 */
export function generateQuestion(id: string): Promise<PublicDivination> {
  return request<PublicDivination>(`/divination/${id}/question`, {
    method: 'POST',
  });
}

export class CrisisDetectedError extends Error {
  constructor() {
    super('crisis-detected');
    this.name = 'CrisisDetectedError';
  }
}

/**
 * 保存用户回答。
 * 服务端命中危机词时返回 400 + { crisis: true } —— 这里转成 CrisisDetectedError 抛出。
 * answer 为空字符串/null 表示跳过，会原样落库为 null。
 */
/** 把解读收进心境墙（isSaved = true）。独立于关怀语。 */
export function saveToWall(id: string): Promise<PublicDivination> {
  return request<PublicDivination>(`/divination/${id}/save`, { method: 'POST' });
}

/** 保存可选关怀语（一句话）。独立于 isSaved。 */
export function saveCareNote(id: string, careNote: string): Promise<PublicDivination> {
  return request<PublicDivination>(`/divination/${id}/care-note`, {
    method: 'POST',
    body: JSON.stringify({ careNote }),
  });
}

// ── 心境墙 API ────────────────────────────────────────────────────────────

export function listWall(params?: { topic?: string; before?: string; after?: string; limit?: number }): Promise<WallListResponse> {
  const q = new URLSearchParams();
  if (params?.topic)  q.set('topic',  params.topic);
  if (params?.before) q.set('before', params.before);
  if (params?.after)  q.set('after',  params.after);
  if (params?.limit)  q.set('limit',  String(params.limit));
  const qs = q.toString();
  return request<WallListResponse>(`/wall${qs ? '?' + qs : ''}`);
}

export function getWallCard(id: string): Promise<WallFullCard> {
  return request<WallFullCard>(`/wall/${id}`);
}

export function deleteWallCard(id: string): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>(`/wall/${id}`, { method: 'DELETE' });
}

export async function saveAnswer(
  id: string,
  answer: string | null,
): Promise<PublicDivination> {
  const res = await fetch(`/api/divination/${id}/answer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ answer: answer ?? '' }),
  });
  if (res.status === 400) {
    const body = await res.json().catch(() => ({}));
    const inner = body?.message;
    if (inner && typeof inner === 'object' && inner.crisis) {
      throw new CrisisDetectedError();
    }
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text.slice(0, 160) || `请求失败 ${res.status}`);
  }
  return (await res.json()) as PublicDivination;
}

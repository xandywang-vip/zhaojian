import Ajv from 'ajv';
import type { AiReading } from './ai.types';

export const READING_SCHEMA = {
  type: 'object',
  required: ['present', 'pivot', 'tryThis', 'oneLine'],
  additionalProperties: false,
  properties: {
    present: { type: 'string', minLength: 20, maxLength: 300 },
    pivot:   { type: 'string', minLength: 20, maxLength: 250 },
    tryThis: { type: 'string', minLength: 15, maxLength: 200 },
    oneLine: { type: 'string', minLength: 8,  maxLength: 80  },
  },
} as const;

const ajv = new Ajv({ allErrors: false, strict: false });
export const validateReading = ajv.compile(READING_SCHEMA);

export const FALLBACK_READING: AiReading = {
  present:
    '有时候，我们会反复想同一个问题，希望找到一个清晰的答案。这种状态并不奇怪——它说明你在认真对待自己的内心。',
  pivot:
    '变化不一定来自你想清楚那个问题，而是你愿意暂时停在"还不知道"里，让心慢下来一点。',
  tryThis:
    '今天，找一个安静的角落，深呼吸三次，把"我此刻有点累"轻轻说给自己听一遍。',
  oneLine: '你不是在等答案，你是在等自己准备好。',
};

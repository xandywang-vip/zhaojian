import assert from 'node:assert/strict';
import { scanForbidden, scanReadingPayload } from '../src/common/forbidden-words';
import { parseReading, stripJsonFence } from '../src/modules/ai/ai.service';
import { FALLBACK_READING, validateReading } from '../src/modules/ai/ai.schema';

const tests: { name: string; fn: () => void }[] = [];
const test = (name: string, fn: () => void) => tests.push({ name, fn });

test('禁词扫描：命中"大凶""破财"', () => {
  const r = scanForbidden('卦象大凶，恐有破财之事');
  assert.equal(r.ok, false);
  assert.ok(r.hits.includes('大凶'));
  assert.ok(r.hits.includes('破财'));
});

test('禁词扫描：中性表达不命中', () => {
  const r = scanForbidden('卦象提示此刻阻力较大，不妨先观察一段时间');
  assert.equal(r.ok, true);
});

test('scanReadingPayload 检测多字段', () => {
  const r = scanReadingPayload({
    imagery: '一切顺遂',
    hints: ['卦象提示，注定会成功'],
    reflections: ['想想看你怎么打算'],
    direction: '一定会有好结果',
    bianHint: '后续值得留意',
  });
  assert.equal(r.ok, false);
  assert.ok(r.hits.includes('注定'));
  assert.ok(r.hits.includes('一定会'));
});

test('stripJsonFence 剥离 ```json ``` 包裹', () => {
  const raw = '```json\n{"a":1}\n```';
  assert.equal(stripJsonFence(raw), '{"a":1}');
});

test('parseReading：合法 JSON 通过 Schema', () => {
  const raw = JSON.stringify(FALLBACK_READING);
  const r = parseReading(raw);
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.value.hints.length, 3);
  }
});

test('parseReading：缺字段不通过', () => {
  const raw = JSON.stringify({ imagery: '一段意象', hints: ['提示一', '提示二', '提示三'] });
  const r = parseReading(raw);
  assert.equal(r.ok, false);
});

test('FALLBACK_READING 自身合规且通过 Schema', () => {
  assert.equal(validateReading(FALLBACK_READING), true);
  assert.equal(scanReadingPayload(FALLBACK_READING).ok, true);
});

(async () => {
  let pass = 0;
  let fail = 0;
  for (const t of tests) {
    try {
      t.fn();
      console.log(`  ✓ ${t.name}`);
      pass++;
    } catch (err) {
      console.error(`  ✗ ${t.name}`);
      console.error(err instanceof Error ? err.stack : err);
      fail++;
    }
  }
  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
})();

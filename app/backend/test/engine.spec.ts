import assert from 'node:assert/strict';
import {
  castByNumbers,
  expandCore,
  computeHuGua,
  computeBianGua,
  buildHexagramFromTrigrams,
  hexagramByTrigrams,
  loadAllRecords,
  cast,
} from '../src/engine';

type TestCase = { name: string; fn: () => void };

const tests: TestCase[] = [];
function test(name: string, fn: () => void) {
  tests.push({ name, fn });
}

test('八卦先天数与爻象对应', () => {
  const qian = buildHexagramFromTrigrams('乾', '乾');
  assert.equal(qian.name, '乾为天');
  assert.deepEqual(qian.yao, [1, 1, 1, 1, 1, 1]);

  const kun = buildHexagramFromTrigrams('坤', '坤');
  assert.equal(kun.name, '坤为地');
  assert.deepEqual(kun.yao, [0, 0, 0, 0, 0, 0]);
});

test('三数起卦：PRD 4.2 示例 a=15,b=8,c=23 → 上艮(7) 下坤(8) 动爻4', () => {
  const core = castByNumbers(15, 8, 23);
  assert.equal(core.upperNumber, 7, 'upperNumber should be 7 (艮)');
  assert.equal(core.lowerNumber, 8, 'lowerNumber should be 8 (坤)');
  assert.equal(core.dongYao, 4, 'dongYao should be 4');
});

test('三数起卦：完整展开 (上艮 下坤) → 本卦山地剥, 变卦火地晋, 互卦坤为地', () => {
  const core = castByNumbers(15, 8, 23);
  const { benGua, bianGua, huGua } = expandCore(core);
  assert.equal(benGua.name, '山地剥');
  assert.deepEqual(benGua.yao, [0, 0, 0, 0, 0, 1]);
  assert.equal(bianGua.name, '火地晋');
  assert.deepEqual(bianGua.yao, [0, 0, 0, 1, 0, 1]);
  assert.equal(huGua.name, '坤为地');
});

test('动爻翻转：本卦乾为天，动爻1 → 变卦天风姤', () => {
  const ben = buildHexagramFromTrigrams('乾', '乾');
  const bian = computeBianGua(ben.yao, 1);
  assert.equal(bian.name, '天风姤');
});

test('互卦：本卦水山蹇 → 互卦火水未济', () => {
  // 水山蹇: 坎上艮下, yao = [0,0,1,0,1,0]
  const ben = buildHexagramFromTrigrams('坎', '艮');
  assert.deepEqual(ben.yao, [0, 0, 1, 0, 1, 0]);
  const hu = computeHuGua(ben.yao);
  // 下互(2,3,4)=[0,1,0]=坎  上互(3,4,5)=[1,0,1]=离  → 离上坎下 = 火水未济
  assert.equal(hu.name, '火水未济');
});

test('hexagramByTrigrams：全部 64 卦组合都能找到', () => {
  const trigrams = ['乾', '兑', '离', '震', '巽', '坎', '艮', '坤'] as const;
  let count = 0;
  for (const u of trigrams) {
    for (const l of trigrams) {
      const h = hexagramByTrigrams(u, l);
      assert.ok(h && h.id >= 1 && h.id <= 64);
      count++;
    }
  }
  assert.equal(count, 64);
});

test('gua-data.json 完整覆盖 1..64，每卦 6 条爻辞', () => {
  const all = loadAllRecords();
  assert.equal(all.size, 64);
  for (let id = 1; id <= 64; id++) {
    const rec = all.get(id)!;
    assert.ok(rec, `record id=${id} missing`);
    assert.ok(rec.guaCi && rec.guaCi.length > 0, `guaCi empty for id=${id}`);
    assert.equal(rec.yaoCi.length, 6, `yaoCi count != 6 for id=${id}`);
    assert.ok(rec.imageText && rec.imageText.length > 0, `imageText empty for id=${id}`);
    assert.ok(Array.isArray(rec.keywords) && rec.keywords.length > 0, `keywords empty for id=${id}`);
  }
});

test('cast() with method=number 返回完整卦象对象', () => {
  const res = cast({ method: 'number', numbers: [15, 8, 23] });
  assert.equal(res.method, 'number');
  assert.deepEqual(res.input.numbers, [15, 8, 23]);
  assert.equal(res.dongYao, 4);
  assert.equal(res.benGua.name, '山地剥');
  assert.equal(res.benGua.guaCi.length > 0, true);
  assert.equal(res.bianGua.name, '火地晋');
  assert.equal(res.huGua.name, '坤为地');
});

test('cast() with method=time 也能产出合法卦象', () => {
  const res = cast({ method: 'time', datetime: '2026-05-18T10:30:00+08:00' });
  assert.equal(res.method, 'time');
  assert.ok(res.benGua.id >= 1 && res.benGua.id <= 64);
  assert.ok(res.bianGua.id >= 1 && res.bianGua.id <= 64);
  assert.ok(res.huGua.id >= 1 && res.huGua.id <= 64);
  assert.ok(res.dongYao >= 1 && res.dongYao <= 6);
});

test('castByNumbers 输入校验：负数与非整数拒绝', () => {
  assert.throws(() => castByNumbers(-1, 2, 3));
  assert.throws(() => castByNumbers(1.5, 2, 3));
  assert.throws(() => castByNumbers(0, 0, 0));
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

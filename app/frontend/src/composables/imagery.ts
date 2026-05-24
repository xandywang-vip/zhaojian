/**
 * 八卦意象 SVG 常量 + 取值函数
 * 每个意象都是 100×100 viewBox 内的简化几何图形，不写实、不复杂。
 */

export const TRIGRAM_IMAGERY = {
  // 乾·天 —— 三条水平横线，象征"天行"
  heaven: `
    <path d="M 15 30 L 85 30" stroke="#7A8BAE" stroke-width="3" stroke-linecap="round" fill="none"/>
    <path d="M 20 50 L 80 50" stroke="#7A8BAE" stroke-width="3" stroke-linecap="round" fill="none"/>
    <path d="M 25 70 L 75 70" stroke="#7A8BAE" stroke-width="3" stroke-linecap="round" fill="none"/>
  `,
  // 坤·地 —— 大地横铺，承载
  earth: `
    <path d="M 0 70 L 100 70 L 100 100 L 0 100 Z" fill="#A89072"/>
    <path d="M 0 80 L 100 80 L 100 100 L 0 100 Z" fill="#8B7355"/>
  `,
  // 坎·水 —— 流动的水波
  water: `
    <path d="M 0 65 Q 20 55 40 65 T 80 65 Q 95 65 100 65 L 100 100 L 0 100 Z" fill="#5C7A8F"/>
    <path d="M 0 78 Q 25 70 50 78 T 100 78 L 100 100 L 0 100 Z" fill="#4A6577"/>
  `,
  // 离·火 —— 火焰意象，菱形对称
  fire: `
    <path d="M 50 20 L 70 50 L 50 80 L 30 50 Z" fill="#D85A30"/>
    <path d="M 50 35 L 60 50 L 50 65 L 40 50 Z" fill="#B84A20"/>
  `,
  // 震·雷 —— 错落的山形，象征震动
  thunder: `
    <path d="M 20 90 L 35 50 L 50 70 L 65 35 L 80 65 L 90 50 L 90 100 L 20 100 Z" fill="#8B7355"/>
    <path d="M 30 90 L 45 60 L 60 75 L 75 50 L 90 70 L 90 100 L 30 100 Z" fill="#6B5640"/>
  `,
  // 巽·风 —— 弧形飘动的曲线
  wind: `
    <path d="M 10 40 Q 30 35 50 45 T 90 50" stroke="#9BAE94" stroke-width="3" stroke-linecap="round" fill="none"/>
    <path d="M 10 55 Q 30 50 50 60 T 90 65" stroke="#9BAE94" stroke-width="3" stroke-linecap="round" fill="none"/>
    <path d="M 15 70 Q 35 65 55 75 T 90 80" stroke="#9BAE94" stroke-width="3" stroke-linecap="round" fill="none"/>
  `,
  // 艮·山 —— 山的轮廓
  mountain: `
    <path d="M 5 90 L 30 50 L 50 70 L 70 40 L 95 90 L 5 90 Z" fill="#7A6B5C"/>
    <path d="M 15 90 L 40 60 L 55 75 L 75 50 L 90 90 L 15 90 Z" fill="#5C5046"/>
  `,
  // 兑·泽 —— 平静的水面，比坎更柔
  lake: `
    <ellipse cx="50" cy="75" rx="48" ry="15" fill="#7A9DAD"/>
    <ellipse cx="50" cy="72" rx="42" ry="10" fill="#5C8294"/>
    <path d="M 25 70 Q 35 68 45 70" stroke="#FFFCF6" stroke-width="1" fill="none"/>
    <path d="M 55 73 Q 65 71 75 73" stroke="#FFFCF6" stroke-width="1" fill="none"/>
  `,
} as const;

export type TrigramKey = keyof typeof TRIGRAM_IMAGERY;

/**
 * 从 primaryImageryKey（如 "water+mountain"）取上卦作为主意象。
 * 只取上卦（第一个），不做复合叠加。
 */
export function getMainImagery(key: string | null): TrigramKey {
  if (!key) return 'heaven';
  const upper = key.split('+')[0] as TrigramKey;
  return TRIGRAM_IMAGERY[upper] ? upper : 'heaven';
}

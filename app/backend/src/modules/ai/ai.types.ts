export interface AiReading {
  present: string;
  pivot:   string;
  tryThis: string;
  oneLine: string;
}

export interface AiInputPayload {
  topic:       string;
  benGuaName:  string;   // canonical name, e.g. "乾", "蛊", "明夷"
  dongYao:     number;   // 1-6
  yaoPosName:  string;   // 初/二/三/四/五/上
  bianGuaName: string;
  dongYaoCi?:  string;   // 动爻爻辞原文，供 AI 判断凶/厉/吝
}

/**
 * 追问生成所需的解读上下文。
 * 追问必须读取 reframe（一个转念），以保证追问方向与转念一致。
 * reframe 对应 AiReading.pivot。
 */
export interface ReadingContext {
  present: string;   // 此刻
  reframe: string;   // 一个转念 ← 追问必读，对应 AiReading.pivot
  tryThis: string;   // 可以试试
  oneLine: string;   // 金句
}

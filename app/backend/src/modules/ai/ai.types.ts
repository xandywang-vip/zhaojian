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

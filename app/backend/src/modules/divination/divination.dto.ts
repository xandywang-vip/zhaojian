import { IsIn, IsString } from 'class-validator';

export const TOPICS = [
  '工作与压力',
  '关系与情感',
  '自我与成长',
  '选择与犹豫',
  '失落与疗愈',
  '焦虑与平静',
] as const;

export type Topic = typeof TOPICS[number];

export class CastDto {
  @IsString()
  @IsIn(TOPICS as unknown as string[])
  topic!: Topic;
}

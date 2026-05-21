import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { LlmClient } from './ai.client';

@Module({
  providers: [LlmClient, AiService],
  exports: [AiService],
})
export class AiModule {}

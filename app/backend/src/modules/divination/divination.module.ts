import { Module } from '@nestjs/common';
import { DivinationController } from './divination.controller';
import { DivinationService } from './divination.service';
import { DivinationStore } from '../../common/store';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [AiModule],
  controllers: [DivinationController],
  providers: [DivinationService, DivinationStore],
})
export class DivinationModule {}

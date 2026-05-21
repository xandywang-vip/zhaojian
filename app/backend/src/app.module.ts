import { Module } from '@nestjs/common';
import { DivinationModule } from './modules/divination/divination.module';
import { AiModule } from './modules/ai/ai.module';

@Module({
  imports: [DivinationModule, AiModule],
})
export class AppModule {}

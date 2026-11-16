import { Module } from '@nestjs/common';
import { RamadanController } from './ramadan.controller';
import { RamadanService } from './ramadan.service';

@Module({
  controllers: [RamadanController],
  providers: [RamadanService],
})
export class RamadanModule {}

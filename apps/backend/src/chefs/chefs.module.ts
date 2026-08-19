import { Module } from '@nestjs/common';
import { ChefsController } from './chefs.controller';
import { ChefsService } from './chefs.service';

@Module({
  controllers: [ChefsController],
  providers: [ChefsService],
})
export class ChefsModule {}

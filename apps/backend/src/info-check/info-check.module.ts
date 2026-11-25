import { Module } from '@nestjs/common';
import { PushModule } from '../push/push.module';
import { InfoCheckController } from './info-check.controller';
import { InfoCheckService } from './info-check.service';

@Module({
  imports: [PushModule],
  controllers: [InfoCheckController],
  providers: [InfoCheckService],
})
export class InfoCheckModule {}

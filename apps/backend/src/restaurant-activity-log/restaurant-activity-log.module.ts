import { Global, Module } from '@nestjs/common';
import { RestaurantActivityLogService } from './restaurant-activity-log.service';

// @Global() so every feature module can inject RestaurantActivityLogService
// directly without importing this module everywhere - same pattern as
// PrismaModule (prisma/prisma.module.ts), registered once in AppModule.
@Global()
@Module({
  providers: [RestaurantActivityLogService],
  exports: [RestaurantActivityLogService],
})
export class RestaurantActivityLogModule {}

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { MasterDataModule } from './master-data/master-data.module';
import { RestaurantsModule } from './restaurants/restaurants.module';
import { AuthModule } from './auth/auth.module';
import { UploadsModule } from './uploads/uploads.module';
import { StoriesModule } from './stories/stories.module';
import { DishesModule } from './dishes/dishes.module';
import { GalleryModule } from './gallery/gallery.module';
import { ReviewsModule } from './reviews/reviews.module';
import { AdminUsersModule } from './admin-users/admin-users.module';
import { StatsModule } from './stats/stats.module';
import { StaffModule } from './staff/staff.module';
import { EventsModule } from './events/events.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    MasterDataModule,
    RestaurantsModule,
    UploadsModule,
    StoriesModule,
    DishesModule,
    GalleryModule,
    ReviewsModule,
    AdminUsersModule,
    StatsModule,
    StaffModule,
    EventsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

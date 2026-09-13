import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { SentryModule, SentryGlobalFilter } from '@sentry/nestjs/setup';
import { AppController } from './app.controller';
import { LegalController } from './legal/legal.controller';
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
import { ChefsModule } from './chefs/chefs.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PromotionsModule } from './promotions/promotions.module';
import { FeaturedModule } from './featured/featured.module';
import { LoyaltyModule } from './loyalty/loyalty.module';
import { FeatureFlagsModule } from './feature-flags/feature-flags.module';
import { AnalyticsModule } from './analytics/analytics.module';

@Module({
  imports: [
    SentryModule.forRoot(),
    ConfigModule.forRoot({ isGlobal: true }),
    // App-wide default; individual routes (e.g. the public reservation
    // endpoint) can tighten this further with @Throttle().
    ThrottlerModule.forRoot({ throttlers: [{ ttl: 60_000, limit: 100 }] }),
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
    ChefsModule,
    NotificationsModule,
    PromotionsModule,
    FeaturedModule,
    LoyaltyModule,
    FeatureFlagsModule,
    AnalyticsModule,
  ],
  controllers: [AppController, LegalController],
  providers: [
    // Must come before any other exception filter (none currently exist).
    { provide: APP_FILTER, useClass: SentryGlobalFilter },
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}

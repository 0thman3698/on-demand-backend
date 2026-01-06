import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProvidersModule } from './providers/providers.module';
import { BookingsModule } from './bookings/bookings.module';
import { PaymentsModule } from './payments/payments.module';
import { RealtimeModule } from './realtime/realtime.module';
import { ReviewsModule } from './reviews/reviews.module';
import { AdminModule } from './admin/admin.module';
import { CategoriesModule } from './categories/categories.module';
import { ServicesModule } from './services/services.module';
import { SentryModule } from '@sentry/nestjs/setup';
import { APP_FILTER } from '@nestjs/core';
import { SentryGlobalFilter } from '@sentry/nestjs/setup';
import { ConfigModule } from '@nestjs/config';
import { configOptions } from './config/env.config';

@Module({
  imports: [
    ConfigModule.forRoot(configOptions),
    MongooseModule.forRoot(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/on-demand-service',
    ),
    SentryModule.forRoot(),
    AuthModule,
    UsersModule,
    ProvidersModule,
    BookingsModule,
    PaymentsModule,
    RealtimeModule,
    ReviewsModule,
    AdminModule,
    CategoriesModule,
    ServicesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useClass: SentryGlobalFilter,
    },
  ],
})
export class AppModule {}

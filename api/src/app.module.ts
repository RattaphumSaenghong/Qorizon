import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { validateEnv } from './config/env';
import { PrismaModule } from './prisma/prisma.module';
import { StorageModule } from './storage/storage.module';
import { AuthzModule } from './authz/authz.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { TripsModule } from './modules/trips/trips.module';
import { StopsModule } from './modules/stops/stops.module';
import { AlbumsModule } from './modules/albums/albums.module';
import { LiveModule } from './modules/live/live.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { MediaModule } from './modules/media/media.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { SavedModule } from './modules/saved/saved.module';
import { CommentsModule } from './modules/comments/comments.module';
import { MembersModule } from './modules/members/members.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    PrismaModule,
    StorageModule,
    AuthzModule,
    AuthModule,
    UsersModule,
    TripsModule,
    StopsModule,
    AlbumsModule,
    LiveModule,
    NotificationsModule,
    MediaModule,
    BookingsModule,
    SavedModule,
    CommentsModule,
    MembersModule,
  ],
  providers: [
    // JWT auth is the default for every route; @Public() opts out.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}

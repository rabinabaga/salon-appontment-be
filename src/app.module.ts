import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { Prisma } from '@prisma/client';
import { MailModule } from './modules/mail/mail.module';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { appConfigs } from './config/app.config';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { ServicesModule } from './modules/services/services.module';
import { BullModule } from '@nestjs/bullmq';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { SettingsModule } from './modules/settings/settings.module';

@Module({
  imports: [ServicesModule,ConfigModule.forRoot(appConfigs),BullModule.forRoot({
  connection: {
    host: 'localhost',
    port: 6379,
  },
}), AuthModule, PrismaModule, MailModule, AppointmentsModule, NotificationsModule, SettingsModule
],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

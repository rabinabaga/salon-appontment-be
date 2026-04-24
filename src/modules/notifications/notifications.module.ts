import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { MailModule } from '../mail/mail.module';
import { AppointmentNotificationProcessor } from './appointment-notification.processor';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'appointment-notifications' }),
    MailModule,
  ],
  providers: [NotificationsService, AppointmentNotificationProcessor],
  controllers: [NotificationsController],
  exports: [NotificationsService],
})
export class NotificationsModule {}
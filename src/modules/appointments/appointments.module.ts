import { Module } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { AppointmentsController } from './appointments.controller';
import { BullModule } from '@nestjs/bullmq';
import { ServicesModule } from '../services/services.module';
import { AppointmentsGateway } from './appointment.gateway';

@Module({
  imports: [BullModule.registerQueue({ name: 'appointment-notifications' }),ServicesModule,
],
  controllers: [AppointmentsController],
  providers: [AppointmentsService, AppointmentsGateway],
})
export class AppointmentsModule {}

import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { User, UserRole, AppointmentStatus } from '@prisma/client';
import { CreateAppointmentDto } from './dtos/appointment.dto';
import { UpdateAppointmentDto } from './dtos/appointment.dto';
import { GetAvailableSlotsDto } from './dtos/appointment.dto';
import { ServicesService } from '../services/services.service';
import { TimeSlotUtil } from '../../common/utils/time-slot.util';
import { PrismaService } from 'src/prisma/prisma.service';
import { AppointmentsGateway } from './appointment.gateway';

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('appointment-notifications')
    private readonly notificationQueue: Queue,
    private readonly gateway: AppointmentsGateway,

    private readonly servicesService: ServicesService,
  ) {}

  /** Fetch all booked ranges for a date and service(excludes CANCELLED) */
private async getBookedRangesForDate(date: Date, serviceId: string, excludeId?: string) {
  const appointments = await this.prisma.appointment.findMany({
    where: {
      date,
      serviceId,                                          // ← add this
      status: { not: AppointmentStatus.CANCELLED },
      ...(excludeId && { id: { not: excludeId } }),
    },
    select: {
      startTime: true,
      endTime: true,
    },
  });

return appointments.map((a) => ({
  startTime: `${String(a.startTime.getUTCHours()).padStart(2, '0')}:${String(a.startTime.getUTCMinutes()).padStart(2, '0')}`,
  endTime: `${String(a.endTime.getUTCHours()).padStart(2, '0')}:${String(a.endTime.getUTCMinutes()).padStart(2, '0')}`,
}));
}

  async getAvailableSlots(dto: GetAvailableSlotsDto): Promise<string[]> {
    const service = await this.servicesService.findOne(dto.serviceId);
    const bookedRanges = await this.getBookedRangesForDate(new Date(dto.date), service.id);
    
    return TimeSlotUtil.getAvailableSlots(service.duration, bookedRanges);
  }

  /** Recompute and broadcast fresh available slots */
  private async broadcastSlots(serviceId: string, date: string): Promise<void> {
    try {
      const service = await this.servicesService.findOne(serviceId);
      const bookedRanges = await this.getBookedRangesForDate(new Date(date), service.id);
      const slots = TimeSlotUtil.getAvailableSlots(service.duration, bookedRanges);
      this.gateway.broadcastSlotsUpdate(serviceId, date, slots);
    } catch {
      // silent fail — broadcast errors must never break HTTP response
    }
  }

  async findOne(id: string, user: User) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: {
        service: true,
        user: true,
      },
    });

    if (!appointment) throw new NotFoundException('Appointment not found');

    if (user.role === UserRole.CUSTOMER && appointment.userId !== user.id) {
      throw new ForbiddenException('Access denied');
    }

    return appointment;
  }

  async findAll(user: User) {
    return this.prisma.appointment.findMany({
      where: user.role === UserRole.CUSTOMER
        ? { userId: user.id }
        : {},
      include: {
        service: true,
        user: true,
      },
      orderBy: [
        { date: 'desc' },
        { startTime: 'asc' },
      ],
    });
  }

  async create(dto: CreateAppointmentDto, user: User) {
    const service = await this.servicesService.findOne(dto.serviceId);

    if (!service.isActive) {
      throw new BadRequestException('This service is currently unavailable');
    }

    const bookedRanges = await this.getBookedRangesForDate(new Date(dto.date), service.id);

    const error = TimeSlotUtil.validateSlot(
      dto.startTime,
      service.duration,
      bookedRanges,
    );
    if (error) throw new BadRequestException(error);

    const endTime = TimeSlotUtil.calcEndTime(dto.startTime, service.duration);
    const endTimeInUTC = new Date(`1970-01-01T${endTime}:00Z`);
    const startTimeInUTC = new Date(`1970-01-01T${dto.startTime}:00Z`);
    const saved = await this.prisma.appointment.create({
      data: {
        userId: user.id,
        serviceId: service.id,
        date: new Date(dto.date),
        startTime: startTimeInUTC,
        endTime: endTimeInUTC,
        duration: service.duration, // snapshot
        status: AppointmentStatus.PENDING,
      },
      include: {
        service: true,
        user: true,
      },
    });

    await this.broadcastSlots(service.id, dto.date);

    return saved;
  }

  // async update(id: string, dto: UpdateAppointmentDto, user: User) {
  //    if (!dto.date) return [];
  //   const appointment = await this.findOne(id, user);
  //   const dateObjFromDto =  new Date(dto.date);
  //   if (appointment.status !== AppointmentStatus.PENDING) {
  //     throw new BadRequestException('Only PENDING appointments can be updated.');
  //   }

  //   const oldDate = appointment.date;
  //   const newDate = dateObjFromDto ?? appointment.date;
  //   const newStartTime = dto.startTime ?? appointment.startTime;

  //   let newEndTime = appointment.endTime;

  //   if (dto.date || dto.startTime) {
  //     const bookedRanges = await this.getBookedRangesForDate(newDate, id);

  //     const error = TimeSlotUtil.validateSlot(
  //       newStartTime,
  //       appointment.duration,
  //       bookedRanges,
  //     );
  //     if (error) throw new BadRequestException(error);

  //     newEndTime = TimeSlotUtil.calcEndTime(newStartTime, appointment.duration);
  //   }

  //   const saved = await this.prisma.appointment.update({
  //     where: { id },
  //     data: {
  //       date: newDate,
  //       startTime: newStartTime,
  //       endTime: newEndTime,
  //       ...(dto.notes !== undefined && { notes: dto.notes }),
  //     },
  //     include: {
  //       service: true,
  //       user: true,
  //     },
  //   });

  //   await this.broadcastSlots(appointment.serviceId, oldDate);
  //   if (dateObjFromDto && dateObjFromDto !== oldDate) {
  //     await this.broadcastSlots(appointment.serviceId, dateObjFromDto);
  //   }

  //   return saved;
  // }

  async confirm(id: string, user: User) {
    if (user.role !== UserRole.STAFF) {
      throw new ForbiddenException('Only staff can confirm appointments');
    }

    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: { service: true, user: true },
    });

    if (!appointment) throw new NotFoundException('Appointment not found');

    if (appointment.status !== AppointmentStatus.PENDING) {
      throw new BadRequestException('Only PENDING appointments can be confirmed');
    }

    const saved = await this.prisma.appointment.update({
      where: { id },
      data: {
        status: AppointmentStatus.CONFIRMED,
        confirmedAt: new Date(),
      },
      include: { service: true, user: true },
    });

    await this.notificationQueue.add('send-confirmation', {
      appointmentId: saved.id,
      customerEmail: appointment.user.email,
      customerName: appointment.user.name,
      serviceName: appointment.service.name,
      date: appointment.date,
      startTime: appointment.startTime,
      endTime: appointment.endTime,
    });

    await this.broadcastSlots(appointment.serviceId, appointment.date.toISOString().slice(0, 10));

    return saved;
  }

  async cancel(id: string, user: User) {
    const appointment = await this.findOne(id, user);

    if (appointment.status === AppointmentStatus.CANCELLED) {
      throw new BadRequestException('Appointment is already cancelled');
    }

    if (user.role === UserRole.CUSTOMER && appointment.userId !== user.id) {
      throw new ForbiddenException('Access denied');
    }

    const saved = await this.prisma.appointment.update({
      where: { id },
      data: { status: AppointmentStatus.CANCELLED },
      include: { service: true, user: true },
    });

    await this.broadcastSlots(appointment.serviceId, appointment.date.toISOString().slice(0, 10));

    return saved;
  }
}
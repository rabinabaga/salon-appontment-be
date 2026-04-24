import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto, GetAvailableSlotsDto, UpdateAppointmentDto } from './dtos/appointment.dto';


import { CurrentUser } from 'src/common/decorators/current.user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { JwtAuthGuard } from 'src/common/guards/jwt.auth.guard';
import { UserRole, type User } from '@prisma/client';

@ApiTags('Appointments')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Get('available-slots')
  @ApiOperation({ summary: 'Get available time slots for a service on a date' })
  getAvailableSlots(@Query() dtos: GetAvailableSlotsDto) {
    return this.appointmentsService.getAvailableSlots(dtos);
  }

  @Post()
  @ApiOperation({ summary: 'Book a new appointment' })
  create(@Body() dto: CreateAppointmentDto, @CurrentUser() user: User) {
    return this.appointmentsService.create(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'List appointments (staff sees all, customer sees own)' })
  findAll(@CurrentUser() user: User) {
    return this.appointmentsService.findAll(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get appointment by ID' })
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.appointmentsService.findOne(id, user);
  }

  // @Patch(':id')
  // @ApiOperation({ summary: 'Update a PENDING appointment' })
  // update(
  //   @Param('id') id: string,
  //   @Body() dtos: UpdateAppointmentDto,
  //   @CurrentUser() user: User,
  // ) {
  //   return this.appointmentsService.update(id, dtos, user);
  // }

  @Patch(':id/confirm')
  @Roles(UserRole.STAFF)
  @ApiOperation({ summary: '[Staff] Confirm an appointment and send email' })
  confirm(@Param('id') id: string, @CurrentUser() user: User) {
    return this.appointmentsService.confirm(id, user);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel an appointment' })
  cancel(@Param('id') id: string, @CurrentUser() user: User) {
    return this.appointmentsService.cancel(id, user);
  }
}
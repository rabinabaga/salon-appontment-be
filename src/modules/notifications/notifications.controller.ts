import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from 'src/common/guards/jwt.auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';


@ApiTags('Notifications')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('notifications/templates')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}
  @Get()
  @ApiOperation({ summary: 'List all notification templates' })
  findAll() {
    
    return this.notificationsService.findAll();
  }
}
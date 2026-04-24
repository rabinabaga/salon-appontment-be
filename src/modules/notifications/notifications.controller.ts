import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { CreateTemplateDto, UpdateTemplateDto } from './dto/template.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('Notifications')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('notifications/templates')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  @Roles(UserRole.STAFF)
  @ApiOperation({ summary: '[Staff] Create a notification template' })
  create(@Body() dto: CreateTemplateDto) {
    return this.notificationsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all notification templates' })
  findAll() {
    return this.notificationsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single template' })
  findOne(@Param('id') id: string) {
    return this.notificationsService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.STAFF)
  @ApiOperation({ summary: '[Staff] Update a template' })
  update(@Param('id') id: string, @Body() dto: UpdateTemplateDto) {
    return this.notificationsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.STAFF)
  @ApiOperation({ summary: '[Staff] Delete a template' })
  remove(@Param('id') id: string) {
    return this.notificationsService.remove(id);
  }
}
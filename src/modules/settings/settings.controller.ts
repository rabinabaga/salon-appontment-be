import { Body, Controller, Delete, Get, Param, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from 'src/common/guards/jwt.auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { UserRole } from '@prisma/client';
import { Roles } from 'src/common/decorators/roles.decorator';


@ApiTags('Settings')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get current settings (includes active template)' })
  get() {
    return this.settingsService.get();
  }

  @Put('active-template/:templateId')
  @Roles(UserRole.STAFF)
  @ApiOperation({ summary: '[Staff] Set the active notification template' })
  setActiveTemplate(@Param('templateId') templateId: string) {
    return this.settingsService.setActiveTemplate(templateId);
  }

    @Delete('active-template')
  @Roles(UserRole.STAFF)
  @ApiOperation({ summary: '[Staff] Clear the active template (use fallback)' })
  clearActiveTemplate() {
    return this.settingsService.clearActiveTemplate();
  }
  
}
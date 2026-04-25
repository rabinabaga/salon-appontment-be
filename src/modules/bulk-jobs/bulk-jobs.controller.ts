import {
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import {  type User,UserRole } from '@prisma/client';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt.auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { BulkJobsService } from './bulk-jobs.service';
import { CurrentUser } from 'src/common/decorators/current.user.decorator';


@ApiTags('Bulk Jobs')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STAFF)
@Controller('bulk-jobs')
export class BulkJobsController {
  constructor(private readonly bulkJobsService: BulkJobsService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: '[Staff] Upload Excel file to send bulk appointment confirmations',
    description: 'Excel columns: customerName, customerEmail, service, date (YYYY-MM-DD), startTime (HH:MM)',
  })
  upload(@UploadedFile() file: Express.Multer.File, @CurrentUser() user: User) {
    return this.bulkJobsService.uploadAndEnqueue(file, user);
  }

  @Get()
  @ApiOperation({ summary: '[Staff] List all bulk jobs' })
  findAll(@CurrentUser() user: User) {
    return this.bulkJobsService.findAll(user);
  }

  @Get(':id')
  @ApiOperation({ summary: '[Staff] Get bulk job details with logs' })
  findOne(@Param('id') id: string) {
    return this.bulkJobsService.findOne(id);
  }

  @Get(':id/logs')
  @ApiOperation({ summary: '[Staff] Get notification logs for a bulk job' })
  getLogs(@Param('id') id: string) {
    return this.bulkJobsService.getLogs(id);
  }
}
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

import { MailService } from '../mail/mail.service';
import { SettingsService } from '../settings/settings.service';

import { ExcelRow } from './bulk-jobs.service';
import { BulkJobStatus, NotificationLogStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { TemplateRenderer } from 'src/common/utils/template.renderer.util';
import { BulkNotificationGateway } from './bulk -notification.gateway';

interface BulkJobPayload {
  jobId: string;
  rows: ExcelRow[];
}

@Processor('bulk-notifications', { concurrency: 5 })
export class BulkNotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(BulkNotificationProcessor.name);

  constructor(
    private readonly gateway: BulkNotificationGateway,

    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly settingsService: SettingsService,
  ) {
    super();
  }

  async process(job: Job<BulkJobPayload>): Promise<void> {
    const { jobId, rows } = job.data;

    // ✅ Mark job as processing
    await this.prisma.bulkJob.update({
      where: { id: jobId },
      data: { status: BulkJobStatus.PROCESSING },
    });
      this.gateway.emitJobStarted(jobId, rows.length);


    const settings = await this.settingsService.get();
    const template = settings?.activeTemplate;

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      const result = await this.processRow(row, template);

      // ✅ Create log
      await this.prisma.notificationLog.create({
        data: {
          bulkJobId:jobId, // ⚠️ must match Prisma schema
          customerEmail: row.customerEmail,
          customerName: row.customerName,
          service: row.service,
          date: row.date,
          startTime: row.startTime,
          status: result.success
            ? NotificationLogStatus.SUCCESS
            : NotificationLogStatus.FAILED,
          errorMessage: result.error ?? null,
          processedAt: new Date(),
        },
      });

      if (result.success) successCount++;
      else failCount++;

      const processedCount = i + 1;

      // ✅ Update counters
      await this.prisma.bulkJob.update({
        where: { id: jobId },
        data: {
          processedCount,
          successCount,
          failCount,
        },
      });
  // Emit real-time progress via WebSocket
      this.gateway.emitRowProcessed(jobId, {
        rowIndex: i,
        total: rows.length,
        processedCount,
        successCount,
        failCount,
        customerEmail: row.customerEmail,
        status: result.success ? 'SUCCESS' : 'FAILED',
        error: result.error,
      });
     
    }

    // ✅ Mark completed
    await this.prisma.bulkJob.update({
      where: { id: jobId },
      data: { status: BulkJobStatus.COMPLETED },
    });
    this.gateway.emitJobCompleted(jobId, { successCount, failCount, total: rows.length });

  

    this.logger.log(
      `Bulk job ${jobId} completed: ${successCount} success, ${failCount} failed`,
    );
  }

  private async processRow(
    row: ExcelRow,
    template: any, // or Prisma NotificationTemplate type
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const variables = {
        customerName: row.customerName,
        serviceName: row.service,
        date: row.date,
        startTime: row.startTime,
        endTime: '',
      };

      let subject = 'Your appointment is confirmed!';
      let html: string;

      if (template) {
        subject = TemplateRenderer.render(template.subject, variables);
        html = TemplateRenderer.render(template.body, variables);
      } else {
        html = `
          <h2>Appointment Confirmed</h2>
          <p>Hi ${row.customerName},</p>
          <p>Your <strong>${row.service}</strong> appointment on <strong>${row.date}</strong>
             at <strong>${row.startTime}</strong> is confirmed.</p>
        `;
      }

      await this.mailService.sendAppointmentConfirmation({
        to: row.customerEmail,
        subject,
        html,
      });

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}
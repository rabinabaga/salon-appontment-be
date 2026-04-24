import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { MailService } from '../mail/mail.service';
import { TemplateRenderer } from 'src/common/utils/template.renderer.util';


export interface AppointmentNotificationJobData {
  appointmentId: string;
  customerEmail: string;
  customerName: string;
  serviceName: string;
  date: string;
  startTime: string;
  endTime: string;
}

@Processor('appointment-notifications')
export class AppointmentNotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(AppointmentNotificationProcessor.name);

  constructor(
    private readonly mailService: MailService,
  ) {
    super();
  }

  async process(job: Job<AppointmentNotificationJobData>): Promise<void> {
    const { customerEmail, customerName, serviceName, date, startTime, endTime } = job.data;

    this.logger.log(`Processing appointment notification for ${customerEmail}`);

    try {
 

      let subject = 'Your appointment is confirmed!';
      let html: string;

      const variables = { customerName, serviceName, date, startTime, endTime };

        html = `
          <h2>Appointment Confirmed</h2>
          <p>Hi ${customerName},</p>
          <p>Your <strong>${serviceName}</strong> appointment has been confirmed.</p>
          <ul>
            <li><strong>Date:</strong> ${date}</li>
            <li><strong>Time:</strong> ${startTime} – ${endTime}</li>
          </ul>
          <p>We look forward to seeing you!</p>
        `;
      

      await this.mailService.sendAppointmentConfirmation({
        to: customerEmail,
        subject,
        html,
      });

      this.logger.log(`Notification sent to ${customerEmail}`);
    } catch (error) {
      this.logger.error(`Failed to send notification to ${customerEmail}: ${(error as Error).message}`);
      throw error; // Re-throw so BullMQ marks the job as failed
    }
  }
}
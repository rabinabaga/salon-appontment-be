import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter;

  constructor(private readonly config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.config.get('MAIL_HOST'),
      port: this.config.get<number>('MAIL_PORT', 587),
      secure: false,
      auth: {
        user: this.config.get('MAIL_USER'),
        pass: this.config.get('MAIL_PASS'),
      },
    });
  }

  async sendVerificationEmail(to: string, name: string, token: string): Promise<void> {
    const frontendUrl = this.config.get('FRONTEND_URL', 'http://localhost:3001');
    const verifyUrl = `${frontendUrl}/verify-email?token=${token}`;

    await this.send({
      to,
      subject: 'Verify your Salon account',
      html: `
        <h2>Hello ${name},</h2>
        <p>Thank you for registering. Please verify your email address by clicking the link below:</p>
        <a href="${verifyUrl}" style="
          display:inline-block;padding:12px 24px;background:#000;color:#fff;
          text-decoration:none;border-radius:4px;font-weight:bold;">
          Verify Email
        </a>
        <p>This link expires in 24 hours.</p>
        <p>If you did not register, please ignore this email.</p>
      `,
    });
  }

  async sendAppointmentConfirmation(params: {
    to: string;
    subject: string;
    html: string;
  }): Promise<void> {
    await this.send({ to: params.to, subject: params.subject, html: params.html });
  }

  private async send(options: { to: string; subject: string; html: string }): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.config.get('MAIL_FROM', 'noreply@salon.com'),
        to: options.to,
        subject: options.subject,
        html: options.html,
      });
    } catch (error) {
      this.logger.error(`Failed to send email to ${options.to}: ${error.message}`);
      throw error;
    }
  }
}
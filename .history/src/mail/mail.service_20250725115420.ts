import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {}

  // Send email using Maizzle-generated Handlebars template
  async sendEmail(options: {
    to: string | string[];
    subject: string;
    template: string; // template name (without .hbs extension)
    context?: Record<string, any>;
  }) {
    try {
      const result = await this.mailerService.sendMail({
        to: options.to,
        subject: options.subject,
        template: options.template,
        context: options.context,
      });

      this.logger.log(`Email sent successfully to ${options.to}`);
      return result;
    } catch (error) {
      this.logger.error('Failed to send email:', error);
      throw error;
    }
  }

  // Convenience methods
  async sendWelcomeEmail(email: string, name: string) {
    return this.sendEmail({
      to: email,
      subject: 'Welcome to Our Platform!',
      template: 'welcome',
      context: {
        name,
        appName: this.configService.get('MAIL_FROM_NAME'),
        loginUrl: `${this.configService.get('APP_URL', 'http://localhost:3000')}/login`,
        year: new Date().getFullYear(),
      },
    });
  }

  async sendPasswordReset(
    email: string,
    resetToken: string,
    userName?: string,
  ) {
    return this.sendEmail({
      to: email,
      subject: 'Password Reset Request',
      template: 'password-reset',
      context: {
        userName: userName || 'User',
        resetUrl: `${this.configService.get('APP_URL')}/reset-password?token=${resetToken}`,
        appName: this.configService.get('MAIL_FROM_NAME'),
        year: new Date().getFullYear(),
      },
    });
  }

  async sendNotification(email: string, title: string, message: string) {
    return this.sendEmail({
      to: email,
      subject: title,
      template: 'notification', // Uses production/hbs/notification.hbs
      context: {
        title,
        message,
        appName: this.configService.get('MAIL_FROM_NAME'),
        year: new Date().getFullYear(),
      },
    });
  }
}

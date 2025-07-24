import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  template?: string;
  context?: any;
  html?: string;
  text?: string;
  attachments?: any[];
}

@Injectable()
export class MailService {
  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {}

  async sendMail(options: EmailOptions) {
    try {
      const result = await this.mailerService.sendMail({
        to: options.to,
        subject: options.subject,
        template: options.template,
        context: options.context,
        html: options.html,
        text: options.text,
        attachments: options.attachments,
      });
      return result;
    } catch (error) {
      console.error('Failed to send email:', error);
      throw error;
    }
  }

  // Specific email methods
  async sendWelcomeEmail(email: string, name: string) {
    return this.sendMail({
      to: email,
      subject: 'Welcome to Our Platform!',
      template: 'welcome',
      context: {
        name,
        appName: this.configService.get('MAIL_FROM_NAME'),
        loginUrl: `${this.configService.get('APP_URL', 'http://localhost:3000')}/login`,
      },
    });
  }

  async sendPasswordResetEmail(email: string, resetToken: string) {
    return this.sendMail({
      to: email,
      subject: 'Password Reset Request',
      template: 'password-reset',
      context: {
        resetUrl: `${this.configService.get('APP_URL', 'http://localhost:3000')}/reset-password?token=${resetToken}`,
        appName: this.configService.get('MAIL_FROM_NAME'),
      },
    });
  }

  async sendTransactionalEmail(
    email: string,
    subject: string,
    templateName: string,
    context: any,
  ) {
    return this.sendMail({
      to: email,
      subject,
      template: templateName,
      context,
    });
  }

  // For using Maizzle compiled templates
  async sendMaizzleTemplate(
    email: string,
    subject: string,
    htmlContent: string,
    context?: any,
  ) {
    return this.sendMail({
      to: email,
      subject,
      html: htmlContent,
      context,
    });
  }
}
